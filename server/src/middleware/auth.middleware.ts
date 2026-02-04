import type { NextFunction, Response, Request } from "express";
import crypto from "crypto";
import * as AuthService from "../services/auth.service.js";

export interface AuthenticatedRequest extends Request {
    authenticatedUser?: {
        id: string;
        role: string;
    };
}

/**
 * If access token is valid: Forward the request.
 * If access token is invalid, expired, or doesn't exist: Issue new access and refresh token based on the refresh token's payload.
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
    if (accessTokenVerificationResult.valid) {
        const payload = accessTokenVerificationResult.payload;
        req.authenticatedUser = {
            id: payload.id,
            role: payload.role,
        };
        next();
        return;
    }
    // If access token is invalid, expired, or wasn't provided, refresh tokens:
    let newTokens: {
        refreshToken: string;
        accessToken: string;
        userId: string;
        userRole: string;
    };
    try {
        newTokens = await AuthService.refreshTokens(
            (req as any).cookies["refresh-token"]
        );
    } catch (err) {
        res.status(401).json({ error: "Couldn't refresh tokens." });
        return;
    }

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
    next();
}
