import { describe, test, expect } from "@jest/globals";

describe("Environment variables", () => {
    const required: Record<string, (val: string) => boolean> = {
        JWT_SECRET: (val) => val.length >= 32,
        ATLAS_URI: (val) => val.startsWith("mongodb+srv://"),
        PORT: (val) => /^\d+$/.test(val),
        NODE_ENV: (val) => ["development", "production", "test"].includes(val),
        BCRYPT_SALT_ROUNDS: (val) => /^\d+$/.test(val) && Number(val) >= 10,
        ALLOWED_ORIGIN: (val) =>
            val.startsWith("http://") || val.startsWith("https://"),
        ACCESS_TOKEN_EXPIRY: (val) => /^\d+[smhdwy]$/.test(val),
        REFRESH_TOKEN_EXPIRY: (val) => /^\d+[smhdwy]$/.test(val),
        REFRESH_TOKEN_EXPIRY_GUEST: (val) => /^\d+[smhdwy]$/.test(val),
        BOARD_NAME_MAX_LENGTH: (val) => /^\d+$/.test(val) && Number(val) > 0,
        DISPLAY_NAME_MAX_LENGTH: (val) => /^\d+$/.test(val) && Number(val) > 0,
        BOARD_MAX_OBJECTS: (val) => /^\d+$/.test(val) && Number(val) > 0,
    };

    for (const [key, validate] of Object.entries(required)) {
        test(`${key} is present and valid`, () => {
            const val = process.env[key];
            expect(val).toBeDefined();
            expect(validate(val!)).toBe(true);
        });
    }
});
