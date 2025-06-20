import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { logMessage, errorMessage } from "../utils/logger";
import dotenv from "dotenv";
import "dotenv/config";
import { NODE_ENV } from "../..";
import { Pool } from "pg";

export let db: ReturnType<typeof drizzle>;
export let pool: Pool;

export async function startDatabase() {
    let DATABASE_URL;
    dotenv.config();
    try {
        DATABASE_URL = process.env.DATABASE_URL;
    } catch (err) {
        throw new Error("Unable to read the secret:" + err);
    }

    if (!DATABASE_URL) {
        errorMessage("DATABASE_URL is not defined in environment variables.");
        throw new Error(
            "DATABASE_URL is not defined in environment variables.",
        );
    }

    if (NODE_ENV === "production") {
        let connected = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!connected && attempts < maxAttempts) {
            try {
                pool = new Pool({ connectionString: DATABASE_URL });
                db = drizzle(pool);
                await db.execute("select 1");
                connected = true;
                logMessage("Connected to the database.");
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    errorMessage(
                        "Error connecting to database after 5 attempts:",
                        error,
                    );
                    throw error;
                }
                logMessage(
                    `Tentative de connexion échouée (${attempts}/${maxAttempts}). Nouvelle tentative dans 2 secondes...`,
                );
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    } else {
        pool = new Pool({ connectionString: DATABASE_URL });
        db = drizzle(pool);
        try {
            await db.execute("select 1");
            logMessage("Connected to the database.");
        } catch (error) {
            errorMessage("Error connecting to database:", error);
            throw error;
        }
    }
    if (NODE_ENV === "production") {
        try {
            await migrate(db, { migrationsFolder: "drizzle" });
            logMessage("Migration de la base de données réussie.");
        } catch (error: unknown) {
            if ((error as { code?: string }).code === "42710") {
                logMessage(
                    "Migration ignorée: les types existent déjà dans la base de données.",
                );
            } else {
                errorMessage(
                    "Erreur lors de la migration de la base de données:",
                    error,
                );
                throw error;
            }
        }
    }
}
