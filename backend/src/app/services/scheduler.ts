import cron from "node-cron";
import "./expired_reservation";
import "./reservation_expiration_reminder";
import { expired_reservation } from "./expired_reservation";
import { reservation_expiration_reminder } from "./reservation_expiration_reminder";
import { logMessage } from "../utils/logger";

export function startScheduler() {
    cron.schedule("0 6-23 * * *", async () => {
        logMessage("Executing the 'expired_reservation' task.");
        await expired_reservation();
    });

    cron.schedule("0 6-23/3 * * *", async () => {
        logMessage("Executing the 'reservation_expiration_reminder' task.");
        await reservation_expiration_reminder();
    });

    logMessage("The scheduler is started!");
}
