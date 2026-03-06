import { z } from "zod";
import dotenv from "dotenv";
import ms from "ms";

dotenv.config({ path: ".env.local" });

const msString = z
    .string()
    .refine((val) => ms(val as Parameters<typeof ms>[0]) !== undefined, {
        message:
            "Invalid duration format. See https://github.com/vercel/ms for valid formats.",
    });

const envSchema = z.object({
    JWT_SECRET: z.string().min(32),
    ATLAS_URI: z.string().regex(/^mongodb\+srv:\/\//),
    BCRYPT_SALT_ROUNDS: z.coerce.number().min(10),
    PORT: z.coerce.number().positive(),
    ALLOWED_ORIGIN: z.url(),
    ACCESS_TOKEN_EXPIRY: msString,
    REFRESH_TOKEN_EXPIRY: msString,
    REFRESH_TOKEN_EXPIRY_GUEST: msString,
    BOARD_NAME_MAX_LENGTH: z.coerce.number().positive(),
    DISPLAY_NAME_MAX_LENGTH: z.coerce.number().positive(),
    BOARD_MAX_OBJECTS: z.coerce.number().positive(),
    NODE_ENV: z.enum(["development", "production"]),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(z.prettifyError(parsed.error));
    throw new Error("Invalid environment variables.");
}

console.log("Environment variables loaded.");

export const env = parsed.data;
