import { ObjectId } from "mongodb";
import * as BoardModel from "../models/board.model.js";
import type { WorldObject } from "../types/board.types.js";
import { baseErr, err, ok } from "../types/result.types.js";

/**
 * @return Boards created by the owner, without {objects, ownerId}, sorted by most recently opened first
 */
export async function getAllBoardsOfUser_WithoutObjects(userId: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    const result = await BoardModel.findBoardsByOwner_WithoutObjects(
        new ObjectId(userId)
    );
    if (result.success) {
        const boards = result.data.map(({ _id, ...rest }) => ({
            id: _id.toString(),
            ...rest,
        }));

        return ok(boards);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "Unknown error.": {
            return err({
                reason: "Couldn't get user's boards due to an unknown error.",
                previousError: error,
            });
        }
        case "Unknown error and unknown type.": {
            return err({
                reason: "Couldn't get user's boards due to an unknown error.",
                previousError: error,
            });
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

/**
 * @return Boards created by the owner, without {objects, ownerId}, sorted by most recently opened first
 */
export async function getAllBoardsOfUser(userId: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }

    const result = await BoardModel.findBoardsByOwner(new ObjectId(userId));
    if (result.success) {
        const boards = result.data.map(({ _id, ...rest }) => ({
            id: _id.toString(),
            ...rest,
        }));

        return ok(boards);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "Unknown error.": {
            return err({
                reason: "Couldn't get user's boards due to an unknown error.",
                previousError: error,
            });
        }
        case "Unknown error and unknown type.": {
            return err({
                reason: "Couldn't get user's boards due to an unknown error.",
                previousError: error,
            });
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

/**
 * @returns Board id and board created on
 */
export async function createBoardForUser(
    userId: string,
    name: string,
    role: string
) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }
    if (name.length == 0) {
        return err({ reason: "Name length is zero." });
    }
    if (name.length > Number(process.env.BOARD_NAME_MAX_LENGTH)) {
        return err({ reason: "Name is too long." });
    }

    if (role === "guest") {
        const createBoardResult = await createBoardIfNoneExist(
            new ObjectId(userId),
            name
        );

        if (!createBoardResult.success) {
            const error = createBoardResult.error;
            const errorReason = error.reason;
            switch (errorReason) {
                case "Couldn't count boards.": {
                    return err({
                        reason: "Couldn't count guest user's boards.",
                        previousError: error,
                    });
                }
                case "Boards exist.": {
                    return err({
                        reason: "Guest user already has boards.",
                        previousError: error,
                    });
                }
                case "Couldn't create board.": {
                    return err({
                        reason: "Couldn't create board.",
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

        const createdBoardId = createBoardResult.data;

        return ok(createdBoardId);
    } else if (role === "user") {
        const createBoardResult = await createBoard(new ObjectId(userId), name);

        if (!createBoardResult.success) {
            const error = createBoardResult.error;
            const errorReason = error.reason;
            switch (errorReason) {
                case "Couldn't create board.": {
                    return err({
                        reason: "Couldn't create board.",
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

        const createdBoardData = createBoardResult.data;

        return ok(createdBoardData);
    } else {
        return err({
            reason: "Unknown user role.",
        });
    }
}

export async function transferOwnershipOfAllBoardsBelongingToUser(
    fromUserId: ObjectId,
    toUserId: ObjectId
) {
    if (fromUserId.equals(toUserId)) {
        return err({
            reason: "From and To users are the same.",
        });
    }

    const result = await BoardModel.updateOwnerOfAllBoards(
        fromUserId,
        toUserId
    );

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "No boards found for the old owner.": {
                return err({
                    reason: "No boards found for the old owner.",
                    previousError: error,
                });
            }
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
                    previousError: error,
                });
            }
            case "Boards were found but not modified.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't transfer ownership of boards.",
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

/**
 * @returns The board, only if it belongs to the user. Returns without ownerId
 */
export async function getBoardByIdForUser(userId: string, boardId: string) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }
    if (!ObjectId.isValid(boardId)) {
        return err({ reason: "Board ID is invalid." });
    }

    const result = await BoardModel.findBoardByIdForUser(
        new ObjectId(userId),
        new ObjectId(boardId)
    );

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;
        switch (errorReason) {
            case "Board not found.": {
                return err({
                    reason: "Board not found for this user.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't get board.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't get board.",
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

    const board = {
        id: result.data._id,
        name: result.data.name,
        createdOn: result.data.createdOn,
        lastOpened: result.data.lastOpened,
        objects: result.data.objects,
    };
    return ok(board);
}

/**
 * Assumes ownerId and name are sanitized.
 * @return Board id and created on.
 */
export async function createBoardIfNoneExist(ownerId: ObjectId, name: string) {
    const countBoardsResult = await BoardModel.countBoardsByOwner(ownerId);
    if (!countBoardsResult.success) {
        const error = countBoardsResult.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Unknown error.": {
                return err({
                    reason: "Couldn't count boards.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't count boards.",
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

    if (countBoardsResult.data > 0) {
        return err({
            reason: "Boards exist.",
        });
    }

    const createBoardResult = await createBoard(ownerId, name);
    if (!createBoardResult.success) {
        const error = createBoardResult.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Couldn't create board.": {
                return err({
                    reason: "Couldn't create board.",
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

    const createdBoardData = createBoardResult.data;
    return ok(createdBoardData);
}

/**
 * Assumes ownerId and name are sanitized.
 * @return The board's id and createdon
 */
export async function createBoard(ownerId: ObjectId, name: string) {
    const now = new Date();
    const board: BoardModel.Board = {
        ownerId: new ObjectId(ownerId),
        name,
        objects: [],
        createdOn: now,
        lastOpened: now,
    };

    const result = await BoardModel.createBoard(board);

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "MongoDB did not acknowledge the operation.": {
                return err({
                    reason: "Couldn't create board.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't create board.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't create board.",
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

    const createdBoardData = { id: result.data, createdOn: board.createdOn };
    return ok(createdBoardData);
}

export async function updateBoardForUser(
    userId: string,
    boardId: string,
    updates: { name?: string; objects?: WorldObject[] }
) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }
    if (!ObjectId.isValid(boardId)) {
        return err({ reason: "Board ID is invalid." });
    }

    // Whenever we add a possible update to the function params, add it to the check here
    if (updates.name === undefined && updates.objects === undefined) {
        return err({ reason: "No updates provided." });
    }

    if (updates.name !== undefined) {
        if (updates.name.length === 0) {
            return err({ reason: "Update name's length is zero." });
        }
        if (
            updates.name.length > Number(process.env.BOARD_NAME_MAX_LENGTH) // todo: all process.env parameters should be loaded on app load, because we could crash here if it wasn't provided, we don't check on app load so this could happen.
        ) {
            return err({ reason: "Update name is too long." });
        }
    }

    if (updates.objects !== undefined) {
        if (updates.objects.length > Number(process.env.BOARD_MAX_OBJECTS)) {
            return err({ reason: "Objects length is too long." });
        }
    }

    const updatePartial: Partial<BoardModel.Board> = {};
    // Whenever we add a possible update to the function params, add it to the partial here
    if (updates.name !== undefined) {
        updatePartial.name = updates.name;
    }
    if (updates.objects !== undefined) {
        updatePartial.objects = updates.objects;
    }

    const result = await BoardModel.updateBoardForOwner(
        new ObjectId(userId),
        new ObjectId(boardId),
        updatePartial
    );

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Failed to update board.": {
                return err({
                    reason: "Couldn't update board.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't update board.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't update board.",
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

export async function upsertWorldObjectsToBoard(
    userId: string,
    boardId: string,
    objects: WorldObject[]
) {
    if (!ObjectId.isValid(userId)) {
        return err({ reason: "User ID is invalid." });
    }
    if (!ObjectId.isValid(boardId)) {
        return err({ reason: "Board ID is invalid." });
    }

    if (objects.length === 0) {
        return err({ reason: "Objects cannot be empty." });
    }

    const result = await BoardModel.upsertWorldObjects(
        new ObjectId(userId),
        new ObjectId(boardId),
        objects,
        Number(process.env.BOARD_MAX_OBJECTS)
    );

    if (!result.success) {
        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "Cannot exceed max object amount.": {
                return err({
                    reason: "Cannot exceed max object amount.",
                    previousError: error,
                });
            }
            case "Couldn't find board for owner.": {
                return err({
                    reason: "Couldn't find board.",
                    previousError: error,
                });
            }
            case "Couldn't update all objects.": {
                return err({
                    reason: "Couldn't update objects.",
                    previousError: error,
                });
            }
            case "Unknown error.": {
                return err({
                    reason: "Couldn't update objects.",
                    previousError: error,
                });
            }
            case "Unknown error and unknown type.": {
                return err({
                    reason: "Couldn't update objects.",
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
