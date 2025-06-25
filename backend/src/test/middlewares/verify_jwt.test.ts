import { Request, Response, NextFunction } from "express";
import { checkTokenMiddleware, extractBearerToken } from "../../app/middlewares/verify_jwt";
import { AppError } from "../../app/utils/AppError";
import * as jose from "jose";
import { JWTPayload } from "jose";

// Définir un type étendu pour la requête Express
declare global {
    namespace Express {
        interface Request {
            payload?: JWTPayload;
        }
    }
}

// Mock des dépendances
jest.mock("jose");
jest.mock("../../app/config/database", () => ({
    db: {
        select: jest.fn(),
    },
}));
// La clé doit être une chaîne hexadécimale de 64 caractères pour correspondre à un Buffer de 32 octets
jest.mock("../../app/middlewares/key", () => "a".repeat(64));

import { db } from "../../app/config/database";

describe("checkTokenMiddleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        nextFunction = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should call next with an AppError if auth_token is missing", async () => {
        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toHaveBeenCalledWith(
            new AppError("Missing JWT token", 401)
        );
    });

    it("should call next with an AppError for invalid token format", async () => {
        mockRequest.headers = { auth_token: "InvalidToken" };
        (jose.jwtVerify as jest.Mock).mockRejectedValueOnce(new Error("Invalid JWT"));
        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should call next with an AppError for invalid token payload", async () => {
        mockRequest.headers = { auth_token: "Bearer valid.token.string" };
        (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({ payload: {} });
        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).toHaveBeenCalledWith(
            new AppError("Invalid token payload", 401)
        );
    });

    it("should call next if token is valid and not revoked", async () => {
        mockRequest.headers = { auth_token: "Bearer valid.token.string" };
        const mockPayload = { user_id: 1, role: "user", iat: Date.now() / 1000 };
        (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({ payload: mockPayload });
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ revocation_time_at: null }]),
        });

        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith();
        expect((mockRequest as Request).payload).toEqual(mockPayload);
    });

    it("should call next with an AppError if token is revoked", async () => {
        mockRequest.headers = { auth_token: "Bearer valid.token.string" };
        const iat = Date.now() / 1000 - 1000; // 1000s in the past
        const mockPayload = { user_id: 1, role: "user", iat };
        (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({ payload: mockPayload });
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ revocation_time_at: new Date() }]),
        });


        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(
            new AppError("Relogin is required.", 401)
        );
    });

    it("should call next with an AppError if user is not found during revocation check", async () => {
        mockRequest.headers = { auth_token: "Bearer valid.token.string" };
        const mockPayload = { user_id: 1, role: "user", iat: Date.now() / 1000 };
        (jose.jwtVerify as jest.Mock).mockResolvedValueOnce({ payload: mockPayload });
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]), // No user found
        });

        await checkTokenMiddleware(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
    });
});

describe("extractBearerToken", () => {
    it("should return the token from the header", () => {
        const token = "my-test-token";
        expect(extractBearerToken(token)).toBe(token);
    });

    it("should return false if header is not a string", () => {
        expect(extractBearerToken(undefined as any)).toBe(false);
    });
});