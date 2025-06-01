import { db } from "../config/database";
import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/AppError";

export function grantedAccessMiddleware(
    accessType: "owner" | "admin" | "admin_or_owner",
    schema?: any,
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.payload?.user_id || !req.payload?.role) {
                return next(new AppError("Unauthorized: No user ID in token.", 401));
            }

            const tokenUserId = req.payload.user_id;
            const isAdmin = req.payload.role === "admin";

            // Cas où on accède aux données d'un utilisateur via /users/:id/*
            if (req.params.id && req.route?.path?.includes('/users/:id')) {
                const userIdParam = parseInt(req.params.id, 10);
                if (isNaN(userIdParam) || userIdParam <= 0) {
                    return next(new AppError("Invalid user ID provided.", 400));
                }

                // Vérification "owner" ou "admin_or_owner" par rapport à user_id
                if (accessType === "owner" && tokenUserId !== userIdParam) {
                    return next(new AppError("Access denied.", 403));
                }
                if (
                    accessType === "admin_or_owner" &&
                    tokenUserId !== userIdParam &&
                    !isAdmin
                ) {
                    return next(new AppError("Access denied.", 403));
                }

                // Si c'est un admin ou si tokenUserId === userIdParam, on autorise
                return next();
            }

            // Si on passe un paramètre "user_id" dans l'URL, on considère qu'on veut
            // lister toutes les réservations où reservation.user_id = user_id
            if (req.params.user_id !== undefined) {
                const userIdParam = parseInt(req.params.user_id, 10);
                if (isNaN(userIdParam) || userIdParam <= 0) {
                    return next(new AppError("Invalid user ID provided.", 400));
                }

                // Vérification "owner" ou "admin_or_owner" par rapport à user_id
                if (accessType === "owner" && tokenUserId !== userIdParam) {
                    return next(new AppError("Access denied.", 403));
                }
                if (
                    accessType === "admin_or_owner" &&
                    tokenUserId !== userIdParam &&
                    !isAdmin
                ) {
                    return next(new AppError("Access denied.", 403));
                }

                // Si c'est un admin ou si tokenUserId === userIdParam, on autorise
                return next();
            }

            // Sinon, on est dans le cas "lookup par resource.id"
            if (accessType === "admin" && !isAdmin) {
                return next(new AppError("Access denied.", 403));
            }
            if (accessType === "admin" && isAdmin) {
                return next();
            }
            if (!schema) {
                return next(
                    new AppError("Schema not provided for access verification.", 500),
                );
            }

            const resourceId = parseInt(req.params.id, 10);
            if (isNaN(resourceId) || resourceId <= 0) {
                return next(
                    new AppError("Invalid ID provided.", 400, {
                        id: resourceId,
                    }),
                );
            }

            const resource = await db
                .select({ user_id: schema.user_id })
                .from(schema)
                .where(eq(schema.id, resourceId));

            if (!resource || resource.length === 0 || !resource[0]) {
                return next(
                    new AppError(`Resource with ID ${resourceId} not found.`, 404, {
                        id: resourceId,
                    }),
                );
            }

            const isOwner = resource[0].user_id === tokenUserId;
            if (accessType === "owner" && !isOwner) {
                return next(new AppError("Access denied.", 403, { id: resourceId }));
            }
            if (accessType === "admin_or_owner" && !isOwner && !isAdmin) {
                return next(new AppError("Access denied.", 403, { id: resourceId }));
            }

            next();
        } catch (error) {
            console.error("Error while verifying access:", error);
            next(new AppError("Error while verifying access.", 500, error));
        }
    };
}