import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import envSchema from "./env-schema";
import { z } from "zod";

export default defineConfig(({ mode }) => {
    // Tests will run on Github Actions, we don't want to load env variables for that test as they don't exist!
    if (!process.env.CI && mode !== "test") {
        const env = loadEnv(mode, process.cwd(), "");
        const parsed = envSchema.safeParse(env);

        if (!parsed.success) {
            console.error(
                "Invalid environment variables: " +
                    z.prettifyError(parsed.error)
            );
            throw new Error("Invalid environment variables. Build aborted.");
        }
    }

    return {
        server: {
            port: 5173,
        },
        plugins: [tailwindcss(), react()],
        test: {
            environment: "jsdom",
            globals: true,
            setupFiles: ["./vitest.setup.ts"],
            include: ["src/tests/**/*.test.ts"],
        },
    };
});
