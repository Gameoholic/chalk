import type { NextFunction, Response, Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export default function cookieJwtAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token: string = (req as any).cookies.token;
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as JwtPayload & {
            id: string;
            username: string;
            metadata: string;
        };
        console.log("Verified user " + payload.id);
        next();
    } catch (err) {
        res.clearCookie("token");
        return res.redirect("/");
    }
}
