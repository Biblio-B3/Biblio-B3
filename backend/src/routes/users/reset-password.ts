import { app } from "../..";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../app/utils/AppError";
import { generateToken } from "../../app/middlewares/jwt";
import { sendResetPasswordEmail } from "../../app/services/email";

app.post(
    "/reset-password",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            if (!email) {
                throw new AppError("Email requis", 400);
            }

            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email));

            if (!user) {
                res.status(200).json({
                    message:
                        "Si votre email est dans notre base de données, un email de réinitialisation a été envoyé",
                });
                return;
            }

            try {
                const resetToken = await generateToken(user.id, "reset");

                await sendResetPasswordEmail(user.email, resetToken);
            } catch (error) {
                console.error("Erreur lors de l'envoi de l'email:", error);
            }

            res.status(200).json({
                message:
                    "Si votre email est dans notre base de données, un email de réinitialisation a été envoyé",
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
