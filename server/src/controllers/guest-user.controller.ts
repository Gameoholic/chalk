import type { Response, Request } from "express";
import * as GuestUserService from "../services/guest-user.service.js";

export async function create(req: Request, res: Response) {
    try {
        const result = await GuestUserService.createGuestUser();

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
            case "Couldn't create guest user.": {
                return res.status(500).json({
                    error: "Failed to create guest user due to an internal error.",
                });
            }
            case "Couldn't issue tokens.": {
                return res.status(500).json({
                    error: "Guest user was created, but access and refresh tokens couldn't be issued due to an internal error.",
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
            error: "Failed to create guest user due to an internal error.",
        });
    }
}
