import db from "../db/mongo.js";
import { ObjectId } from "mongodb";
import { err, ok } from "../types/result.types.js";

const collection = db.collection("users");

export interface User {
    _id?: ObjectId;
    email: string;
    password: string;
    createdOn: Date;
    displayName: string;
}

export async function createUser(user: User) {
    try {
        const result = await collection.insertOne(user);

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

export async function updateUser(id: ObjectId, updates: Partial<User>) {
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

/**
 * @returns User's displayname, email, createdOn and hashed password
 */
export async function findUserById(id: ObjectId) {
    try {
        const result = await collection.findOne<{
            email: string;
            password: string;
            displayName: string;
            createdOn: Date;
        }>({ _id: id });

        if (result === null) {
            return err({
                reason: "Couldn't find user.",
            });
        }

        return ok({
            displayName: result.displayName,
            email: result.email,
            password: result.password,
            createdOn: result.createdOn,
        });
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
 * @returns User's displayname, id and hashed password
 */
export async function findUserByEmail(email: string) {
    try {
        const result = await collection.findOne<{
            _id: ObjectId;
            password: string;
            displayName: string;
        }>({ email });

        if (result === null) {
            return err({
                reason: "Couldn't find user.",
            });
        }

        return ok(result);
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
