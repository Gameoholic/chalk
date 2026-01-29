import type { Request, Response } from "express";
import * as AuthService from "../services/auth.service.js";

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        const token = await AuthService.login(email, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        })
            .status(200)
            .json({ success: true });
    } catch (err) {
        res.status(401).json({ error: "Invalid credentials" });
    }
}
