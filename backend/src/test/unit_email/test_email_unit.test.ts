describe("sendResetPasswordEmail", () => {
    let sendResetPasswordEmail: any;
    let sendMailMock: jest.Mock;
    let dbLimitMock: jest.Mock;

    beforeAll(async () => {
        // Reset modules pour s'assurer qu'aucun cache n'interfère
        jest.resetModules();
        
        // Create mock functions
        sendMailMock = jest.fn();
        dbLimitMock = jest.fn();

        // Mock nodemailer
        jest.doMock("nodemailer", () => ({
            createTransport: jest.fn(() => ({
                sendMail: sendMailMock,
            })),
        }));

        // Mock drizzle-orm
        jest.doMock("drizzle-orm", () => ({
            eq: jest.fn(() => ({ column: "id", value: 1 })),
        }));

        // Mock database
        jest.doMock("../../app/config/database", () => ({
            db: {
                select: jest.fn(() => ({
                    from: jest.fn(() => ({
                        where: jest.fn(() => ({
                            limit: dbLimitMock,
                        })),
                    })),
                })),
            },
        }));

        // Mock users schema
        jest.doMock("../../db/schema/users", () => ({
            users: { id: "mockUsersTable" },
        }));

        // Import after mocks
        const emailModule = await import("../../app/services/email");
        sendResetPasswordEmail = emailModule.sendResetPasswordEmail;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        sendMailMock.mockResolvedValue(true);
        
        // Setup environment variables
        process.env.FRONTEND_URL = "https://frontend.test";
        process.env.SMTP_USER = "smtp@example.com";
        process.env.SMTP_PASS = "testpass";
        process.env.SMTP_HOST = "smtp.gmail.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_SECURE = "false";
        
        // Setup default DB mock to return a user
        dbLimitMock.mockResolvedValue([
            { id: 1, email: "user@example.com" },
        ]);
    });

    afterAll(() => {
        jest.resetModules();
    });

    it("envoie un email si l'utilisateur existe", async () => {
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

    it("retourne false si aucun utilisateur n'est trouvé", async () => {
        dbLimitMock.mockResolvedValueOnce([]);
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