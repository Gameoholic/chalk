import type { NextFunction, Response, Request } from "express";
import crypto from "crypto";
import * as AuthService from "../services/auth.service.js";
import { err } from "../types/result.types.js";

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
    try {
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

        const refreshTokenCookieValue: string | undefined = (req as any)
            .cookies["refresh-token"];
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
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });
            res.cookie("refresh-token", newTokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
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
                return res
                    .status(500)
                    .json({ error: "Couldn't refresh tokens." });
            }
            case "Couldn't find refresh token in the database.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }
            case "Couldn't generate new refresh token.": {
                return res
                    .status(500)
                    .json({ error: "Couldn't refresh tokens." });
            }
            case "Old refresh token's user ID is invalid.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }

            case "Old refresh token's user role is invalid.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }

            case "Refresh token id is invalid.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }

            case "Refresh token invalid.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }

            case "Refresh token parameters invalid.": {
                return res
                    .status(401)
                    .json({ error: "Invalid refresh token." });
            }

            case "Refresh token expired.": {
                return res
                    .status(401)
                    .json({ error: "Refresh token expired." });
            }

            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (error) {
        return res
            .status(500)
            .json({ error: "Couldn't authenticate due to an internal error." });
    }
}
