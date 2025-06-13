import { app } from "../..";
import { db } from "../../app/config/database";
import { eq, sql, and, gte, lte, count, desc } from "drizzle-orm";
import { books } from "../../db/schema/book";
import { users } from "../../db/schema/users";
import { reservation } from "../../db/schema/reservation";
import { historical } from "../../db/schema/historical";
import { copy } from "../../db/schema/copy";
import { review } from "../../db/schema/review";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { grantedAccessMiddleware } from "../../app/middlewares/verify_access_right";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { BookStatsSchema, UserStatsSchema, TemporalStatsSchema } from "./types";

app.get(
    "/stats/books-most-reserved",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = parseInt(req.query.limit as string) || 10;

            const bookStats = await db
                .select({
                    book_id: books.id,
                    title: books.title,
                    author: books.author,
                    total_reservations: sql<number>`COUNT(DISTINCT ${reservation.id})`,
                    active_reservations: sql<number>`COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= NOW() THEN ${reservation.id} END)`,
                    total_reads: sql<number>`COUNT(DISTINCT ${historical.id})`,
                    average_rating: sql<number>`AVG(${review.note})`,
                    total_copies: sql<number>`COUNT(DISTINCT ${copy.id})`,
                    available_copies: sql<number>`COUNT(DISTINCT ${copy.id}) - COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= NOW() THEN ${reservation.id} END)`,
                })
                .from(books)
                .leftJoin(copy, eq(books.id, copy.book_id))
                .leftJoin(reservation, eq(copy.id, reservation.copy_id))
                .leftJoin(historical, eq(books.id, historical.book_id))
                .leftJoin(review, eq(books.id, review.book_id))
                .where(eq(books.is_removed, false))
                .groupBy(books.id, books.title, books.author)
                .orderBy(desc(sql`COUNT(DISTINCT ${reservation.id})`))
                .limit(limit);

            const validatedBookStats = bookStats.map((stat) =>
                BookStatsSchema.parse(stat),
            );
            res.status(200).json(validatedBookStats);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving book statistics.",
                ),
            );
        }
    },
);

app.get(
    "/stats/users-most-active",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const now = new Date();

            const userStats = await db
                .select({
                    user_id: users.id,
                    first_name: users.first_name,
                    last_name: users.last_name,
                    total_reservations: sql<number>`COUNT(DISTINCT ${reservation.id})`,
                    total_reads: sql<number>`COUNT(DISTINCT ${historical.id})`,
                    active_reservations: sql<number>`COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.id} END)`,
                    overdue_reservations: sql<number>`COUNT(DISTINCT CASE WHEN ${reservation.final_date} < ${now} THEN ${reservation.id} END)`,
                })
                .from(users)
                .leftJoin(reservation, eq(users.id, reservation.user_id))
                .leftJoin(historical, eq(users.id, historical.user_id))
                .groupBy(users.id, users.first_name, users.last_name)
                .orderBy(desc(sql`COUNT(DISTINCT ${historical.id})`))
                .limit(limit);

            const validatedUserStats = userStats.map((stat) =>
                UserStatsSchema.parse(stat),
            );
            res.status(200).json(validatedUserStats);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving user statistics.",
                ),
            );
        }
    },
);

