import { ObjectId } from "mongodb";
import * as BoardModel from "../models/board.model.js";
import type { WorldObject } from "../types/board.types.js";

export async function getAllBoardsOfUser_WithoutObjects(userId: string) {
    return BoardModel.findBoardsByOwner_WithoutObjects(new ObjectId(userId));
}

export async function getAllBoardsOfUser(userId: string) {
    return BoardModel.findBoardsByOwner(new ObjectId(userId));
}

export async function transferOwnershipOfAllBoardsOfUser(
    fromUserId: string,
    toUserId: string
) {
    if (!ObjectId.isValid(fromUserId) || !ObjectId.isValid(toUserId)) {
        throw new Error("Invalid User IDs provided for transfer");
    }

    const result = await BoardModel.updateOwnerOfAllBoards(
        new ObjectId(fromUserId),
        new ObjectId(toUserId)
    );

    return result.modifiedCount;
}

export async function getBoardByIdForUser(userId: string, boardId: string) {
    if (!ObjectId.isValid(boardId)) throw new Error("Invalid board ID");
    const board = await BoardModel.findBoardByIdForUser(
        new ObjectId(userId),
        new ObjectId(boardId)
    );
    if (!board) throw new Error("Board not found or you do not have access");
    return board;
}

export async function createBoardForUser(
    userId: string,
    name: string,
    role: string
): Promise<BoardModel.Board> {
    if (role === "guest") {
        return await createBoardIfNoneExist(userId, name);
    } else {
        return await createBoard(userId, name);
    }
}

export async function createBoardIfNoneExist(
    ownerId: string,
    name: string
): Promise<BoardModel.Board> {
    if ((await BoardModel.countBoardsByOwner(new ObjectId(ownerId))) > 0) {
        throw new Error("Boards exist.");
    }

    return await createBoard(ownerId, name);
}

export async function createBoard(
    ownerId: string,
    name: string
): Promise<BoardModel.Board> {
    const now = new Date();
    const board: BoardModel.Board = {
        ownerId: new ObjectId(ownerId),
        name,
        objects: [],
        createdOn: now,
        lastOpened: now,
    };

    await BoardModel.createBoard(board);
    return board;
}

export async function updateBoard(
    id: string,
    updates: Partial<BoardModel.Board>
) {
    return BoardModel.updateBoard(id, updates);
}

export async function deleteBoard(id: string) {
    return BoardModel.deleteBoard(id);
}

export async function updateBoardForUser(
    userId: string,
    boardId: string,
    updates: Partial<BoardModel.Board>
) {
    if (!ObjectId.isValid(boardId)) {
        throw new Error("Invalid board id");
    }

    // Only allow specific fields
    const allowedFields = ["name"];
    const filteredUpdates: Partial<BoardModel.Board> = {};

    for (const key of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            if (key === "name") {
                const name = (updates.name as string)?.trim();
                if (!name) throw new Error("Board name cannot be empty.");
                if (name.length > 32)
                    throw new Error("Board name cannot exceed 32 characters.");
                filteredUpdates.name = name;
            }
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error("No valid fields to update. Only 'name' is allowed.");
    }

    const result = await BoardModel.updateBoardForOwner(
        new ObjectId(userId),
        new ObjectId(boardId),
        filteredUpdates
    );

    return result;
}

export async function upsertWorldObjectsToBoard(
    userId: string,
    boardId: string,
    objects: WorldObject[]
) {
    if (!ObjectId.isValid(boardId)) throw new Error("Invalid board id");

    const board = await BoardModel.findBoardByOwnerAndId(
        new ObjectId(userId),
        new ObjectId(boardId)
    );
    if (!board) throw new Error("Board not found");

    // Call model to perform upsert
    const result = await BoardModel.upsertWorldObjects(
        new ObjectId(userId),
        new ObjectId(boardId),
        objects
    );

    // Check that all objects were upserted
    const upsertedOrModifiedCount =
        (result.modifiedCount || 0) + (result.upsertedCount || 0);
    if (upsertedOrModifiedCount !== objects.length) {
        throw new Error(
            `Only ${upsertedOrModifiedCount} of ${objects.length} objects were upserted`
        );
    }

    // Return updated board
    return BoardModel.findBoardByOwnerAndId(
        new ObjectId(userId),
        new ObjectId(boardId)
    );
}
