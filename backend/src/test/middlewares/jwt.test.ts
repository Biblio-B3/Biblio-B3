import { generateToken } from "../../app/middlewares/jwt";
import { SignJWT } from "jose";
import { AppError } from "../../app/utils/AppError";

// Mock de la clé secrète pour les tests
jest.mock("../../app/middlewares/jwt", () => ({
    ...jest.requireActual("../../app/middlewares/jwt"),
    key: "test_secret_key_for_jwt_generation_and_verification",
}));

describe("generateToken", () => {
    it("should generate a valid JWT token", async () => {
        const user_id = 1;
        const role = "user";

        const token = await generateToken(user_id, role);

        expect(typeof token).toBe("string");
        expect(token.split(".").length).toBe(3);
    });

    it("should throw an AppError if token generation fails", async () => {
        const user_id = 1;
        const role = "user";

        // Forcer une erreur dans la signature
        jest.spyOn(SignJWT.prototype, "sign").mockImplementationOnce(() => {
            throw new Error("Signing error");
        });

        await expect(generateToken(user_id, role)).rejects.toThrow(
            new AppError("Unable to generate the token.", 500)
        );
    });
});