app.get(
    "/stats/temporal-evolution",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const period = (req.query.period as string) || "month"; // "day", "week", "month"
            const months = parseInt(req.query.months as string) || 12;

            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            // Récupérer les réservations par période
            const reservationStats = await db
                .select({
                    period: sql<string>`to_char(date_trunc('${sql.raw(period)}', ${reservation.reservation_date}), 'YYYY-MM')`,
                    reservations_count: sql<number>`COUNT(*)`,
                })
                .from(reservation)
                .where(gte(reservation.reservation_date, startDate))
                .groupBy(
                    sql`date_trunc('${sql.raw(period)}', ${reservation.reservation_date})`,
                )
                .orderBy(
                    sql`date_trunc('${sql.raw(period)}', ${reservation.reservation_date})`,
                );

            // Récupérer les lectures par période
            const readStats = await db
                .select({
                    period: sql<string>`to_char(date_trunc('${sql.raw(period)}', ${historical.date_read}), 'YYYY-MM')`,
                    reads_count: sql<number>`COUNT(*)`,
                })
                .from(historical)
                .where(gte(historical.date_read, startDate))
                .groupBy(
                    sql`date_trunc('${sql.raw(period)}', ${historical.date_read})`,
                )
                .orderBy(
                    sql`date_trunc('${sql.raw(period)}', ${historical.date_read})`,
                );

            // Récupérer les nouveaux utilisateurs par période
            const userStats = await db
                .select({
                    period: sql<string>`to_char(date_trunc('${sql.raw(period)}', ${users.created_at}), 'YYYY-MM')`,
                    new_users_count: sql<number>`COUNT(*)`,
                })
                .from(users)
                .where(gte(users.created_at, startDate))
                .groupBy(
                    sql`date_trunc('${sql.raw(period)}', ${users.created_at})`,
                )
                .orderBy(
                    sql`date_trunc('${sql.raw(period)}', ${users.created_at})`,
                );

            // Récupérer les retards par période
            const overdueStats = await db
                .select({
                    period: sql<string>`to_char(date_trunc('${sql.raw(period)}', ${reservation.final_date}), 'YYYY-MM')`,
                    overdue_count: sql<number>`COUNT(*)`,
                })
                .from(reservation)
                .where(
                    and(
                        lte(reservation.final_date, new Date()),
                        gte(reservation.final_date, startDate),
                    ),
                )
                .groupBy(
                    sql`date_trunc('${sql.raw(period)}', ${reservation.final_date})`,
                )
                .orderBy(
                    sql`date_trunc('${sql.raw(period)}', ${reservation.final_date})`,
                );

            // Créer un map pour combiner les résultats
            const statsMap = new Map<string, any>();

            // Initialiser toutes les périodes avec des valeurs par défaut
            const currentDate = new Date(startDate);
            const endDate = new Date();

            while (currentDate <= endDate) {
                const periodKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
                statsMap.set(periodKey, {
                    period: periodKey,
                    reservations_count: 0,
                    reads_count: 0,
                    new_users_count: 0,
                    overdue_count: 0,
                });

                if (period === "month") {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                } else if (period === "week") {
                    currentDate.setDate(currentDate.getDate() + 7);
                } else {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            // Remplir avec les données réelles
            reservationStats.forEach((stat) => {
                if (statsMap.has(stat.period)) {
                    statsMap.get(stat.period)!.reservations_count = Number(
                        stat.reservations_count,
                    );
                }
            });

            readStats.forEach((stat) => {
                if (statsMap.has(stat.period)) {
                    statsMap.get(stat.period)!.reads_count = Number(
                        stat.reads_count,
                    );
                }
            });

            userStats.forEach((stat) => {
                if (statsMap.has(stat.period)) {
                    statsMap.get(stat.period)!.new_users_count = Number(
                        stat.new_users_count,
                    );
                }
            });

            overdueStats.forEach((stat) => {
                if (statsMap.has(stat.period)) {
                    statsMap.get(stat.period)!.overdue_count = Number(
                        stat.overdue_count,
                    );
                }
            });

            // Convertir en array et trier
            const temporalStatsArray = Array.from(statsMap.values()).sort(
                (a, b) => a.period.localeCompare(b.period),
            );

            const validatedTemporalStats = temporalStatsArray.map((stat) =>
                TemporalStatsSchema.parse(stat),
            );
            res.status(200).json(validatedTemporalStats);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving temporal statistics.",
                ),
            );
        }
    },
);

app.get(
    "/stats/occupation-rate",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const now = new Date();

            // Statistiques d'occupation par livre
            const occupationByBook = await db
                .select({
                    book_id: books.id,
                    title: books.title,
                    author: books.author,
                    total_copies: sql<number>`COUNT(DISTINCT ${copy.id})`,
                    reserved_copies: sql<number>`COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)`,
                    available_copies: sql<number>`COUNT(DISTINCT ${copy.id}) - COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)`,
                    occupation_rate: sql<number>`CASE WHEN COUNT(DISTINCT ${copy.id}) > 0 THEN ROUND((COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)::numeric / COUNT(DISTINCT ${copy.id})::numeric) * 100, 2) ELSE 0 END`,
                })
                .from(books)
                .leftJoin(copy, eq(books.id, copy.book_id))
                .leftJoin(reservation, eq(copy.id, reservation.copy_id))
                .where(eq(books.is_removed, false))
                .groupBy(books.id, books.title, books.author)
                .orderBy(
                    desc(
                        sql`CASE WHEN COUNT(DISTINCT ${copy.id}) > 0 THEN ROUND((COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)::numeric / COUNT(DISTINCT ${copy.id})::numeric) * 100, 2) ELSE 0 END`,
                    ),
                );

            // Statistiques globales d'occupation
            const [globalOccupation] = await db
                .select({
                    total_copies: sql<number>`COUNT(DISTINCT ${copy.id})`,
                    total_reserved: sql<number>`COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)`,
                    total_available: sql<number>`COUNT(DISTINCT ${copy.id}) - COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)`,
                    global_occupation_rate: sql<number>`CASE WHEN COUNT(DISTINCT ${copy.id}) > 0 THEN ROUND((COUNT(DISTINCT CASE WHEN ${reservation.final_date} >= ${now} THEN ${reservation.copy_id} END)::numeric / COUNT(DISTINCT ${copy.id})::numeric) * 100, 2) ELSE 0 END`,
                })
                .from(copy)
                .leftJoin(reservation, eq(copy.id, reservation.copy_id))
                .leftJoin(books, eq(copy.book_id, books.id))
                .where(eq(books.is_removed, false));

            const result = {
                global_occupation: globalOccupation,
                occupation_by_book: occupationByBook,
            };

            res.status(200).json(result);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving occupation statistics.",
                ),
            );
        }
    },
);

