import db from "../db/mongo.js";
import { ObjectId, type WithId } from "mongodb";
import { err, ok } from "../types/result.types.js";

const collection = db.collection<RefreshToken>("refresh-tokens");

export interface RefreshToken {
    _id?: ObjectId;
}

/**
 * @returns The refresh token's id
 */
export async function createRefreshToken(refreshToken: RefreshToken) {
    try {
        const result = await collection.insertOne(refreshToken);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        return ok(result.insertedId);
    } catch (error) {
        if (error instanceof Error) {
            return err({
                reason: "Unknown error.",
                previousError: {
                    reason: error.message,
                },
            });
        }
        return err({ reason: "Unknown error and unknown type." });
    }
}

export async function deleteRefreshToken(id: ObjectId) {
    try {
        const query = { _id: id };
        const result = await collection.deleteOne(query);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.deletedCount !== 1) {
            return err({
                reason: "Couldn't find refresh token.",
            });
        }

        return ok(undefined);
    } catch (error) {
        if (error instanceof Error) {
            return err({
                reason: "Unknown error.",
                previousError: {
                    reason: error.message,
                },
            });
        }
        return err({ reason: "Unknown error and unknown type." });
    }
}

export async function findRefreshTokenById(id: ObjectId) {
    try {
        const result = await collection.findOne({ _id: id });

        if (result === null) {
            return err({
                reason: "Couldn't find refresh token.",
            });
        }

        return ok(undefined);
    } catch (error) {
        if (error instanceof Error) {
            return err({
                reason: "Unknown error.",
                previousError: {
                    reason: error.message,
                },
            });
        }
        return err({ reason: "Unknown error and unknown type." });
    }
}
