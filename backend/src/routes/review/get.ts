import { app } from "../..";
import { db } from "../../app/config/database";
import { eq, desc, sql } from "drizzle-orm";
import {
    review,
    selectReviewSchema,
    selectReviewWithUserSchema,
} from "../../db/schema/review";
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

            if (allReviews.length === 0) {
                res.status(404).json({
                    message: "No reviews found.",
                });
                return;
            }

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

            const itemsPerPage = req.query.itemsPerPage
                ? parseInt(req.query.itemsPerPage as string, 10)
                : 10;
            const page = req.query.page
                ? parseInt(req.query.page as string, 10)
                : 1;
            const offset = (page - 1) * itemsPerPage;

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

            if (paginatedReviews.length === 0 && page === 1) {
                res.status(404).json({
                    message: "No reviews found for this book.",
                });
                return;
            }

            const validatedReviews = paginatedReviews.map((r) =>
                selectReviewWithUserSchema.parse(r),
            );

            const [totalCountResult] = await db
                .select({ count: sql`COUNT(*)`.mapWith(Number) })
                .from(review)
                .where(eq(review.book_id, bookId));

            const totalCount = totalCountResult.count;
            const totalPages = Math.ceil(totalCount / itemsPerPage);

            if (page > totalPages && totalPages > 0) {
                res.status(404).json({
                    message: `Page ${page} does not exist (only ${totalPages} pages).`,
                });
                return;
            }

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
                    error,
                ),
            );
        }
    },
);

app.get(
    "/users/:id/reviews",
    checkTokenMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId) || userId <= 0) {
                throw new AppError("Invalid user ID provided.", 400);
            }

            const userReviews = await db
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
                .innerJoin(books, eq(books.id, review.book_id))
                .where(eq(review.user_id, userId));

            if (userReviews.length === 0) {
                res.status(404).json({
                    message: "No reviews found for this user.",
                });
                return;
            }
            
            res.status(200).json(userReviews);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError(
                    "Internal error during user reviews retrieval",
                    500,
                    error,
                ),
            );
        }
    },
);
