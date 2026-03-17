import db from "../db/mongo.js";
import { ObjectId, type UpdateFilter } from "mongodb";
import type { Vec2, WorldObject } from "../types/board.types.js";
import { ok, baseErr, type Result, err } from "../types/result.types.js";

const collection = db.collection<Board>("boards");

export interface Board {
    _id?: ObjectId;
    ownerId: ObjectId;
    name: string;
    objects: WorldObject[];
    createdOn: Date;
    lastOpened: Date;
    lastCameraPosition: Vec2;
    lastCameraZoom: number;
}

/**
 * @returns The inserted board's id and createdOn.
 */
export async function createBoard(board: Board) {
    try {
        const result = await collection.insertOne(board);

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

export async function updateBoardForOwner(
    ownerId: ObjectId,
    boardId: ObjectId,
    updates: Partial<Board>
) {
    try {
        const query = { _id: boardId, ownerId: ownerId };
        const updateDoc = { $set: updates };
        const updatedBoard = await collection.findOneAndUpdate(
            query,
            updateDoc,
            {
                returnDocument: "after",
            }
        );

        if (!updatedBoard) {
            return err({
                reason: "Failed to update board.",
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

export async function upsertWorldObjects(
    ownerId: ObjectId,
    boardId: ObjectId,
    objects: WorldObject[],
    maxObjectCount: number
) {
    try {
        if (objects.length === 0) {
            return err({ reason: "No objects provided for update." });
        }

        // Update existing objects (This doesn't change the array length)
        const ops = objects.map((obj) => ({
            updateOne: {
                filter: { _id: boardId, ownerId, "objects.id": obj.id },
                update: { $set: { "objects.$": obj } },
            },
        }));

        // Push new objects ONLY if there is space
        const pushOps = objects.map((obj) => ({
            updateOne: {
                filter: {
                    _id: boardId,
                    ownerId,
                    "objects.id": { $ne: obj.id },
                    // Limit Check: If index [maxObjectCount] exists, the array is full
                    [`objects.${maxObjectCount - 1}`]: { $exists: false },
                },
                update: { $push: { objects: obj } },
            },
        }));

        const result = await collection.bulkWrite([...ops, ...pushOps], {
            ordered: true,
        });

        if (result.matchedCount === 0) {
            return err({ reason: "Couldn't find board for owner." });
        }

        // Every object should trigger exactly ONE match (either updating an existing, or pushing a new).
        // If the matchedCount is less than the number of objects, it means at least one object
        // failed both the update filter AND the push filter (which includes the maxObjectCount limit).
        if (result.matchedCount < objects.length) {
            // We can do the findOne here to give a highly specific error message,
            // but this block will only run if there is actually a failure.
            const currentBoard = await collection.findOne({ _id: boardId });
            if (currentBoard && currentBoard.objects.length >= maxObjectCount) {
                return err({ reason: "Cannot exceed max object amount." });
            }

            // Fallback error if it failed for a reason other than the limit
            return err({ reason: "Couldn't update all objects." });
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

export async function deleteWorldObjects(
    ownerId: ObjectId,
    boardId: ObjectId,
    objectIds: string[]
) {
    try {
        if (objectIds.length === 0) {
            return err({ reason: "No objects provided for deletion." });
        }

        const result = await collection.updateOne(
            { _id: boardId, ownerId },
            { $pull: { objects: { id: { $in: objectIds } } } }
        );

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.matchedCount === 0) {
            return err({ reason: "Couldn't find board for owner." });
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
 * @return Boards created by the owner, without {objects, ownerId}, sorted by most recently opened first
 */
export async function findBoardsByOwner_WithoutObjects(ownerId: ObjectId) {
    try {
        const result = await collection
            .find<{
                _id: ObjectId;
                name: string;
                createdOn: Date;
                lastOpened: Date;
                lastCameraPosition: Vec2;
                lastCameraZoom: number;
            }>(
                { ownerId },
                {
                    projection: {
                        objects: 0,
                        ownerId: 0, // also omit ownerid since it's unnecessary in this context
                    },
                }
            )
            .sort({ lastOpened: -1 }) // most recently opened first
            .toArray();

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

/**
 * @return Boards created by the owner, without {ownerId}, sorted by most recently opened first
 */
export async function findBoardsByOwner(ownerId: ObjectId) {
    try {
        const result = await collection
            .find<{
                _id: ObjectId;
                name: string;
                createdOn: Date;
                lastOpened: Date;
                objects: WorldObject[];
                lastCameraPosition: Vec2;
                lastCameraZoom: number;
            }>(
                { ownerId },
                {
                    projection: {
                        ownerId: 0, // omit ownerid since it's unnecessary in this context
                    },
                }
            )
            .sort({ lastOpened: -1 }) // most recently opened first
            .toArray();

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

export async function updateOwnerOfAllBoards(
    oldOwnerId: ObjectId,
    newOwnerId: ObjectId
) {
    try {
        if (oldOwnerId.id === newOwnerId.id) {
            return err({ reason: "Old owner and new owner are the same." });
        }

        const query = { ownerId: oldOwnerId };
        const updateDoc = { $set: { ownerId: newOwnerId } };

        const result = await collection.updateMany(query, updateDoc);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.matchedCount === 0) {
            return err({
                reason: "No boards found for the old owner.",
            });
        }
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

    return ok(undefined);
}

/**
 * @returns Without ownerId
 */
export async function findBoardByIdForUser(
    ownerId: ObjectId,
    boardId: ObjectId
) {
    try {
        const result = await collection.findOne<{
            _id: ObjectId;
            name: string;
            createdOn: Date;
            lastOpened: Date;
            objects: WorldObject[];
            lastCameraPosition: Vec2;
            lastCameraZoom: number;
        }>(
            {
                _id: boardId,
                ownerId,
            },
            {
                projection: {
                    ownerId: 0, // omit ownerId
                },
            }
        );

        if (!result) {
            return err({ reason: "Board not found." });
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

/**
 * Deletes a specific board for the owner.
 */
export async function deleteBoardByIdForUser(
    ownerId: ObjectId,
    boardId: ObjectId
) {
    try {
        const query = { _id: boardId, ownerId: ownerId };
        const result = await collection.deleteOne(query);

        if (!result.acknowledged) {
            return err({
                reason: "MongoDB did not acknowledge the operation.",
            });
        }

        if (result.deletedCount === 0) {
            return err({ reason: "Board not found." });
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

export async function countBoardsByOwner(ownerId: ObjectId) {
    try {
        const result = await collection.countDocuments({ ownerId });

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
