import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as Sentry from "@sentry/node";
import { env } from "../env.js";

import {
    ChalkInternalException,
    err,
    getCompleteErrorStack,
} from "../types/result.types.js";

export async function login(req: Request, res: Response) {
    const email = req.body.email as string;
    const password = req.body.password as string;
    if (!email || !password) {
        return res.status(400).json({ error: "Not all arguments provided." });
    }

    const result = await AuthService.login(email, password);

    if (result.success) {
        const tokens = result.data;

        res.cookie("refresh-token", tokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.cookie("access-token", tokens.accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
        });

        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "Incorrect password.": {
            throw new ChalkInternalException(
                401,
                "Login credentials are incorrect.",
                error
            );
        }
        case "User doesn't exist.": {
            throw new ChalkInternalException(
                401,
                "Login credentials are incorrect.",
                error
            );
        }
        case "Couldn't issue tokens.": {
            throw new ChalkInternalException(
                500,
                "Failed to log in due to an internal error.",
                error
            );
        }
        case "Couldn't search for user.": {
            throw new ChalkInternalException(
                500,
                "Failed to log in due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

/**
 * If requester is guest user, will clear tokens from browser.
 * If requester is logged in user, Will attempt to invalidate user's refresh token and clear user's token cookies.
 * Even if unsuccessful, will delete token cookies from browser.
 */
export async function logout(req: AuthenticatedRequest, res: Response) {
    // Deleting refresh token is best case scenario, either way, we want to at least delete the tokens
    res.clearCookie("refresh-token");
    res.clearCookie("access-token");

    const refreshTokenCookie: string | undefined = req.cookies["refresh-token"];
    if (refreshTokenCookie === undefined) {
        return res.sendStatus(204); // nothing to invalidate, already logged out
    }

    // Deletes refresh token id
    const result = await AuthService.logout(refreshTokenCookie);

    if (result.success) {
        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "Couldn't find refresh token.": {
            // This means refresh token was already deleted, so it's fine.
            return res.sendStatus(204);
        }
        case "Refresh token expired.": {
            // This means refresh token won't work for refreshing tokens meaning user is effictively logged out, so it's fine.
            return res.sendStatus(204);
        }
        case "Couldn't delete refresh token.": {
            throw new ChalkInternalException(
                500,
                "Failed to log out due to an internal error.",
                error
            );
        }
        case "Refresh token Id is invalid.": {
            throw new ChalkInternalException(
                401,
                "Refresh token is invalid.",
                error
            );
        }
        case "Refresh token cookie is invalid.": {
            throw new ChalkInternalException(
                401,
                "Refresh token is invalid.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}
