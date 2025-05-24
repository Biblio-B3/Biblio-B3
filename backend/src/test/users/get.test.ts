import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { db } from "../../app/config/database";
import { users, selectUserSchema } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { checkTokenMiddleware } from "../../app/middlewares/verify_jwt";
import { grantedAccessMiddleware } from "../../app/middlewares/verify_access_right";
import { AppError } from "../../app/utils/AppError";

// Globalement accessible pour les tests
let mockExecute: jest.Mock;
let mockWhere: jest.Mock;
let mockFrom: jest.Mock;

jest.mock("../../app/config/database", () => ({
    db: {
        select: jest.fn(),
    },
}));

jest.mock("../../db/schema/users", () => ({
    // Mock simple pour l'objet users, juste pour `eq(users.id, ...)` et `users.roles`
    users: { id: "id", name: "name", email: "email", roles: "roles" },
    selectUserSchema: {
        parse: jest.fn((user) => user), // Mock the parse method to return the user directly
    },
}));

// Mock du middleware de vérification du token
jest.mock("../../app/middlewares/verify_jwt", () => ({
    checkTokenMiddleware: jest.fn(
        (req: Request, res: Response, next: NextFunction) => {
            next(); // Par défaut, juste passe au middleware suivant
        },
    ),
}));

// Mock du middleware de vérification des droits d'accès
jest.mock("../../app/middlewares/verify_access_right", () => ({
    grantedAccessMiddleware: jest.fn(
        (requiredRole: string, schema?: any) =>
            (req: Request, res: Response, next: NextFunction) => {
                const mockRequest = req as MockRequest;
                if (!mockRequest.user) {
                    return next(new AppError("Unauthorized", 401));
                }

                const userRoles = mockRequest.user.roles;
                const userId = mockRequest.user.id;
                const requestedId = parseInt(mockRequest.params.id || "0", 10);

                if (requiredRole === "admin") {
                    if (userRoles.includes("admin")) {
                        next();
                    } else {
                        next(new AppError("Forbidden", 403));
                    }
                } else if (requiredRole === "admin_or_owner") {
                    if (userRoles.includes("admin") || userId === requestedId) {
                        next();
                    } else {
                        next(new AppError("Forbidden", 403));
                    }
                } else {
                    next(
                        new AppError(
                            "Unknown role configuration for test mock",
                            500,
                        ),
                    );
                }
            },
    ),
}));

const app = express();
app.use(express.json());

// --- Définition des routes ---
app.get(
    "/users",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const allUsers = await (db.select().from(users) as any).execute();
            const validatedUsers = allUsers.map((user: any) => {
                return selectUserSchema.parse(user);
            });
            if (validatedUsers.length === 0)
                throw new AppError("No users found.", 404);

            res.status(200).json(validatedUsers);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new AppError(
                    "Internal error during users retrieval",
                    500,
                    error,
                ),
            );
        }
    },
);

app.get(
    "/users/:id",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin_or_owner", users),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId) || userId <= 0)
                throw new AppError("Invalid user ID provided.", 400);

            const User = await (
                db
                    .select()
                    .from(users)
                    .where(eq(users.id as any, userId)) as any
            ).execute();
            if (User.length === 0)
                throw new AppError(`User with ID ${userId} not found`, 404);

            const validatedUsers = User.map((user: any) => {
                return selectUserSchema.parse(user);
            });
            res.status(200).json(validatedUsers);
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new AppError(
                    "Internal error during user retrieval",
                    500,
                    error,
                ),
            );
        }
    },
);

app.get(
    "/roles/:id",
    checkTokenMiddleware,
    grantedAccessMiddleware("admin"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = parseInt(req.params.id, 10);
            if (isNaN(userId) || userId <= 0)
                throw new AppError("Invalid user ID provided.", 400);

            const userRoles = await (
                db
                    .select({ roles: users.roles as any })
                    .from(users)
                    .where(eq(users.id as any, userId)) as any
            ).execute();
            if (userRoles.length === 0) {
                throw new AppError(`User with ID ${userId} not found`, 404);
            } else {
                res.status(200).json(userRoles[0]);
            }
        } catch (error) {
            if (error instanceof AppError) return next(error);
            next(
                new AppError(
                    "Internal error during user roles retrieval",
                    500,
                    error,
                ),
            );
        }
    },
);

// --- FIN de la définition des routes ---

app.use(((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal Server Error" });
}) as express.ErrorRequestHandler);

interface MockRequest extends Request {
    user?: { id: number; roles: string[] };
    params: { id?: string };
}

beforeEach(() => {
    jest.clearAllMocks();

    // Crée les mocks de fonctions et les rend accessibles globalement
    mockExecute = jest.fn();
    mockWhere = jest.fn(() => ({ execute: mockExecute }));
    mockFrom = jest.fn(() => ({
        where: mockWhere,
        execute: mockExecute,
    }));

    (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
    });

    (checkTokenMiddleware as jest.Mock).mockImplementation(
        (req: Request, res: Response, next: NextFunction) => {
            next();
        },
    );

    (grantedAccessMiddleware as jest.Mock).mockImplementation(
        (requiredRole, _schema) =>
            (req: Request, res: Response, next: NextFunction) => {
                const mockReq = req as MockRequest;
                if (!mockReq.user) {
                    return next(new AppError("Unauthorized", 401));
                }

                const userRoles = mockReq.user.roles;
                const userId = mockReq.user.id;
                const requestedId = parseInt(mockReq.params.id || "0", 10);

                if (requiredRole === "admin") {
                    if (userRoles.includes("admin")) {
                        next();
                    } else {
                        next(new AppError("Forbidden", 403));
                    }
                } else if (requiredRole === "admin_or_owner") {
                    if (userRoles.includes("admin") || userId === requestedId) {
                        next();
                    } else {
                        next(new AppError("Forbidden", 403));
                    }
                } else {
                    next(
                        new AppError(
                            "Unknown role configuration for test mock",
                            500,
                        ),
                    );
                }
            },
    );
});

