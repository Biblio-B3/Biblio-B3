import cors from "cors";

export const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (process.env.NODE_ENV === "development") {
            callback(null, true);
        } else {
            const allowedOrigins = process.env.FRONTEND_URL?.split(",") || [];

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log(
                    `CORS blocked origin: ${origin}, allowed origins: ${allowedOrigins}`,
                );
                callback(new Error("Origin not allowed by CORS"));
            }
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
};
