import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { AppError } from "../../app/utils/AppError";
import xss from "xss";

// Mocks des dépendances externes
jest.mock("../../app/config/database", () => ({
    db: {
        insert: jest.fn(),
    },
}));

jest.mock("../../db/schema/users", () => ({
    users: {
        id: "id",
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
        password: "password",
        bio: "bio",
        roles: "roles",
    },
    insertUserSchema: {
        parse: jest.fn((user) => user),
    },
}));

jest.mock("hash-wasm", () => ({
    argon2id: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("../../app/middlewares/jwt", () => ({
    generateToken: jest.fn().mockResolvedValue("mock_token"),
}));

jest.mock("xss", () => jest.fn((input) => input));

// Mock pour crypto.getRandomValues
global.crypto = {
    getRandomValues: jest.fn((arr) => arr),
} as any;

// Import des modules après les mocks
import { db } from "../../app/config/database";
import { users, insertUserSchema } from "../../db/schema/users";
import { generateToken } from "../../app/middlewares/jwt";
import { argon2id } from "hash-wasm";

// Configuration de l'application Express
const app = express();
app.use(express.json());

// Implémentation de la route /registration
app.post(
    "/registration",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (Object.keys(req.body).length === 0)
                throw new AppError("No data provided for registration.", 400);

            const { first_name, last_name, email, bio, password } = req.body;
            if (!first_name || !last_name || !email || !password)
                throw new AppError(
                    "Missing required fields: first_name, last_name, email, password.",
                    400,
                );

            const sanitizedBody = {
                first_name: xss(first_name),
                last_name: xss(last_name),
                password: password,
                email: email,
                bio: bio ? xss(bio) : undefined,
                roles: "user",
            };

            const salt = new Uint8Array(16);
            crypto.getRandomValues(salt);
            const hashedPassword = await argon2id({
                password: sanitizedBody.password,
                salt,
                parallelism: 1,
                iterations: 2,
                memorySize: 19456,
                hashLength: 32,
                outputType: "encoded",
            });

            const validatedInsert = insertUserSchema.parse(sanitizedBody);
            validatedInsert.password = hashedPassword;

            // Correction ici : modification de la façon dont nous simulons le retour de la base de données
            const newUser = await db
                .insert(users)
                .values(validatedInsert)
                .returning({ id: users.id });

            if (!newUser || newUser.length === 0) {
                throw new AppError("Error during registration.", 500);
            }

            try {
                const token = await generateToken(
                    newUser[0].id,
                    validatedInsert.roles,
                );
                res.status(201).json({
                    message: "User successfully registered",
                    token: token,
                });
            } catch {
                res.status(201).json({
                    message: "User successfully registered",
                });
            }
        } catch (error) {
            if (
                error instanceof Error &&
                "constraint" in error &&
                error["constraint"] === "users_email_unique"
            ) {
                return next(new AppError("This email is already in use.", 400));
            } else if (error instanceof AppError) {
                return next(error);
            } else {
                console.error("Error in registration:", error);
                return next(
                    new AppError("Error during registration.", 500, error),
                );
            }
        }
    },
);

// Middleware de gestion d'erreurs
app.use(((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Error in middleware:", err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
}) as express.ErrorRequestHandler);

describe("POST /registration", () => {
    const validRegistration = {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        password: "password123",
        bio: "This is my bio",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Correction importante : configuration correcte des mocks pour la chaîne Drizzle ORM
        const mockReturningResult = [{ id: 1 }];
        (db.insert as jest.Mock).mockImplementation(() => {
            return {
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue(mockReturningResult),
                }),
            };
        });
    });

    it("should register a new user successfully and return a token", async () => {
        const res = await request(app)
            .post("/registration")
            .send(validRegistration);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            message: "User successfully registered",
            token: "mock_token",
        });
        expect(db.insert).toHaveBeenCalledWith(users);
        expect(generateToken).toHaveBeenCalledWith(1, "user");
    });

    it("should register a user without a token if token generation fails", async () => {
        (generateToken as jest.Mock).mockRejectedValueOnce(
            new Error("Token generation error"),
        );

        const res = await request(app)
            .post("/registration")
            .send(validRegistration);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            message: "User successfully registered",
        });
        expect(db.insert).toHaveBeenCalledWith(users);
    });

    it("should return 400 if no data is provided", async () => {
        const res = await request(app).post("/registration").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            message: "No data provided for registration.",
        });
        expect(db.insert).not.toHaveBeenCalled();
    });

    it("should return 400 if required fields are missing", async () => {
        const res = await request(app)
            .post("/registration")
            .send({ first_name: "John" }); // Champs obligatoires manquants

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            message:
                "Missing required fields: first_name, last_name, email, password.",
        });
        expect(db.insert).not.toHaveBeenCalled();
    });

    it("should return 400 if email is already in use", async () => {
        // Simuler une erreur de contrainte unique sur l'email
        const emailUniqueError: any = new Error("Unique constraint violation");
        emailUniqueError.constraint = "users_email_unique";

        (db.insert as jest.Mock).mockImplementation(() => {
            return {
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockRejectedValue(emailUniqueError),
                }),
            };
        });

        const res = await request(app)
            .post("/registration")
            .send(validRegistration);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            message: "This email is already in use.",
        });
        expect(db.insert).toHaveBeenCalledWith(users);
    });

    it("should handle database errors during user insertion", async () => {
        // Simuler une base de données qui retourne un tableau vide
        (db.insert as jest.Mock).mockImplementation(() => {
            return {
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([]),
                }),
            };
        });

        const res = await request(app)
            .post("/registration")
            .send(validRegistration);

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Error during registration.",
        });
        expect(db.insert).toHaveBeenCalledWith(users);
    });

    it("should handle unexpected errors", async () => {
        // Simuler une erreur inattendue
        (db.insert as jest.Mock).mockImplementation(() => {
            return {
                values: jest.fn().mockReturnValue({
                    returning: jest
                        .fn()
                        .mockRejectedValue(
                            new Error("Unexpected database error"),
                        ),
                }),
            };
        });

        const res = await request(app)
            .post("/registration")
            .send(validRegistration);

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Error during registration.",
        });
        expect(db.insert).toHaveBeenCalledWith(users);
    });

    it("should register a user without bio if not provided", async () => {
        const registrationWithoutBio = {
            first_name: "Jane",
            last_name: "Doe",
            email: "jane.doe@example.com",
            password: "password456",
        };

        const res = await request(app)
            .post("/registration")
            .send(registrationWithoutBio);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            message: "User successfully registered",
            token: "mock_token",
        });
        expect(db.insert).toHaveBeenCalledWith(users);

        // Vérifier que le bio est undefined et que xss a été appelé correctement
        expect(
            (insertUserSchema.parse as jest.Mock).mock.calls[0][0].bio,
        ).toBeUndefined();
    });
});
