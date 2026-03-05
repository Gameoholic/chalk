import { describe, test, expect } from "vitest";

describe("Environment variables", () => {
    const required: Record<string, (val: string) => boolean> = {
        VITE_FETCH_TIMEOUT: (val) => /^\d+$/.test(val) && Number(val) > 0,
        VITE_API_URL: (val) => val.startsWith("http") && val.endsWith("/"),
        VITE_SAVE_RETRY_COOLDOWN: (val) => /^\d+$/.test(val) && Number(val) > 0,
        VITE_SAVE_RETRY_MAX_COOLDOWN: (val) => /^\d+$/.test(val),
        VITE_SAVE_REQUEST_COOLDOWN: (val) => /^\d+$/.test(val),
    };

    for (const [key, validate] of Object.entries(required)) {
        test(`${key} is present and valid`, () => {
            const val = import.meta.env[key];
            expect(val).toBeDefined();
            expect(validate(val!)).toBe(true);
        });
    }
});
