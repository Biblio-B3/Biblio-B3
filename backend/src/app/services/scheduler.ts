import cron from "node-cron";
import "./expired_reservation";
import "./unclaimed_reservation_reminder";
import "./reservation_expiration_reminder";
import { unclaimed_reservation_reminder } from "./unclaimed_reservation_reminder";
import { expired_reservation } from "./expired_reservation";
import { reservation_expiration_reminder } from "./reservation_expiration_reminder";
import { logMessage } from "../utils/logger";

export function startScheduler() {
    cron.schedule("0 * * * *", async () => {
        logMessage("Executing the 'expired_reservation' task.");
        await expired_reservation();
    });

    cron.schedule("0 */12 * * *", async () => {
        logMessage("Executing the 'unclaimed_reservation_reminder' task.");
        await unclaimed_reservation_reminder();
    });

    cron.schedule("0 9 * * *", async () => {
        logMessage("Executing the 'reservation_expiration_reminder' task.");
        await reservation_expiration_reminder();
    });

    logMessage("The scheduler is started!");
}
