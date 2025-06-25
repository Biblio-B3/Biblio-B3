import nodemailer from "nodemailer";
import { db } from "../config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendResetPasswordEmail(
    userId: number,
    resetToken: string,
) {
    // Vérifier la configuration SMTP
    if (!process.env.FRONTEND_URL || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("Configuration SMTP manquante");
    }

    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0) {
        return false;
    }

    const userEmail = user[0].email;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: "Réinitialisation de votre mot de passe",
        html: `
            <h1>Réinitialisation de mot de passe</h1>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour procéder :</p>
            <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
            <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
            <p>Ce lien expirera dans 1 heure.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        throw error;
    }
}

export async function sendUnclaimedReservationReminder(
    userId: number,
    bookTitle: string,
) {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0 || !user[0].email_notification) {
        return false;
    }

    const userEmail = user[0].email;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: "Rappel: Réservation non récupérée",
        html: `
            <h1>Rappel: Réservation non récupérée</h1>
            <p>Bonjour,</p>
            <p>Vous avez une réservation non récupérée pour le livre "${bookTitle}". Il vous reste 1 jour pour la récupérer.</p>
            <p>Si vous ne la récupérez pas dans les 24 heures, elle sera annulée.</p>
            <p>Consultez vos réservations :
                <a href="${process.env.FRONTEND_URL}/reservations-history">${process.env.FRONTEND_URL}/reservations-history</a>
            </p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email de rappel:", error);
        throw error;
    }
}

export async function sendExpiringReservationReminder(
    userId: number,
    bookTitle: string,
    finalDate: Date,
) {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0 || !user[0].email_notification) {
        return false;
    }

    const userEmail = user[0].email;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: "Rappel: Réservation sur le point d'expirer",
        html: `
            <h1>Rappel: Réservation sur le point d'expirer</h1>
            <p>Bonjour,</p>
            <p>Vous avez une réservation pour le livre "${bookTitle}" qui expire le ${finalDate.toLocaleDateString("fr-FR")}.</p>
            <p>Merci de la récupérer avant cette date.</p>
            <p>Consultez vos réservations :
                <a href="${process.env.FRONTEND_URL}/reservations-history">${process.env.FRONTEND_URL}/reservations-history</a>
            </p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error(
            "Erreur lors de l'envoi de l'email de rappel pour expiration:",
            error,
        );
        throw error;
    }
}
export async function sendExpiredReservationEmail(
    userId: number,
    bookId: number,
    bookTitle: string,
) {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0 || !user[0].email_notification) {
        return false;
    }

    const userEmail = user[0].email;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: "Votre réservation a expiré",
        html: `
            <h1>Votre réservation a expiré</h1>
            <p>Bonjour,</p>
            <p>Nous vous informons que votre réservation pour le livre "${bookTitle}" a expiré car elle n'a pas été récupérée à temps.</p>
            <p>Vous pouvez effectuer une nouvelle réservation si le livre est disponible.</p>
            <p>Pour accéder à la page du livre, cliquez sur le lien :
                <a href="${process.env.FRONTEND_URL}/books?bookId=${bookId}">${bookTitle}</a>
            </p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error(
            "Erreur lors de l'envoi de l'email de réservation expirée:",
            error,
        );
        throw error;
    }
}

export async function sendReservationConfirmation(
    userId: number,
    bookTitle: string,
    pickupDeadline: Date,
) {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user || user.length === 0 || !user[0].email_notification) {
        return false;
    }

    const userEmail = user[0].email;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: "Confirmation de votre réservation",
        html: `
            <h1>Confirmation de réservation</h1>
            <p>Bonjour,</p>
            <p>Votre réservation pour le livre "${bookTitle}" a été enregistrée avec succès.</p>
            <p>Vous avez jusqu'au ${pickupDeadline.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
    })} pour récupérer votre livre (dans les 48h).</p>
            <p>Vous pouvez consulter vos réservations à tout moment sur :
                <a href="${process.env.FRONTEND_URL}/reservations">${process.env.FRONTEND_URL}/reservations</a>
            </p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error(
            "Erreur lors de l'envoi de l'email de confirmation de réservation:",
            error,
        );
        throw error;
    }
}
