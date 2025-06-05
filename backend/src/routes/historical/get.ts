import { app } from "../..";
import { db } from "../../app/config/database";
import { eq } from "drizzle-orm";
import { historical, selectHistoricalSchema } from "../../db/schema/historical";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { grantedAccessMiddleware } from "../../app/middlewares/verify_access_right";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { users } from "../../db/schema/users";
import { books } from "../../db/schema/book";

app.get(
    "/historical",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const allHistorical = await db.select().from(historical);
            if (!allHistorical)
                throw new AppError("No historical records found.", 404);
            const validatedHistorical = allHistorical.map((h) =>
                selectHistoricalSchema.parse(h),
            );
            res.status(200).json(validatedHistorical);
        } catch (error) {
            if (error instanceof Error) return next(error);
            next(
                new Error(
                    "An error occurred while retrieving historical records.",
                ),
            );
        }
    },
);

app.get(
    "/users/:id/historical",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin_or_owner", historical),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("➡️  GET /users/:id/historical triggered");

            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId) || userId <= 0) {
                throw new AppError("Invalid user ID provided.", 400);
            }

            // 1) On récupère TOUTES les colonnes nécessaires dans la requête SQL :
            const userHistorical = await db
                .select({
                    id: historical.id,
                    date_read: historical.date_read,
                    book_title: books.title,
                    book_id: historical.book_id,
                    copy_id: historical.copy_id,
                    user_id: historical.user_id,       // ← toujours utile pour Zod
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                })
                .from(historical)
                .innerJoin(books, eq(historical.book_id, books.id))
                .innerJoin(users, eq(historical.user_id, users.id))
                .where(eq(historical.user_id, userId))
                .orderBy(historical.date_read);

            console.log("🔎 Raw userHistorical:", userHistorical);

            // 2) On valide uniquement les champs de la table `historical` (id, date_read, book_id, copy_id, user_id)
            //    puis on fusionne manuellement les autres champs dans l’objet final.
            const validatedHistorical = userHistorical.map((h) => {
                // On extrait les champs joinés avant de passer à Zod
                const { book_title, user_first_name, user_last_name, ...rest } = h;

                const result = selectHistoricalSchema.safeParse(rest);
                if (!result.success) {
                    console.error("❌ Validation failed for:", rest);
                    console.error(result.error.format());
                    throw new AppError("Invalid data in historical record.", 500);
                }

                // On renvoie à la fois les données validées et les champs « externes »
                return {
                    ...result.data,           // { id, date_read, book_id, copy_id, user_id }
                    book_title,               // Titre du livre
                    user_first_name,          // (facultatif)
                    user_last_name,           // (facultatif)
                };
            });

            if (validatedHistorical.length === 0) {
                throw new AppError(
                    `No historical records found for user with ID ${userId}.`,
                    404,
                );
            }

            // 3) On renvoie l’array complet (avec book_title présent)
            res.status(200).json(validatedHistorical);
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            console.error(
                "🔥 Unexpected error in GET /users/:id/historical:",
                error,
            );
            next(
                new Error("An error occurred while retrieving historical records."),
            );
        }
    },
);
