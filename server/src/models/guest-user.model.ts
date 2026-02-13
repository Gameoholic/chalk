import db from "../db/mongo.js";
import { ObjectId } from "mongodb";
import { err, ok } from "../types/result.types.js";

const collection = db.collection<GuestUser>("guest-users");

export interface GuestUser {
    _id?: ObjectId;
    displayName: string;
}

/**
 * @returns The guest user's id
 */
export async function createGuestUser(guestUser: GuestUser) {
    try {
        const result = await collection.insertOne(guestUser);

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

export async function updateGuestUser(
    id: ObjectId,
    updates: Partial<GuestUser>
) {
    try {
        const query = { _id: new ObjectId(id) };
        const updateDoc = { $set: updates };
        const result = await collection.updateOne(query, updateDoc);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.matchedCount !== 1) {
            return err({
                reason: "Couldn't find user.",
            });
        }

        if (result.modifiedCount !== 1) {
            return err({
                reason: "Couldn't update user.",
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

export async function deleteGuestUser(id: ObjectId) {
    try {
        const query = { _id: new ObjectId(id) };
        const result = await collection.deleteOne(query);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.deletedCount !== 1) {
            return err({
                reason: "Couldn't find guest user.",
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

/**
 * @returns Properties of user without {id}, error if not found
 */
export async function findGuestUserById(id: ObjectId) {
    try {
        const result = await collection.findOne({ _id: id });

        if (result === null) {
            return err({
                reason: "Couldn't find user.",
            });
        }

        return ok({ displayName: result.displayName });
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
