import * as Sentry from "@sentry/node";
import { getCompleteErrorStack } from "./types/result.types.js";
import { env } from "./env.js";

Sentry.init({
    dsn: env.SENTRY_DSN,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
});

export function captureServiceError<
    const Reason extends string,
    E extends {
        reason: Reason;
        previousErrorReasons: string[];
    },
>(location: string, error: E, extra?: Record<string, unknown>) {
    const context: Parameters<typeof Sentry.captureException>[1] = {
        tags: {
            layer: "controller",
        },
    };

    if (extra) {
        context.extra = extra;
    }

    Sentry.captureException(
        new Error(`${location}: ${getCompleteErrorStack(error)}`),
        context
    );
}
