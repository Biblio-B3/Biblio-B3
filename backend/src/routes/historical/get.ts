import { app } from "../..";
import { db } from "../../app/config/database";
import { eq } from "drizzle-orm";
import {
    historical,
    selectHistoricalSchema,
} from "../../db/schema/historical";
import { copy, selectCopySchema } from "../../db/schema/copy";
import { users } from "../../db/schema/users";
import { books } from "../../db/schema/book";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { grantedAccessMiddleware } from "../../app/middlewares/verify_access_right";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";

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
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId) || userId <= 0) {
                throw new AppError("Invalid user ID provided.", 400);
            }

            const userHistorical = await db
                .select({
                    id: historical.id,
                    date_read: historical.date_read,
                    book_title: books.title,
                    book_id: historical.book_id,
                    copy_id: historical.copy_id,
                    user_id: historical.user_id,
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                })
                .from(historical)
                .innerJoin(books, eq(historical.book_id, books.id))
                .innerJoin(users, eq(historical.user_id, users.id))
                .where(eq(historical.user_id, userId))
                .orderBy(historical.date_read);

            const validatedHistorical = userHistorical.map((h) => {
                const { book_title, user_first_name, user_last_name, ...rest } =
                    h;

                const result = selectHistoricalSchema.safeParse(rest);
                if (!result.success) {
                    console.error("Validation failed for:", rest);
                    console.error(result.error.format());
                    throw new AppError(
                        "Invalid data in historical record.",
                        500,
                    );
                }

                return {
                    ...result.data,
                    book_title,
                    user_first_name,
                    user_last_name,
                };
            });

            if (validatedHistorical.length === 0) {
                throw new AppError(
                    `No historical records found for user with ID ${userId}.`,
                    404,
                );
            }

            res.status(200).json(validatedHistorical);
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            next(
                new Error(
                    "An error occurred while retrieving historical records.",
                ),
            );
        }
    },
);

app.get(
    "/copy/:id/historical",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const copyId = parseInt(req.params.id, 10);
            if (isNaN(copyId) || copyId <= 0) {
                throw new AppError("ID de copie invalide.", 400);
            }

            // 1) Vérifier que la copie existe
            const copyRecord = await db
                .select()
                .from(copy)
                .where(eq(copy.id, copyId))
                .limit(1)
                .then(rows => rows[0] ?? null);
            if (!copyRecord) {
                throw new AppError(`Aucune copie trouvée avec l'ID ${copyId}.`, 404);
            }
            // On peut valider la structure si on veut :
            const parseCopy = selectCopySchema.safeParse(copyRecord);
            if (!parseCopy.success) {
                console.error("Validation échouée pour la copie:", copyRecord, parseCopy.error.format());
                throw new AppError("Données de copie invalides en base.", 500);
            }

            // 2) Récupérer les historiques liés à cette copy_id
            const historyEntries = await db
                .select({
                    // On sélectionne d’abord les champs de la table historical pour validation
                    id: historical.id,
                    date_read: historical.date_read,
                    book_id: historical.book_id,
                    copy_id: historical.copy_id,
                    user_id: historical.user_id,
                    // Champs en plus pour enrichir la réponse
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                    book_title: books.title,
                })
                .from(historical)
                .innerJoin(users, eq(historical.user_id, users.id))
                .innerJoin(books, eq(historical.book_id, books.id))
                .where(eq(historical.copy_id, copyId))
                .orderBy(historical.date_read);

            if (historyEntries.length === 0) {
                throw new AppError(
                    `Aucun historique trouvé pour la copie d'ID ${copyId}.`,
                    404,
                );
            }

            // 3) Validation Zod et formatage de la réponse
            const validated = historyEntries.map((h) => {
                // Extraire les champs supplémentaires avant validation Zod
                const { user_first_name, user_last_name, book_title, ...rest } = h;
                const result = selectHistoricalSchema.safeParse(rest);
                if (!result.success) {
                    console.error("Validation échouée pour historique:", rest);
                    console.error(result.error.format());
                    throw new AppError("Donnée d'historique invalide.", 500);
                }
                return {
                    ...result.data,
                    user_first_name,
                    user_last_name,
                    book_title,
                };
            });

            res.status(200).json(validated);
        } catch (error) {
            if (error instanceof AppError) {
                return next(error);
            }
            console.error(error);
            next(new Error("Une erreur est survenue lors de la récupération de l'historique."));
        }
    },
);