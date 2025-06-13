import { app } from "../..";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { argon2id, argon2Verify } from "hash-wasm";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";

app.post(
    "/change-default-credentials",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { newEmail, newPassword } = req.body;
            
            console.log("Données reçues dans change-default-credentials:", {
                newEmail: newEmail ? "présent" : "manquant",
                newPassword: newPassword ? "présent" : "manquant",
                body: req.body
            });
            
            if (!newEmail || !newPassword) {
                throw new AppError("Email et mot de passe requis.", 400);
            }

            // Trouver l'utilisateur avec l'email par défaut
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, "admin@example.com"));

            if (!user) {
                throw new AppError("Utilisateur administrateur non trouvé.", 404);
            }

            // Vérifier que le mot de passe actuel correspond bien au mot de passe par défaut
            const isValid = await argon2Verify({
                password: "adminpassword",
                hash: user.password,
            });

            if (!isValid) {
                throw new AppError("Cette fonctionnalité n'est disponible que pour les identifiants par défaut.", 403);
            }

            // Vérifier si le nouvel email est déjà utilisé
            const [existingUser] = await db
                .select()
                .from(users)
                .where(eq(users.email, newEmail));

            if (existingUser && existingUser.id !== user.id) {
                throw new AppError("Cet email est déjà utilisé par un autre compte.", 400);
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
                    revocation_time_at: new Date(),
                })
                .where(eq(users.id, user.id));

            res.status(200).json({
                message: "Identifiants mis à jour avec succès.",
            });
        } catch (error) {
            console.error("Erreur détaillée dans change-default-credentials:", error);
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
