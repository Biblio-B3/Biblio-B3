// src/test/unit_email/test_email_unit.test.ts
// Ajustez le chemin d’accès au service selon votre structure
import { sendResetPasswordEmail } from "../../app/services/email";

// 1. Pré-déclaration de la mock-var avec var pour éviter la TDZ
var sendMailMock: jest.Mock;

// 2. Mock de nodemailer
jest.mock("nodemailer", () => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    return {
        createTransport: jest.fn(() => ({
            sendMail: sendMailMock,
        })),
    };
});

// 3. Mock de la base de données sur le même chemin que l’import dans email.ts
jest.mock("../../app/config/database", () => ({
    db: {
        select: jest.fn(() => ({
            from: jest.fn(() => ({
                where: jest.fn(() => ({
                    limit: jest.fn(() =>
                        Promise.resolve([
                            { id: 1, email: "user@example.com" },
                        ])
                    ),
                })),
            })),
        })),
    },
}));

describe("sendResetPasswordEmail", () => {
    beforeEach(() => {
        sendMailMock.mockClear();
        process.env.FRONTEND_URL = "https://frontend.test";
        process.env.SMTP_USER = "smtp@example.com";
        process.env.SMTP_PASS = "testpass";
        // Si nécessaire, définissez SMTP_HOST/SMTP_PORT/SMTP_SECURE ici aussi
    });

    it("envoie un email si l’utilisateur existe", async () => {
        const result = await sendResetPasswordEmail(1, "fake-token");
        expect(result).toBe(true);
        expect(sendMailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "user@example.com",
                subject: expect.stringContaining("Réinitialisation"),
                html: expect.stringContaining(
                    "https://frontend.test/reset-password?token=fake-token"
                ),
            })
        );
    });

    it("retourne false si aucun utilisateur n’est trouvé", async () => {
        // On change le mock pour renvoyer [] au lieu de l’utilisateur
        const dbModule = require("../../app/config/database");
        (dbModule.db.select().from().where().limit as jest.Mock).mockResolvedValueOnce([]);
        const result = await sendResetPasswordEmail(999, "token");
        expect(result).toBe(false);
        expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("lance une erreur si la config SMTP est manquante", async () => {
        delete process.env.FRONTEND_URL;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        await expect(sendResetPasswordEmail(1, "token")).rejects.toThrow(
            "Configuration SMTP manquante"
        );
    });

    it("lance une erreur si sendMail échoue", async () => {
        sendMailMock.mockRejectedValueOnce(new Error("SMTP failure"));
        await expect(sendResetPasswordEmail(1, "token")).rejects.toThrow(
            "SMTP failure"
        );
    });
});