describe("GET /users", () => {
    it("should return all users for an admin", async () => {
        const mockUsers = [
            {
                id: 1,
                name: "User 1",
                email: "user1@example.com",
                roles: ["user"],
            },
            {
                id: 2,
                name: "Admin User",
                email: "admin@example.com",
                roles: ["admin"],
            },
        ];
        mockExecute.mockResolvedValueOnce(mockUsers); // Assigne la valeur directement à l'instance mockée de execute

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUsers);
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockExecute).toHaveBeenCalled(); // Vérifie que l'instance mockée de execute a été appelée
        expect(selectUserSchema.parse).toHaveBeenCalledTimes(mockUsers.length);
    });

    it("should return 404 if no users are found", async () => {
        mockExecute.mockResolvedValueOnce([]);

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "No users found." });
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockExecute).toHaveBeenCalled();
        expect(selectUserSchema.parse).not.toHaveBeenCalled();
    });

    it("should return 403 if user is not admin", async () => {
        const mockRequestUser = { id: 1, roles: ["user"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ message: "Forbidden" });
        expect(db.select).not.toHaveBeenCalled();
    });

    it("should return 500 on internal database error", async () => {
        mockExecute.mockRejectedValueOnce(new Error("DB Connection Failed"));

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Internal error during users retrieval",
        });
        expect(db.select).toHaveBeenCalled();
    });
});

describe("GET /users/:id", () => {
    it("should return the user for an admin", async () => {
        const mockUser = [
            {
                id: 1,
                name: "User 1",
                email: "user1@example.com",
                roles: ["user"],
            },
        ];
        mockExecute.mockResolvedValueOnce(mockUser);

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/1");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUser);
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.id, 1));
        expect(mockExecute).toHaveBeenCalled();
        expect(selectUserSchema.parse).toHaveBeenCalledTimes(mockUser.length);
    });

    it("should return the user for the owner", async () => {
        const mockUser = [
            {
                id: 1,
                name: "User 1",
                email: "user1@example.com",
                roles: ["user"],
            },
        ];
        mockExecute.mockResolvedValueOnce(mockUser);

        const mockRequestUser = { id: 1, roles: ["user"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/1");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUser);
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.id, 1));
        expect(mockExecute).toHaveBeenCalled();
        expect(selectUserSchema.parse).toHaveBeenCalledTimes(mockUser.length);
    });

    it("should return 400 for an invalid user ID", async () => {
        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/abc");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid user ID provided." });
        expect(db.select).not.toHaveBeenCalled();
    });

    it("should return 404 if user is not found", async () => {
        mockExecute.mockResolvedValueOnce([]);

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/123");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User with ID 123 not found" });
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.id, 123));
        expect(mockExecute).toHaveBeenCalled();
        expect(selectUserSchema.parse).not.toHaveBeenCalled();
    });

    it("should return 403 if user is not admin or owner", async () => {
        const mockRequestUser = { id: 2, roles: ["user"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/1");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ message: "Forbidden" });
        expect(db.select).not.toHaveBeenCalled();
    });

    it("should return 500 on internal database error", async () => {
        mockExecute.mockRejectedValueOnce(new Error("DB Query Failed"));

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/users/1");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Internal error during user retrieval",
        });
        expect(db.select).toHaveBeenCalled();
    });
});

describe("GET /roles/:id", () => {
    it("should return user roles for an admin", async () => {
        const mockUserRoles = [{ roles: ["user", "editor"] }];
        mockExecute.mockResolvedValueOnce(mockUserRoles);

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/roles/1");

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockUserRoles[0]);
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.id, 1));
        expect(mockExecute).toHaveBeenCalled();
    });

    it("should return 400 for an invalid user ID", async () => {
        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/roles/abc");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid user ID provided." });
        expect(db.select).not.toHaveBeenCalled();
    });

    it("should return 404 if user is not found", async () => {
        mockExecute.mockResolvedValueOnce([]);

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/roles/123");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "User with ID 123 not found" });
        expect(db.select).toHaveBeenCalled();
        expect(mockFrom).toHaveBeenCalledWith(users);
        expect(mockWhere).toHaveBeenCalledWith(eq(users.id, 123));
        expect(mockExecute).toHaveBeenCalled();
    });

    it("should return 403 if user is not admin", async () => {
        const mockRequestUser = { id: 1, roles: ["user"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/roles/1");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ message: "Forbidden" });
        expect(db.select).not.toHaveBeenCalled();
    });

    it("should return 500 on internal database error", async () => {
        mockExecute.mockRejectedValueOnce(new Error("DB Query Failed"));

        const mockRequestUser = { id: 99, roles: ["admin"] };
        (checkTokenMiddleware as jest.Mock).mockImplementation(
            (req, res, next) => {
                req.user = mockRequestUser;
                next();
            },
        );

        const res = await request(app).get("/roles/1");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            message: "Internal error during user roles retrieval",
        });
        expect(db.select).toHaveBeenCalled();
    });
});
