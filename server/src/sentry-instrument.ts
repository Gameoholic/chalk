import * as Sentry from "@sentry/node";
import { getCompleteErrorStack } from "./types/result.types.js";

Sentry.init({
    dsn: "https://c9f94b1866f2bb87870981e6d086ebd5@o4510975136432128.ingest.de.sentry.io/4510975149998160",
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
