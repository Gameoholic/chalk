import type { NextFunction, Response, Request } from "express";
import crypto from "crypto";
import * as AuthService from "../services/auth.service.js";
import { ChalkInternalException, err } from "../types/result.types.js";
import { env } from "../env.js";

export interface AuthenticatedRequest extends Request {
    authenticatedUser?: {
        id: string;
        role: string;
    };
}

/**
 * If access token is valid: Forward the request.
 * If access token is invalid, expired, or doesn't exist: Issue new access and refresh tokens based on the refresh token's payload.
 */
export default async function cookieJwtAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    // Verify access token
    const accessTokenVerificationResult = AuthService.verifyAccessToken(
        req.cookies["access-token"]
    );

    // If access token is valid and didn't expire:
    if (accessTokenVerificationResult.success) {
        const payload = accessTokenVerificationResult.data;
        req.authenticatedUser = {
            id: payload.id,
            role: payload.role,
        };
        return next();
    }

    const refreshTokenCookieValue: string | undefined = (req as any).cookies[
        "refresh-token"
    ];
    // In case refresh token was not provided:
    if (refreshTokenCookieValue === undefined) {
        return res.sendStatus(401);
    }

    // If access token is invalid, expired, or wasn't provided, refresh tokens according to refresh token:
    const refreshTokensResult = await AuthService.refreshTokens(
        refreshTokenCookieValue
    );

    if (refreshTokensResult.success) {
        const newTokens = refreshTokensResult.data;
        res.cookie("access-token", newTokens.accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.cookie("refresh-token", newTokens.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
        });

        req.authenticatedUser = {
            id: newTokens.userId,
            role: newTokens.userRole,
        };
        return next();
    }

    // If couldn't refresh tokens:
    const error = refreshTokensResult.error;
    const errorReason = error.reason;
    switch (errorReason) {
        case "Couldn't search for/delete old refresh token.": {
            throw new ChalkInternalException(
                500,
                "Couldn't refresh tokens.",
                error
            );
        }
        case "Couldn't find refresh token in the database.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }
        case "Couldn't generate new refresh token.": {
            throw new ChalkInternalException(
                500,
                "Couldn't refresh tokens.",
                error
            );
        }
        case "Old refresh token's user ID is invalid.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }

        case "Old refresh token's user role is invalid.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }

        case "Refresh token id is invalid.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }

        case "Refresh token invalid.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }

        case "Refresh token parameters invalid.": {
            throw new ChalkInternalException(
                401,
                "Invalid refresh token.",
                error
            );
        }

        case "Refresh token expired.": {
            throw new ChalkInternalException(
                401,
                "Refresh token expired.",
                error
            );
        }

        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}
