import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const token = await AuthService.login(email, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        }).sendStatus(200);
    } catch (err) {
        res.status(401).json({ error: "Invalid credentials" });
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
