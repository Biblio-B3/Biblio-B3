import { app } from "../..";
import { db } from "../../app/config/database";
import { sql, eq, gt, and } from "drizzle-orm";
import { review } from "../../db/schema/review";
import { generateBarcodeImage } from "../../app/services/barcode";
import { copy, selectCopySchema } from "../../db/schema/copy";
import { reservation, selectReservationSchema } from "../../db/schema/reservation";
import { users, selectUserSchema } from "../../db/schema/users";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { grantedAccessMiddleware } from "../../app/middlewares/verify_access_right";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";

app.get("/copy", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allCopies = await db.select().from(copy);
        const validatedCopies = allCopies.map((c) => selectCopySchema.parse(c));
        res.status(200).json(validatedCopies);
    } catch (error) {
        return next(new AppError("Error while retrieving copies.", 500, error));
    }
});

app.get(
    "/books/:id/copy",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bookId = parseInt(req.params.id, 10);
            if (isNaN(bookId) || bookId <= 0)
                throw new AppError("Invalid copy id provided.", 400, {
                    id: bookId,
                });

            const copies = await db
                .select({
                    copy_id: copy.id,
                    state: copy.state,
                    is_reserved: copy.is_reserved,
                    is_claimed: copy.is_claimed,
                    book_id: copy.book_id,
                    final_date: reservation.final_date,
                    review_condition: sql`array_agg(${review.condition})`.as(
                        "review_condition",
                    ),
                })
                .from(copy)
                .leftJoin(review, eq(copy.id, review.copy_id))
                .leftJoin(reservation, eq(reservation.copy_id, copy.id))
                .where(eq(copy.book_id, bookId))
                .groupBy(
                    copy.id,
                    copy.state,
                    copy.is_reserved,
                    copy.is_claimed,
                    copy.book_id,
                    reservation.final_date,
                );

            if (!copies || copies.length === 0) {
                throw new AppError("No copies found for this book.", 404, {
                    id: bookId,
                });
            }

            res.status(200).json(copies);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError(
                    "Error while retrieving copies for book.",
                    500,
                    error,
                ),
            );
        }
    },
);

app.get(
    "/copy/:id/barcode",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const copyId = parseInt(req.params.id, 10);
            if (isNaN(copyId) || copyId <= 0)
                throw new AppError("Invalid copy id provided.", 400, {
                    id: copyId,
                });

            const barcodeBase64 = await generateBarcodeImage(copyId);

            res.setHeader("Content-Type", "image/png");
            res.status(200).send(
                Buffer.from(barcodeBase64.split(",")[1], "base64"),
            );
        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError(
                    "Error while generating barcode for copy.",
                    500,
                    error,
                ),
            );
        }
    },
);

app.get(
    "/copy/:id/reservation",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin", reservation),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const copyId = parseInt(req.params.id, 10);
            if (isNaN(copyId) || copyId <= 0) {
                throw new AppError("ID de copie invalide.", 400, { id: req.params.id });
            }

            const copyRecord = await db
                .select()
                .from(copy)
                .where(eq(copy.id, copyId))
                .limit(1)
                .then(rows => rows[0] ?? null);
            if (!copyRecord) {
                throw new AppError(`Aucune copie trouvée avec l'ID ${copyId}.`, 404);
            }

            const parsedCopy = selectCopySchema.safeParse(copyRecord);
            if (!parsedCopy.success) {
                console.error("Validation échouée pour copie:", copyRecord, parsedCopy.error.format());
                throw new AppError("Données de copie invalides en base.", 500);
            }

            const now = new Date();
            const reservationRecord = await db
                .select({
                    id: reservation.id,
                    reservation_date: reservation.reservation_date,
                    final_date: reservation.final_date,
                    user_id: reservation.user_id,
                    copy_id: reservation.copy_id,
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                })
                .from(reservation)
                .innerJoin(users, eq(reservation.user_id, users.id))
                .where(
                    and(
                        eq(reservation.copy_id, copyId),
                        gt(reservation.final_date, now)
                    )
                )
                .orderBy(sql`${reservation.reservation_date} DESC`)
                .limit(1)
                .then(rows => rows[0] ?? null);

            if (!reservationRecord) {
                throw new AppError(`Aucune réservation en cours pour la copie d'ID ${copyId}.`, 404);
            }

            const { user_first_name, user_last_name, ...rest } = reservationRecord;
            const parsed = selectReservationSchema.safeParse(rest);
            if (!parsed.success) {
                console.error("Validation échouée pour réservation:", rest, parsed.error.format());
                throw new AppError("Données de réservation invalides en base.", 500);
            }

            const result = {
                ...parsed.data,
                user_first_name,
                user_last_name,
            };

            res.status(200).json(result);
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            console.error("Erreur inattendue dans /copy/:id/reservation:", error);
            return next(new AppError("Erreur lors de la récupération de la réservation.", 500, error));
        }
    }
);
