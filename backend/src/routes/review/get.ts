import { app } from "../..";
import { db } from "../../app/config/database";
import { eq, desc, sql } from "drizzle-orm";
import { review, selectReviewSchema } from "../../db/schema/review";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { users } from "../../db/schema/users";
import { books } from "../../db/schema/book";

app.get(
    "/reviews",
    checkTokenMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const allReviews = await db
                .select({
                    id: review.id,
                    description: review.description,
                    note: review.note,
                    condition: review.condition,
                    copy_id: review.copy_id,
                    book_id: review.book_id,
                    user_id: review.user_id,
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                    book_title: books.title,
                    created_at: review.created_at,
                })
                .from(review)
                .innerJoin(users, eq(users.id, review.user_id))
                .innerJoin(books, eq(books.id, review.book_id));

            if (allReviews.length === 0)
                throw new AppError("No reviews found.", 404);

            res.status(200).json(allReviews);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError(
                    "Internal error during reviews retrieval",
                    500,
                    error,
                ),
            );
        }
    },
);

app.get(
    "/books/:id/reviews",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bookId = parseInt(req.params.id, 10);
            if (isNaN(bookId) || bookId <= 0) {
                throw new AppError("Invalid book ID provided.", 400);
            }

            // Récupérer itemsPerPage et page depuis la query, avec des valeurs par défaut
            const itemsPerPage = req.query.itemsPerPage
                ? parseInt(req.query.itemsPerPage as string, 10)
                : 10; // Par exemple 10 par défaut
            const page = req.query.page
                ? parseInt(req.query.page as string, 10)
                : 1;
            const offset = (page - 1) * itemsPerPage;

            // Requête paginée pour toutes les reviews de ce livre
            const paginatedReviews = await db
                .select({
                    id: review.id,
                    description: review.description,
                    note: review.note,
                    condition: review.condition,
                    copy_id: review.copy_id,
                    user_id: review.user_id,
                    book_id: review.book_id,
                    book_title: books.title,
                    user_first_name: users.first_name,
                    user_last_name: users.last_name,
                    created_at: review.created_at,
                })
                .from(review)
                .innerJoin(users, eq(users.id, review.user_id))
                .innerJoin(books, eq(books.id, review.book_id))
                .where(eq(review.book_id, bookId))
                .orderBy(desc(review.created_at))
                .limit(itemsPerPage)
                .offset(offset);

            // Si pas de review du tout (donc page=1 et résultat vide), on renvoie 404
            if (paginatedReviews.length === 0 && page === 1) {
                res.status(404).json({
                    message: "No reviews found for this book.",
                });
            }

            // Valider chaque review dans le schema zod (ou ce que vous utilisez)
            const validatedReviews = paginatedReviews.map((r) =>
                selectReviewSchema.parse(r)
            );

            // Calculer le nombre total de reviews pour la pagination
            const [totalCountResult] = await db
                .select({ count: sql`COUNT(*)`.mapWith(Number) })
                .from(review)
                .where(eq(review.book_id, bookId));

            const totalCount = totalCountResult.count;
            const totalPages = Math.ceil(totalCount / itemsPerPage);

            // Si on demande une page qui n'existe pas (par exemple page > totalPages)
            if (page > totalPages && totalPages > 0) {
                res.status(404).json({
                    message: `Page ${page} does not exist (only ${totalPages} pages).`,
                });
            }

            // Construire la réponse paginée
            res.status(200).json({
                data: validatedReviews,
                pagination: {
                    total: totalCount,
                    page: page,
                    itemsPerPage: itemsPerPage,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            });
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new AppError(
                    "Internal error during review retrieval",
                    500,
                    error
                )
            );
        }
    }
);
