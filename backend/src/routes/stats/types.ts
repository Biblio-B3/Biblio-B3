import { z } from "zod";

export const BookStatsSchema = z.object({
    book_id: z.number(),
    title: z.string(),
    author: z.string(),
    total_reservations: z.coerce.number(),
    active_reservations: z.coerce.number(),
    total_reads: z.coerce.number(),
    average_rating: z.coerce.number().nullable(),
    total_copies: z.coerce.number(),
    available_copies: z.coerce.number(),
});

export const UserStatsSchema = z.object({
    user_id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    total_reservations: z.coerce.number(),
    total_reads: z.coerce.number(),
    active_reservations: z.coerce.number(),
    overdue_reservations: z.coerce.number(),
});

export const TemporalStatsSchema = z.object({
    period: z.string(),
    reservations_count: z.coerce.number(),
    reads_count: z.coerce.number(),
    new_users_count: z.coerce.number(),
    overdue_count: z.coerce.number(),
});