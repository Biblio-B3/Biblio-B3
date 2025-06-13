import { app } from "../..";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { jwtVerify } from "jose";
import key from "../../app/middlewares/key";
import { argon2id } from "hash-wasm";

interface JWTPayload {
    user_id: number;
    role: string;
}

app.post(
    "/reset-password/confirm",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                throw new AppError("Token et nouveau mot de passe requis", 400);
            }

            const secret_key = Buffer.from(key, "hex");
            const { payload } = await jwtVerify(token, secret_key);
            const jwtPayload = payload as unknown as JWTPayload;

            if (!jwtPayload.user_id || jwtPayload.role !== "reset") {
                throw new AppError("Token invalide", 401);
            }

            const salt = new Uint8Array(16);
            crypto.getRandomValues(salt);
            const hashedPassword = await argon2id({
                password: newPassword,
                salt,
                parallelism: 1,
                iterations: 2,
                memorySize: 19456,
                hashLength: 32,
                outputType: "encoded",
            });

            const userExists = await db
                .select()
                .from(users)
                .where(eq(users.id, jwtPayload.user_id))
                .limit(1);

            if (userExists.length === 0) {
                throw new AppError("Utilisateur non trouvé", 404);
            }

            await db
                .update(users)
                .set({ password: hashedPassword })
                .where(eq(users.id, jwtPayload.user_id));

            res.status(200).json({
                message: "Mot de passe réinitialisé avec succès",
            });
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new AppError(
                    "Erreur lors de la réinitialisation du mot de passe",
                    500,
                    error,
                ),
            );
        }
    },
);
