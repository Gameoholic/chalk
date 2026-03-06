import { z } from "zod";

const envSchema = z.object({
    VITE_FETCH_TIMEOUT: z.coerce.number().positive(),
    VITE_API_URL: z.url().endsWith("/"),
    VITE_SAVE_RETRY_COOLDOWN: z.coerce.number().positive(),
    VITE_SAVE_RETRY_MAX_COOLDOWN: z.coerce.number().min(0),
    VITE_SAVE_REQUEST_COOLDOWN: z.coerce.number().min(0),
});

export default envSchema;
