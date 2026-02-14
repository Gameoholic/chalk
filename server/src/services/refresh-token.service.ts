import { ObjectId } from "mongodb";
import { err, ok } from "../types/result.types.js";
import * as RefreshTokenModel from "../models/refresh-token.model.js";

export async function deleteRefreshToken(refreshTokenId: string) {
    if (!ObjectId.isValid(refreshTokenId)) {
        return err({ reason: "Refresh token Id is invalid." });
    }

    const deleteTokenResult = await RefreshTokenModel.deleteRefreshToken(
        new ObjectId(refreshTokenId)
    );

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
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't delete refresh token.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't delete refresh token.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't delete refresh token.",
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

export async function createRefreshToken() {
    const createRefreshTokenResult = await RefreshTokenModel.createRefreshToken(
        {}
    );

    if (!createRefreshTokenResult.success) {
        const error = createRefreshTokenResult.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't create refresh token.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't create refresh token.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't create refresh token.",
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

    return ok(refreshTokenId);
}
