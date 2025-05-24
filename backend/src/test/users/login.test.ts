import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { AppError } from "../../app/utils/AppError";

// Mocks spécifiques pour la route /login
jest.mock("hash-wasm", () => ({
    argon2Verify: jest.fn(),
}));
jest.mock("../../app/middlewares/jwt", () => ({
    generateToken: jest.fn(),
}));

// Mocks généraux (comme dans les tests précédents)
jest.mock("../../app/config/database", () => ({
    db: {
        select: jest.fn(),
    },
}));

jest.mock("../../db/schema/users", () => ({
    users: { id: "id", email: "email", password: "password", roles: "roles" },
}));

// Import des fonctions mockées pour les typer correctement
import { argon2Verify } from "hash-wasm";
import { generateToken } from "../../app/middlewares/jwt";

// Création de l'application Express pour les tests
const app = express();
app.use(express.json()); // Important pour parser le body des requêtes

// --- Définition de la route /login directement dans le fichier de test ---
// C'est préférable pour s'assurer que les mocks sont bien en place avant que la route ne soit définie.
app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new AppError("Email and password are required.", 400);
        }

        const userResult = await (
            db
                .select()
                .from(users)
                .where(eq(users.email as any, email)) as any
        ).execute();

        const [user] = userResult;

        let isValid = false;
        if (user) {
            isValid = await (argon2Verify as jest.Mock)({
                // Cast pour le mock
                password: password,
                hash: user.password,
            });
        }

        if (!isValid) {
            throw new AppError("Invalid credentials.", 401);
        }

        const token = await (generateToken as jest.Mock)(user.id, user.roles); // Cast pour le mock

        res.status(200).json({ message: "Login successful.", token: token });
    } catch (error) {
        if (error instanceof AppError) return next(error);
        return next(
            new AppError("Internal error during user login", 500, error),
        );
    }
});

// --- Gestionnaire d'erreurs pour les tests (comme dans les précédents) ---
app.use(((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal Server Error" });
}) as express.ErrorRequestHandler);

// Variables pour les mocks chaînes de Drizzle ORM
let mockExecute: jest.Mock;
let mockWhere: jest.Mock;
let mockFrom: jest.Mock;

beforeEach(() => {
    jest.clearAllMocks(); // Nettoie tous les mocks avant chaque test

    // Configure les mocks de la chaîne Drizzle ORM (select().from().where().execute())
    mockExecute = jest.fn();
    mockWhere = jest.fn(() => ({ execute: mockExecute }));
    mockFrom = jest.fn(() => ({
        where: mockWhere,
        execute: mockExecute,
    }));
    (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
    });

    // Réinitialise les mocks spécifiques à la route /login
    (argon2Verify as jest.Mock).mockClear();
    (generateToken as jest.Mock).mockClear();
});

describe("POST /login", () => {
    const mockEmail = "test@example.com";
    const mockPassword = "password123";
    const mockUser = {
        id: 1,
        email: mockEmail,
        password: "hashed_password",
        roles: ["user"],
    };
    const mockToken = "mock_jwt_token";

    it("should return a token on successful login", async () => {
        // Simule la lecture de l'utilisateur depuis la base de données
        mockExecute.mockResolvedValueOnce([mockUser]); // User found

        // Simule la vérification du mot de passe
        (argon2Verify as jest.Mock).mockResolvedValueOnce(true); // Password is valid

        // Simule la génération du token JWT
        (generateToken as jest.Mock).mockResolvedValueOnce(mockToken);

        const res = await request(app)
            .post("/login")
            .send({ email: mockEmail, password: mockPassword });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: "Login successful.",
            token: mockToken,
        });
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.email, mockEmail));
        expect(mockExecute).toHaveBeenCalled();
        expect(argon2Verify).toHaveBeenCalledWith({
            password: mockPassword,
            hash: mockUser.password,
        });
        expect(generateToken).toHaveBeenCalledWith(mockUser.id, mockUser.roles);
    });

    it("should return 400 if email is missing", async () => {
        const res = await request(app)
            .post("/login")
            .send({ password: mockPassword });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            message: "Email and password are required.",
        });
        expect(db.select).not.toHaveBeenCalled();
        expect(argon2Verify).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
    });

    it("should return 400 if password is missing", async () => {
        const res = await request(app)
            .post("/login")
            .send({ email: mockEmail });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            message: "Email and password are required.",
        });
        expect(db.select).not.toHaveBeenCalled();
        expect(argon2Verify).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
    });

    it("should return 401 if user is not found", async () => {
        // Simule qu'aucun utilisateur n'est trouvé
        mockExecute.mockResolvedValueOnce([]); // No user found

        const res = await request(app)
            .post("/login")
            .send({ email: "nonexistent@example.com", password: mockPassword });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ message: "Invalid credentials." });
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(
            eq(users.email, "nonexistent@example.com"),
        );
        expect(mockExecute).toHaveBeenCalled();
        expect(argon2Verify).not.toHaveBeenCalled(); // argon2Verify ne doit pas être appelé si l'utilisateur n'est pas trouvé
        expect(generateToken).not.toHaveBeenCalled();
    });

    it("should return 401 if password is incorrect", async () => {
        mockExecute.mockResolvedValueOnce([mockUser]); // User found

        (argon2Verify as jest.Mock).mockResolvedValueOnce(false); // Password is NOT valid

        const res = await request(app)
            .post("/login")
            .send({ email: mockEmail, password: "wrong_password" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ message: "Invalid credentials." });
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.email, mockEmail));
        expect(mockExecute).toHaveBeenCalled();
        expect(argon2Verify).toHaveBeenCalledWith({
            password: "wrong_password",
            hash: mockUser.password,
        });
        expect(generateToken).not.toHaveBeenCalled(); // Token ne doit pas être généré si le password n'est pas bon
    });

    it("should return 500 on internal database error", async () => {
        mockExecute.mockRejectedValueOnce(new Error("DB Connection Failed"));

        const res = await request(app)
            .post("/login")
            .send({ email: mockEmail, password: mockPassword });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Internal error during user login",
        });
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.email, mockEmail));
        expect(mockExecute).toHaveBeenCalled();
        expect(argon2Verify).not.toHaveBeenCalled();
        expect(generateToken).not.toHaveBeenCalled();
    });

    it("should return 500 if token generation fails", async () => {
        mockExecute.mockResolvedValueOnce([mockUser]);
        (argon2Verify as jest.Mock).mockResolvedValueOnce(true);
        (generateToken as jest.Mock).mockRejectedValueOnce(
            new Error("Token generation error"),
        );

        const res = await request(app)
            .post("/login")
            .send({ email: mockEmail, password: mockPassword });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Internal error during user login",
        });
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.email, mockEmail));
        expect(mockExecute).toHaveBeenCalled();
        expect(argon2Verify).toHaveBeenCalled();
        expect(generateToken).toHaveBeenCalledWith(mockUser.id, mockUser.roles);
    });
});
