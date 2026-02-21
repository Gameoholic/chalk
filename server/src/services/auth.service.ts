import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as GuestUserService from "../services/guest-user.service.js";
import * as RefreshTokenService from "../services/refresh-token.service.js";
import * as UserService from "../services/user.service.js";
import { ObjectId, type WithId } from "mongodb";
import * as AuthService from "../services/auth.service.js";
import type { StringValue } from "ms";
import { err, ok } from "../types/result.types.js";

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
export function verifyAccessToken(accessToken: string | undefined) {
    let payload: any;
    try {
        payload = jwt.verify(
            accessToken!,
            process.env.JWT_SECRET!
        ) as AccessTokenPayload;
    } catch (error) {
        return err({ reason: "Access token invalid." });
    }

    // todo: eventually with zod, check that these are strings.
    if (!payload.id || !payload.role) {
        return err({ reason: "Access token invalid." });
    }
    return ok(payload);
}

export async function refreshTokens(refreshToken: string) {
    let oldRefreshTokenPayload: RefreshTokenPayload;

    // Is refresh token valid?
    try {
        oldRefreshTokenPayload = jwt.verify(
            refreshToken!,
            process.env.JWT_SECRET!
        ) as RefreshTokenPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return err({ reason: "Refresh token expired." });
        }
        return err({ reason: "Refresh token invalid." });
    }

    if (
        !oldRefreshTokenPayload.id ||
        !oldRefreshTokenPayload.userId ||
        !oldRefreshTokenPayload.userRole
    ) {
        return err({ reason: "Refresh token parameters invalid." });
    }

    if (!ObjectId.isValid(oldRefreshTokenPayload.id)) {
        return err({ reason: "Refresh token id is invalid." });
    }

    // Now we check if refresh token is in the database, and we delete it if it is
    const deleteRefreshTokenResult =
        await RefreshTokenService.deleteRefreshToken(oldRefreshTokenPayload.id);

    if (!deleteRefreshTokenResult.success) {
        const error = deleteRefreshTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't find refresh token.": {
                return err({
                    reason: "Couldn't find refresh token in the database.",
                    previousError: error,
                });
            }
            case "Couldn't delete refresh token.": {
                return err({
                    reason: "Couldn't search for/delete old refresh token.",
                    previousError: error,
                });
            }
            case "Refresh token Id is invalid.": {
                return err({
                    reason: "Couldn't search for/delete old refresh token.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    // Refresh token cycling: Generate new refresh token
    const newRefreshTokenResult = await issueRefreshToken(
        oldRefreshTokenPayload.userId,
        oldRefreshTokenPayload.userRole
    );

    if (!newRefreshTokenResult.success) {
        const error = newRefreshTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't issue refresh token.": {
                return err({
                    reason: "Couldn't generate new refresh token.",
                    previousError: error,
                });
            }
            case "User ID is invalid.": {
                return err({
                    reason: "Old refresh token's user ID is invalid.",
                    previousError: error,
                });
            }
            case "User's role is invalid.": {
                return err({
                    reason: "Old refresh token's user role is invalid.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const newRefreshToken = newRefreshTokenResult.data;

    // todo
    //If anything fails after deletion (DB hiccup, signing error, process crash), the user is now logged out permanently.
    // Mongo supports transactions if you’re on a replica set — worth it here.

    // Issue new access token
    const newAccessToken = jwt.sign(
        {
            id: oldRefreshTokenPayload.userId,
            role: oldRefreshTokenPayload.userRole,
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY! as StringValue }
    );

    const tokens = {
        refreshToken: newRefreshToken,
        accessToken: newAccessToken,
        userId: oldRefreshTokenPayload.userId,
        userRole: oldRefreshTokenPayload.userRole,
    };
    return ok(tokens);
}

export async function issueRefreshToken(userId: string, userRole: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }
    if (userRole !== "guest" && userRole !== "user") {
        return err({ reason: "User's role is invalid." });
    }

    const createRefreshTokenResult =
        await RefreshTokenService.createRefreshToken();

    if (!createRefreshTokenResult.success) {
        const error = createRefreshTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't create refresh token.": {
                return err({
                    reason: "Couldn't issue refresh token.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const refreshTokenId = createRefreshTokenResult.data.toString();

    // Issue new refresh token
    const newRefreshToken = jwt.sign(
        {
            id: refreshTokenId,
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

    return ok(newRefreshToken);
}

/**
 * Creates access and refresh tokens. Should be used when logging in or creating an account, not for refreshing tokens.
 */
export async function issueNewTokens(userId: string, userRole: string) {
    // Generate initial refresh token, to be immediately replaced by later refresh tokens call
    const issueRefreshTokenResult = await AuthService.issueRefreshToken(
        userId,
        userRole
    );

    if (!issueRefreshTokenResult.success) {
        const error = issueRefreshTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "User ID is invalid.": {
                return err({
                    reason: "User ID is invalid.",
                    previousError: error,
                });
            }
            case "User's role is invalid.": {
                return err({
                    reason: "User's role is invalid.",
                    previousError: error,
                });
            }
            case "Couldn't issue refresh token.": {
                return err({
                    reason: "Couldn't issue initial refresh token.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const initialRefreshToken = issueRefreshTokenResult.data;

    const refreshTokensResult =
        await AuthService.refreshTokens(initialRefreshToken); // We do this because we need an access token

    if (!refreshTokensResult.success) {
        const error = refreshTokensResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't search for/delete old refresh token.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Couldn't generate new refresh token.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Refresh token expired.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Refresh token id is invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Refresh token invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Refresh token parameters invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Couldn't find refresh token in the database.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Old refresh token's user ID is invalid.": {
                return err({
                    reason: "User ID is invalid.",
                    previousError: error,
                });
            }
            case "Old refresh token's user role is invalid.": {
                return err({
                    reason: "User's role is invalid.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }
    const tokens = refreshTokensResult.data;

    return ok(tokens);
}

/**
 * @returns Data for user/guest user (displayname and createdOn)
 */
export async function getUserData(userId: string, userRole: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    if (userRole === "guest") {
        const guestUserData = await getUserData_guest(userId);
        if (guestUserData.success) {
            return ok({ ...guestUserData.data, email: undefined }); // users have email field, and this method must return the same success type. might rewrite this in the future but ok for now
        }
        return guestUserData;
    } else if (userRole === "user") {
        return getUserData_user(userId);
    } else {
        return err({ reason: "User's role is invalid" });
    }
}

async function getUserData_guest(userId: string) {
    const getGuestUserResult = await GuestUserService.getGuestUserById(userId);

    if (!getGuestUserResult.success) {
        const error = getGuestUserResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't search for user.": {
                return err({
                    reason: "Couldn't search for user.",
                    previousError: error,
                });
            }
            case "Guest user ID is invalid.": {
                return err({
                    reason: "User ID is invalid.",
                    previousError: error,
                });
            }
            case "User doesn't exist.": {
                return err({
                    reason: "User doesn't exist.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const userData = getGuestUserResult.data;

    return ok({
        displayName: userData.displayName,
        createdOn: userData.createdOn,
    });
}

async function getUserData_user(userId: string) {
    const getUserResult = await UserService.getUserById(userId);

    if (!getUserResult.success) {
        const error = getUserResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't search for user.": {
                return err({
                    reason: "Couldn't search for user.",
                    previousError: error,
                });
            }
            case "User ID is invalid.": {
                return err({
                    reason: "User ID is invalid.",
                    previousError: error,
                });
            }
            case "User doesn't exist.": {
                return err({
                    reason: "User doesn't exist.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const userData = getUserResult.data;

    return ok({
        displayName: userData.displayName,
        createdOn: userData.createdOn,
        email: userData.email,
    });
}

export async function login(email: string, password: string) {
    const getUserResult = await UserService.getUserByEmail(email);

    if (!getUserResult.success) {
        const error = getUserResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "User doesn't exist.": {
                return err({
                    reason: "User doesn't exist.",
                    previousError: error,
                });
            }
            case "Couldn't search for user.": {
                return err({
                    reason: "Couldn't search for user.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const user = getUserResult.data;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return err({ reason: "Incorrect password" });
    }

    const issueTokensResult = await issueNewTokens(user.id, "user");

    if (!issueTokensResult.success) {
        const error = issueTokensResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't issue initial refresh token.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "Couldn't issue tokens.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "User ID is invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            case "User's role is invalid.": {
                return err({
                    reason: "Couldn't issue tokens.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    const tokens = issueTokensResult.data;

    return ok(tokens);
}

/**
 * Removes the user's refresh token
 * Only for user, not guest user
 */
export async function logout(refreshTokenId: string) {
    if (!ObjectId.isValid(refreshTokenId)) {
        return err({ reason: "Refresh token Id is invalid." });
    }

    const deleteTokenResult =
        await RefreshTokenService.deleteRefreshToken(refreshTokenId);

    if (!deleteTokenResult.success) {
        const error = deleteTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Couldn't find refresh token.": {
                return err({
                    reason: "Couldn't find refresh token.",
                    previousError: error,
                });
            }
            case "Couldn't delete refresh token.": {
                return err({
                    reason: "Couldn't delete refresh token.",
                    previousError: error,
                });
            }
            case "Refresh token Id is invalid.": {
                return err({
                    reason: "Refresh token Id is invalid.",
                    previousError: error,
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    }

    return ok(undefined);
}
