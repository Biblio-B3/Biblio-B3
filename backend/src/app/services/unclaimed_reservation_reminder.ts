import { and, lt, eq } from "drizzle-orm";
import { reservation } from "../../db/schema/reservation";
import { copy } from "../../db/schema/copy";
import { users } from "../../db/schema/users";
import { db } from "../config/database";
import { logMessage } from "../utils/logger";
import { sendUnclaimedReservationReminder } from "./email";

export async function unclaimed_reservation_reminder() {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const unclaimedReservations = await db
            .select({
                reservationId: reservation.id,
                userEmail: users.email,
            })
            .from(reservation)
            .innerJoin(copy, eq(copy.id, reservation.copy_id))
            .innerJoin(users, eq(users.id, reservation.user_id))
            .where(
                and(
                    lt(reservation.reservation_date, twentyFourHoursAgo),
                    eq(copy.is_claimed, false),
                ),
            );

        if (unclaimedReservations.length > 0) {
            logMessage("Found unclaimed reservations. Sending reminders...");

            for (const reservation of unclaimedReservations) {
                await sendUnclaimedReservationReminder(reservation.userEmail, reservation.reservationId);
            }

            logMessage("Reminders sent successfully.");
        } else {
            logMessage("No unclaimed reservations found.");
        }
    } catch (error) {
        console.error(error);
    }
}