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
                .json({ error: "Not all arguments provided" });
        }

        const tokens = await AuthService.login(email, password);

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
        return res.sendStatus(201);
    } catch (err) {
        res.status(500).json({ error: "Failed to log in" });
    }
}

export async function me(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        res.sendStatus(401);
        return;
    }
    try {
        const userData = await AuthService.getUserData(
            req.authenticatedUser.id,
            req.authenticatedUser.role
        );
        res.status(200).json({
            displayName: userData.displayName,
            role: req.authenticatedUser.role,
            id: req.authenticatedUser.id,
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
    return;
}
