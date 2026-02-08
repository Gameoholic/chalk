import db from "../db/mongo.js";
import { ObjectId, type UpdateFilter } from "mongodb";
import type { WorldObject } from "../types/board.types.js";

const collection = db.collection<Board>("boards");

export interface Board {
    _id?: ObjectId;
    ownerId: ObjectId;
    name: string;
    objects: WorldObject[];
    createdOn: Date;
    lastOpened: Date;
}

export async function createBoard(board: Board) {
    const result = await collection.insertOne(board);
    return result;
}

export async function updateBoard(id: string, updates: Partial<Board>) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: updates };
    const result = await collection.updateOne(query, updateDoc);
    return result;
}

export function findBoardByOwnerAndId(ownerId: ObjectId, boardId: ObjectId) {
    return collection.findOne({ _id: boardId, ownerId });
}

export async function updateBoardForOwner(
    ownerId: ObjectId,
    boardId: ObjectId,
    updates: Partial<Board>
) {
    const query = { _id: boardId, ownerId };
    const updateDoc = { $set: updates };

    return collection.findOneAndUpdate(query, updateDoc, {
        returnDocument: "after",
    });
}

export async function upsertWorldObjects(
    ownerId: ObjectId,
    boardId: ObjectId,
    objects: WorldObject[]
) {
    const ops = objects.map((obj) => ({
        updateOne: {
            filter: { _id: boardId, ownerId, "objects.id": obj.id },
            update: { $set: { "objects.$": obj } },
        },
    }));

    const pushOps = objects.map((obj) => ({
        updateOne: {
            filter: { _id: boardId, ownerId, "objects.id": { $ne: obj.id } },
            update: { $push: { objects: obj } },
        },
    }));

    return collection.bulkWrite([...ops, ...pushOps]);
}

export async function deleteBoard(id: string) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const query = { _id: new ObjectId(id) };
    const result = await collection.deleteOne(query);
    return result;
}

export async function findBoardById(id: string) {
    if (!ObjectId.isValid(id)) throw new Error("Invalid ID");
    const result = await collection.findOne({ _id: new ObjectId(id) });
    return result;
}

export async function findBoardsByOwner_WithoutObjects(ownerId: ObjectId) {
    return collection
        .find(
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
}

export async function findBoardsByOwner_WithObjects(ownerId: ObjectId) {
    return collection
        .find(
            { ownerId },
            {
                projection: {
                    ownerId: 0, // omit ownerid since it's unnecessary in this context
                },
            }
        )
        .sort({ lastOpened: -1 }) // most recently opened first
        .toArray();
}

export async function updateOwnerOfAllBoards(
    oldOwnerId: ObjectId,
    newOwnerId: ObjectId
) {
    const query = { ownerId: oldOwnerId };
    const updateDoc = { $set: { ownerId: newOwnerId } };

    return collection.updateMany(query, updateDoc);
}

export async function findBoardsByOwner(ownerId: ObjectId) {
    return collection.find({ ownerId }).toArray();
}

export async function findBoardByIdForUser(
    ownerId: ObjectId,
    boardId: ObjectId
): Promise<Board | null> {
    return collection.findOne({ _id: new ObjectId(boardId), ownerId });
}

export async function findBoardByEmail(email: string) {
    return collection.findOne({ email });
}

export async function countBoardsByOwner(ownerId: ObjectId): Promise<number> {
    return collection.countDocuments({ ownerId });
}
