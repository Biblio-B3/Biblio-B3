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
                new AppError("Internal error during reviews retrieval", 500, error)
            );
        }
    }
);

app.get(
    "/books/:id/reviews",
    checkTokenMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bookId = parseInt(req.params.id, 10);
            if (isNaN(bookId) || bookId <= 0)
                throw new AppError("Invalid book ID provided.", 400);

            const foundReview = await db
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
                })
                .from(review)
                .innerJoin(users, eq(users.id, review.user_id))
                .innerJoin(books, eq(books.id, review.book_id))
                .where(eq(review.book_id, bookId));

            if (foundReview.length === 0)
                throw new AppError("Review not found.", 404);

            res.status(200).json(foundReview);
          
            const itemsPerPage = req.query.itemsPerPage ? parseInt(req.query.itemsPerPage as string, 10) : 30;
            const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
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
                })
                .from(review)
                .innerJoin(users, eq(users.id, review.user_id))
                .innerJoin(books, eq(books.id, review.book_id))
                .where(eq(review.book_id, bookId));

            if (foundReview.length === 0)
                throw new AppError("Review not found.", 404);
                .where(eq(review.book_id, bookId))
                .orderBy(desc(review.created_at))
                .limit(itemsPerPage)
                .offset(offset);

            const validatedReviews = paginatedReviews.map((r) =>
                selectReviewSchema.parse(r),
            );

            const [totalCount] = await db
                .select({ count: sql`COUNT(*)`.mapWith(Number) })
                .from(review)
                .where(eq(review.book_id, bookId));

            const totalPages = Math.ceil(totalCount.count / itemsPerPage);

            res.status(200).json({
                data: validatedReviews,
                pagination: {
                    total: totalCount.count,
                    page: page,
                    itemsPerPage: itemsPerPage,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            });

        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError("Internal error during review retrieval", 500, error)
            );
        }
    }
);