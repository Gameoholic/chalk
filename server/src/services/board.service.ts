import { ObjectId } from "mongodb";
import * as BoardModel from "../models/board.model.js";
import type { WorldObject } from "../types/board.types.js";

export async function getAllBoardsOfUser_WithoutObjects(userId: string) {
    return BoardModel.findBoardsByOwner_WithoutObjects(new ObjectId(userId));
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

    return BoardModel.updateBoardForOwner(
        new ObjectId(userId),
        new ObjectId(boardId),
        updates
    );
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
