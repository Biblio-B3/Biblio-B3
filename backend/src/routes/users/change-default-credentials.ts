import { app } from "../..";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { argon2id, argon2Verify } from "hash-wasm";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";

app.post(
    "/change-default-credentials",
    checkTokenMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { newEmail, newPassword } = req.body;
            if (!newEmail || !newPassword) {
                throw new AppError("Email et mot de passe requis.", 400);
            }

            const userId = (req as any).user.userId;

            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, userId));

            if (!user) {
                throw new AppError("Utilisateur non trouvé.", 404);
            }

            if (user.email !== "admin@example.com") {
                throw new AppError("Action non autorisée.", 403);
            }

            const isValid = await argon2Verify({
                password: "adminpassword",
                hash: user.password,
            });

            if (!isValid) {
                throw new AppError("Action non autorisée.", 403);
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

            await db
                .update(users)
                .set({
                    email: newEmail,
                    password: hashedPassword,
                })
                .where(eq(users.id, userId));

            res.status(200).json({
                message: "Identifiants mis à jour avec succès.",
            });
        } catch (error) {
            if (error instanceof AppError) return next(error);
            return next(
                new AppError(
                    "Erreur lors de la mise à jour des identifiants",
                    500,
                    error,
                ),
            );
        }
    },
);
