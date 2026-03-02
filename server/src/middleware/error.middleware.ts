import type { NextFunction, Response, Request } from "express";
import crypto from "crypto";
import * as AuthService from "../services/auth.service.js";
import {
    ChalkInternalException,
    err,
    getCompleteErrorStack,
} from "../types/result.types.js";
import * as Sentry from "@sentry/node";

/**
 * Sends the most recent error reason to the client.
 * Captures the error on sentry if needed.
 */
export default function globalErrorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (error instanceof ChalkInternalException) {
        if (error.statusCode < 500 || error.statusCode > 599) {
            // Normal 'healthy' error, we don't log
            return res.status(error.statusCode).json({
                error: error.errorPayload.reason,
            });
        }

        Sentry.captureException(error, {
            contexts: {
                "Chalk Error Details": {
                    reason: error.errorPayload.reason,
                    previousErrorReasons:
                        error.errorPayload.previousErrorReasons,
                    completeStack: getCompleteErrorStack(error.errorPayload),
                },
            },
        });
        console.error("---Chalk Exception---");
        console.error(error.stack);
        console.error("---Chalk Exception---");

        return res.status(error.statusCode).json({
            error: error.errorPayload.reason,
        });
    }

    console.error("---Unknown Exception---");
    console.error(error);
    console.error("---Unknown Exception---");
    Sentry.captureException(error);

    return res.status(500).json({
        error: "Internal server error.",
    });
}
