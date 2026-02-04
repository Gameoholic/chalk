import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as UserModel from "../models/user.model.js";
import * as GuestUserModel from "../models/guest-user.model.js";
import * as RefreshTokenModel from "../models/refresh-token.model.js";
import { ObjectId, type WithId } from "mongodb";
import type { StringValue } from "ms";

export async function login(email: string, password: string) {
    const user = await UserModel.findUserByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    return jwt.sign(
        { id: user._id.toString(), email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "5m" }
    );
}

export async function guestLogin(id: string) {
    // const guestUser = await GuestUserModel.findGuestUserById(id);
    // if (!guestUser) throw new Error("Invalid credentials");
}

export interface AccessTokenPayload extends JwtPayload {
    id: string;
    role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
    id: string;
    userId: string;
    userRole: string;
}

/**
 * @returns Whether the token is valid for requests or not (treats expired tokens as invalid)
 */
export function verifyAccessToken(
    accessToken: string | undefined
): { valid: true; payload: AccessTokenPayload } | { valid: false } {
    let payload: any;
    try {
        payload = jwt.verify(
            accessToken!,
            process.env.JWT_SECRET!
        ) as AccessTokenPayload;
    } catch (err) {
        return { valid: false };
    }

    if (!payload.id || !payload.role) {
        throw new Error("Token parameters invalid");
    }
    return { valid: true, payload: payload };
}

export async function refreshTokens(refreshToken: string): Promise<{
    refreshToken: string;
    accessToken: string;
    userId: string;
    userRole: string;
}> {
    // Is refresh token valid?
    let oldRefreshTokenPayload: RefreshTokenPayload;
    try {
        oldRefreshTokenPayload = jwt.verify(
            refreshToken!,
            process.env.JWT_SECRET!
        ) as RefreshTokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error("Refresh token expired");
        }
        throw new Error("Refresh token invalid");
    }

    if (
        !oldRefreshTokenPayload.id ||
        !oldRefreshTokenPayload.userId ||
        !oldRefreshTokenPayload.userRole
    ) {
        // todo do we even need this check?
        throw new Error("Token parameters invalid");
    }

    const oldRefreshTokenId: ObjectId = new ObjectId(oldRefreshTokenPayload.id);
    // Now we check if refresh token is in the database
    const refreshTokenDb: WithId<RefreshTokenModel.RefreshToken> | null =
        await RefreshTokenModel.findRefreshTokenById(oldRefreshTokenId);
    if (!refreshTokenDb) {
        throw new Error("Refresh token not found");
    }

    // Refresh token cycling: Remove the refresh token
    const deleteResult =
        await RefreshTokenModel.deleteRefreshToken(oldRefreshTokenId);
    if (deleteResult.deletedCount !== 1) {
        throw new Error("Error deleting refresh token");
    }
    // Refresh token cycling: Generate new refresh token
    const newRefreshToken = await issueRefreshToken(
        oldRefreshTokenPayload.userId,
        oldRefreshTokenPayload.userRole
    );

    // Issue new access token
    const newAccessToken = jwt.sign(
        {
            id: oldRefreshTokenPayload.userId,
            role: oldRefreshTokenPayload.userRole,
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY! as StringValue }
    );

    return {
        refreshToken: newRefreshToken,
        accessToken: newAccessToken,
        userId: oldRefreshTokenPayload.userId,
        userRole: oldRefreshTokenPayload.userRole,
    };
}

// To be used when logging in via password
export async function issueRefreshToken(
    userId: string,
    userRole: string
): Promise<string> {
    const newRefreshTokenId = (await RefreshTokenModel.createRefreshToken({}))
        .insertedId;

    // Issue new refresh token
    const newRefreshToken = jwt.sign(
        {
            id: newRefreshTokenId,
            userId: userId,
            userRole: userRole,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn:
                userRole === "guest"
                    ? (process.env.REFRESH_TOKEN_EXPIRY_GUEST! as StringValue)
                    : (process.env.REFRESH_TOKEN_EXPIRY! as StringValue),
        }
    );

    return newRefreshToken;
}

export async function getUserData(userId: string, userRole: string) {
    if (!ObjectId.isValid(userId)) {
        throw new Error("Invalid user id");
    }
    const userIdCast = new ObjectId(userId);
    let displayName: string | undefined;
    if (userRole === "guest") {
        displayName = (await GuestUserModel.findGuestUserById(userIdCast))
            ?.displayName;
    }
    if (displayName === undefined) {
        throw new Error("User not found");
    }

    return { displayName: displayName };
}
