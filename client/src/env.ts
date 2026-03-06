import { z } from "zod";
import envSchema from "../env-schema";
const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
    console.error(
        "Invalid environment variables: " + z.prettifyError(parsed.error)
    );
    throw new Error("Invalid environment variables.");
}

console.log("Environment variables loaded.");
export const env = parsed.data;
