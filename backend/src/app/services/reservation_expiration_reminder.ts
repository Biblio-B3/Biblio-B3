import { and, lt, eq } from "drizzle-orm";
import { reservation } from "../../db/schema/reservation";
import { copy } from "../../db/schema/copy";
import { books } from "../../db/schema/book";
import { users } from "../../db/schema/users";
import { db } from "../config/database";
import { logMessage } from "../utils/logger";
import { sendExpiringReservationReminder } from "./email";

export async function reservation_expiration_reminder() {
    try {
        const oneDayBeforeExpiration = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
        );

        const expiringReservations = await db
            .select({
                reservationId: reservation.id,
                userId: reservation.user_id,
                userEmail: users.email,
                finalDate: reservation.final_date,
                bookTitle: books.title,
            })
            .from(reservation)
            .innerJoin(copy, eq(copy.id, reservation.copy_id))
            .innerJoin(users, eq(users.id, reservation.user_id))
            .innerJoin(books, eq(books.id, copy.book_id))
            .where(
                and(
                    lt(reservation.final_date, oneDayBeforeExpiration),
                    eq(copy.is_claimed, true),
                ),
            );

        if (expiringReservations.length > 0) {
            logMessage(
                "Found reservations expiring soon. Sending reminders...",
            );

            for (const reservation of expiringReservations) {
                await sendExpiringReservationReminder(
                    reservation.userId,
                    reservation.bookTitle,
                    reservation.finalDate,
                );
            }

            logMessage("Reminders sent successfully.");
        } else {
            logMessage("No reservations expiring soon found.");
        }
    } catch (error) {
        console.error(error);
    }
}
