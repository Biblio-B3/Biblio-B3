import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";
import { users } from "./users";
import { books } from "./book";
import { copy } from "./copy";

export const historical = pgTable("historical", {
    id: serial().primaryKey().notNull(),
    date_read: timestamp("date_read").defaultNow().notNull(),
    book_id: integer("book_id")
        .notNull()
        .references(() => books.id, { onDelete: "cascade" }),
    copy_id: integer("copy_id")
        .references(() => copy.id, { onDelete: "set null" }),
    user_id: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
});

export const insertHistoricalSchema = createInsertSchema(historical, {
    date_read: z.coerce.date(),
    book_id: (schema) => schema.book_id,
    copy_id: (schema) => schema.copy_id,
    user_id: (schema) => schema.user_id,
});

export const selectHistoricalSchema = createSelectSchema(historical, {
    date_read: z.coerce.date(),
    book_id: (schema) => schema.book_id,
    copy_id: (schema) => schema.copy_id,
    user_id: (schema) => schema.user_id,
}).extend({
    book_title: z.string().optional(),
    user_first_name: z.string().optional(),
    user_last_name: z.string().optional(),
});

export const updateHistoricalSchema = createInsertSchema(historical, {
    date_read: z.coerce.date(),
    book_id: (schema) => schema.book_id.optional(),
    copy_id: (schema) => schema.copy_id.optional(),
    user_id: (schema) => schema.user_id.optional(),
});
