import { Request, Response, NextFunction } from "express";
import { db } from "../../app/config/database";
import { users } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { AppError } from "../../app/utils/AppError";

// Mocks pour les dépendances
jest.mock("../../app/config/database", () => ({
    db: {
        select: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock("../../db/schema/users", () => ({
    users: { id: "id", name: "name", email: "email", roles: "roles" },
}));

jest.mock("drizzle-orm", () => ({
    eq: jest.fn((field, value) => ({ field, value })),
}));

// Fonction à tester - la logique de la route isolée
async function deleteUserHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId) || userId <= 0)
            throw new AppError("Invalid user ID provided.", 400);

        const User = await db.select().from(users).where(eq(users.id, userId));
        if (User.length === 0)
            throw new AppError(`User with ID ${userId} not found`, 404);
        try {
            await db.delete(users).where(eq(users.id, userId));
            res.status(200).json("User deleted successfully.");
        } catch (error) {
            throw new AppError("Error while deleting the user.", 500, error);
        }
    } catch (error) {
        if (error instanceof AppError) return next(error);
        next(new AppError("Internal error during user deletion", 500, error));
    }
}

describe("DELETE /users/:id handler", () => {
    // Mocks pour req, res et next
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    // Variables pour les chaînes de méthodes
    let mockSelectFrom: jest.Mock;
    let mockSelectWhere: jest.Mock;
    let mockDeleteWhere: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock pour request, response et next
        mockRequest = {
            params: { id: "1" },
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();

        // Mock pour les chaînes de méthodes
        mockSelectWhere = jest.fn();
        mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
        (db.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

        mockDeleteWhere = jest.fn();
        (db.delete as jest.Mock).mockReturnValue({ where: mockDeleteWhere });
    });

    it("should delete a user successfully", async () => {
        // Simule que l'utilisateur existe
        mockSelectWhere.mockResolvedValueOnce([{ id: 1, name: "Test User" }]);

        // Simule une suppression réussie
        mockDeleteWhere.mockResolvedValueOnce(undefined);

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith(
            "User deleted successfully.",
        );

        expect(db.select).toHaveBeenCalled();
        expect(mockSelectFrom).toHaveBeenCalledWith(users);
        expect(mockSelectWhere).toHaveBeenCalledWith(eq(users.id, 1));

        expect(db.delete).toHaveBeenCalledWith(users);
        expect(mockDeleteWhere).toHaveBeenCalledWith(eq(users.id, 1));

        expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 when user ID is invalid", async () => {
        mockRequest.params = { id: "abc" };

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                message: "Invalid user ID provided.",
            }),
        );

        expect(db.select).not.toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
    });

    it("should return 400 when user ID is negative", async () => {
        mockRequest.params = { id: "-1" };

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                message: "Invalid user ID provided.",
            }),
        );

        expect(db.select).not.toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when user does not exist", async () => {
        // Simule qu'aucun utilisateur n'est trouvé
        mockSelectWhere.mockResolvedValueOnce([]);

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
                message: "User with ID 1 not found",
            }),
        );

        expect(db.select).toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
    });

    it("should return 500 when select operation fails", async () => {
        // Simule une erreur lors de la sélection
        const dbError = new Error("Database connection failed");
        mockSelectWhere.mockRejectedValueOnce(dbError);

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
                message: "Internal error during user deletion",
            }),
        );

        expect(db.select).toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
    });

    it("should return 500 when delete operation fails", async () => {
        // Simule que l'utilisateur existe
        mockSelectWhere.mockResolvedValueOnce([{ id: 1, name: "Test User" }]);

        // Mais la suppression échoue
        const deleteError = new Error("Delete operation failed");
        mockDeleteWhere.mockRejectedValueOnce(deleteError);

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
                message: "Error while deleting the user.",
            }),
        );

        expect(db.select).toHaveBeenCalled();
        expect(db.delete).toHaveBeenCalled();
    });

    it("should handle unexpected errors during request processing", async () => {
        // Simule une erreur non captée spécifiquement
        (db.select as jest.Mock).mockImplementation(() => {
            throw new Error("Unexpected error");
        });

        await deleteUserHandler(
            mockRequest as Request,
            mockResponse as Response,
            mockNext,
        );

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
                message: "Internal error during user deletion",
            }),
        );
    });
});
