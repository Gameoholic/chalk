import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function login(req: Request, res: Response) {
    try {
        const email = req.body.email as string;
        const password = req.body.password as string;
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Not all arguments provided." });
        }

        const result = await AuthService.login(email, password);

        if (result.success) {
            const tokens = result.data;

            res.cookie("refresh-token", tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });

            res.cookie("access-token", tokens.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });

            return res.sendStatus(204);
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Incorrect password": {
                return res.status(401).json({
                    error: "Login credentials are incorrect.",
                });
            }
            case "User doesn't exist.": {
                return res.status(401).json({
                    error: "Login credentials are incorrect.",
                });
            }
            case "Couldn't issue tokens.": {
                return res.status(500).json({
                    error: "Failed to log in due to an internal error.",
                });
            }
            case "Couldn't search for user.": {
                return res.status(500).json({
                    error: "Failed to log in due to an internal error.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to log in due to an internal error.",
        });
    }
}

/**
 * If requester is guest user, will clear tokens from browser.
 * If requester is logged in user, Will attempt to invalidate user's refresh token and clear user's token cookies.
 * Even if unsuccessful, will delete token cookies from browser.
 */
export async function logout(req: AuthenticatedRequest, res: Response) {
    try {
        // Deleting refresh token is best case scenario, either way, we want to at least delete the tokens
        res.clearCookie("refresh-token");
        res.clearCookie("access-token");

        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        if (req.authenticatedUser.role === "guest") {
            return res
                .status(400)
                .json({ error: "Cannot log out as guest user." });
        }

        const refreshTokenCookie: string | undefined = (req as any).cookies[
            "refresh-token"
        ];
        // In case refresh token was not provided:
        if (refreshTokenCookie === undefined) {
            return res.sendStatus(401);
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
                return res.status(500).json({
                    error: "Failed to log out due to an internal error.",
                });
            }
            case "Refresh token Id is invalid.": {
                return res.status(401).json({
                    error: "Refresh token is invalid.",
                });
            }
            case "Refresh token cookie is invalid.": {
                return res.status(401).json({
                    error: "Refresh token is invalid.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to log out due to an internal error.",
        });
    }
}

export async function me(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            res.sendStatus(401);
            return;
        }

        const result = await AuthService.getUserData(
            req.authenticatedUser.id,
            req.authenticatedUser.role
        );

        if (result.success) {
            const userData = result.data;

            return res.status(200).json({
                data: {
                    displayName: userData.displayName,
                    role: req.authenticatedUser.role,
                    id: req.authenticatedUser.id,
                    createdOn: userData.createdOn,
                    email: userData.email, // note: is undefined in case of guest user!
                },
            });
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "User ID is invalid.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "User's role is invalid": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "Couldn't search for user.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            case "User doesn't exist.": {
                return res.status(500).json({
                    error: "Failed to authenticate due to an internal error.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to authenticate due to an internal error.",
        });
    }
}