app.get(
    "/stats/overdue-statistics",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const now = new Date();

            // Réservations en retard avec détails
            const overdueReservations = await db
                .select({
                    reservation_id: reservation.id,
                    user_id: users.id,
                    user_name: sql<string>`${users.first_name} || ' ' || ${users.last_name}`,
                    book_title: books.title,
                    book_author: books.author,
                    reservation_date: reservation.reservation_date,
                    final_date: reservation.final_date,
                    days_overdue: sql<number>`EXTRACT(DAY FROM (${now} - ${reservation.final_date}))`,
                })
                .from(reservation)
                .innerJoin(users, eq(reservation.user_id, users.id))
                .innerJoin(copy, eq(reservation.copy_id, copy.id))
                .innerJoin(books, eq(copy.book_id, books.id))
                .where(lte(reservation.final_date, now))
                .orderBy(
                    desc(
                        sql`EXTRACT(DAY FROM (${now} - ${reservation.final_date}))`,
                    ),
                );

            // Utilisateurs avec le plus de retards
            const usersWithMostOverdue = await db
                .select({
                    user_id: users.id,
                    user_name: sql<string>`${users.first_name} || ' ' || ${users.last_name}`,
                    total_overdue: sql<number>`COUNT(${reservation.id})`,
                    average_days_overdue: sql<number>`COALESCE(ROUND(AVG(EXTRACT(DAY FROM (${now} - ${reservation.final_date})))::numeric, 2), 0)`,
                    longest_overdue: sql<number>`COALESCE(MAX(EXTRACT(DAY FROM (${now} - ${reservation.final_date}))), 0)`,
                })
                .from(reservation)
                .innerJoin(users, eq(reservation.user_id, users.id))
                .where(lte(reservation.final_date, now))
                .groupBy(users.id, users.first_name, users.last_name)
                .orderBy(desc(sql`COUNT(${reservation.id})`))
                .limit(10);

            // Livres les plus en retard
            const booksWithMostOverdue = await db
                .select({
                    book_id: books.id,
                    book_title: books.title,
                    book_author: books.author,
                    total_overdue: sql<number>`COUNT(${reservation.id})`,
                    average_days_overdue: sql<number>`COALESCE(ROUND(AVG(EXTRACT(DAY FROM (${now} - ${reservation.final_date})))::numeric, 2), 0)`,
                })
                .from(reservation)
                .innerJoin(copy, eq(reservation.copy_id, copy.id))
                .innerJoin(books, eq(copy.book_id, books.id))
                .where(lte(reservation.final_date, now))
                .groupBy(books.id, books.title, books.author)
                .orderBy(desc(sql`COUNT(${reservation.id})`))
                .limit(10);

            // Statistiques globales de retard
            const [overdueGlobalStats] = await db
                .select({
                    total_overdue_reservations: sql<number>`COUNT(${reservation.id})`,
                    average_days_overdue: sql<number>`COALESCE(ROUND(AVG(EXTRACT(DAY FROM (${now} - ${reservation.final_date})))::numeric, 2), 0)`,
                    longest_overdue_days: sql<number>`COALESCE(MAX(EXTRACT(DAY FROM (${now} - ${reservation.final_date}))), 0)`,
                    overdue_rate: sql<number>`CASE WHEN (SELECT COUNT(*) FROM reservation) > 0 THEN ROUND((COUNT(${reservation.id})::numeric / (SELECT COUNT(*) FROM reservation)::numeric) * 100, 2) ELSE 0 END`,
                })
                .from(reservation)
                .where(lte(reservation.final_date, now));

            const result = {
                global_stats: overdueGlobalStats,
                overdue_reservations: overdueReservations,
                users_with_most_overdue: usersWithMostOverdue,
                books_with_most_overdue: booksWithMostOverdue,
            };

            res.status(200).json(result);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving overdue statistics.",
                ),
            );
        }
    },
);
