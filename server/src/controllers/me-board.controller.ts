import type { Response } from "express";
import * as BoardService from "../services/board.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { Vec2, WorldObject } from "../types/board.types.js";
import { ChalkInternalException } from "../types/result.types.js";

export async function getAll(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const result = await BoardService.getAllBoardsOfUser(
        req.authenticatedUser.id
    );

    if (result.success) {
        const boards = result.data;
        return res.status(200).json({ data: boards });
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Couldn't get user's boards due to an unknown error.": {
            throw new ChalkInternalException(
                500,
                "Failed to fetch boards due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function create(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const { name } = req.body;

    if (name === undefined) {
        return res.status(400).json({ error: "Board name required." });
    }

    const result = await BoardService.createBoardForUser(
        req.authenticatedUser.id,
        name,
        req.authenticatedUser.role
    );

    if (result.success) {
        const createdBoardData = result.data;
        const response = {
            id: createdBoardData.id,
            createdOn: createdBoardData.createdOn,
        };
        return res.status(200).json({
            data: response,
        });
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Unknown user role.": {
            throw new ChalkInternalException(
                400,
                "Your role is invalid.",
                error
            );
        }
        case "Name length is zero.": {
            throw new ChalkInternalException(
                400,
                "Board name cannot be empty.",
                error
            );
        }
        case "Name is too long.": {
            throw new ChalkInternalException(
                400,
                "Board name is too long.",
                error
            );
        }
        case "Guest user already has boards.": {
            throw new ChalkInternalException(
                500,
                "You cannot create more than one board as a guest user.",
                error
            );
        }
        case "Couldn't count guest user's boards.": {
            throw new ChalkInternalException(
                500,
                "Failed to create board due to an internal error.",
                error
            );
        }
        case "Couldn't create board.": {
            throw new ChalkInternalException(
                500,
                "Failed to create board due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function getById(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const id = req.params.id as string;
    if (id === undefined) {
        res.status(400).json({ error: "Board id required." });
        return;
    }

    const result = await BoardService.getBoardByIdForUser(
        req.authenticatedUser.id,
        id
    );

    if (result.success) {
        const board = result.data;
        return res.status(200).json({ data: board });
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Board ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "The board ID is invalid.",
                error
            );
        }
        case "Board not found for this user.": {
            throw new ChalkInternalException(404, "Board not found.", error);
        }
        case "Couldn't get board.": {
            throw new ChalkInternalException(
                500,
                "Failed to fetch board due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function deleteById(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const id = req.params.id as string;
    if (id === undefined) {
        res.status(400).json({ error: "Board id required." });
        return;
    }

    const result = await BoardService.deleteBoardByIdForUser(
        req.authenticatedUser.id,
        id
    );

    if (result.success) {
        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Board ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "The board ID is invalid.",
                error
            );
        }
        case "Board not found for this user.": {
            throw new ChalkInternalException(404, "Board not found.", error);
        }
        case "Couldn't delete board.": {
            throw new ChalkInternalException(
                500,
                "Failed to delete board due to an internal error.",
                error
            );
        }
        case "Couldn't get board.": {
            throw new ChalkInternalException(
                500,
                "Failed to delete board due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function updateBoard(req: AuthenticatedRequest, res: Response) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const boardId = req.params.id as string;
    if (boardId === undefined) {
        return res.status(400).json({ error: "Board id required." });
    }

    // Optional parameters to update board with
    const name = req.body.name as string;
    const objects = req.body.objects as WorldObject[]; // todo this check does nothing. so do all these parameter checks in controller. we need to use zod instead.
    const lastCameraPosition = req.body.lastCameraPosition as Vec2;
    const lastCameraZoom = req.body.lastCameraZoom as number;
    const lastOpened = req.body.lastOpened as true;

    const result = await BoardService.updateBoardForUser(
        req.authenticatedUser.id,
        boardId,
        {
            name: name,
            objects: objects,
            lastCameraPosition: lastCameraPosition,
            lastCameraZoom: lastCameraZoom,
            lastOpened: lastOpened,
        }
    );

    if (result.success) {
        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Board ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "The board ID is invalid.",
                error
            );
        }
        case "Couldn't update board.": {
            throw new ChalkInternalException(
                500,
                "Failed to update board due to an internal error.",
                error
            );
        }
        case "No updates provided.": {
            throw new ChalkInternalException(
                400,
                "No fields were provided to update.",
                error
            );
        }
        case "Update name is too long.": {
            throw new ChalkInternalException(400, "Name is too long.", error);
        }
        case "Update name's length is zero.": {
            throw new ChalkInternalException(
                400,
                "Name cannot be empty.",
                error
            );
        }
        case "Objects length is too long.": {
            throw new ChalkInternalException(
                400,
                "Too many objects. Please contact the administrator to have this limit removed.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function updateWorldObjects(
    req: AuthenticatedRequest,
    res: Response
) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const boardId = req.params.id as string;
    if (boardId === undefined) {
        res.status(400).json({ error: "Board id required." });
        return;
    }

    const objects = req.body.objects as WorldObject[];

    if (!Array.isArray(objects)) {
        return res.status(400).json({ error: "Objects invalid." });
    }

    const result = await BoardService.upsertWorldObjectsToBoard(
        req.authenticatedUser.id,
        boardId,
        objects
    );

    if (result.success) {
        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Board ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "The board ID is invalid.",
                error
            );
        }
        case "Objects cannot be empty.": {
            throw new ChalkInternalException(
                400,
                "Objects cannot be empty.",
                error
            );
        }
        case "Cannot exceed max object amount.": {
            throw new ChalkInternalException(
                400,
                "Too many objects. Please contact the administrator to have this limit removed.",
                error
            );
        }
        case "Couldn't find board.": {
            throw new ChalkInternalException(
                404,
                "Couldn't find board.",
                error
            );
        }
        case "Couldn't update objects.": {
            throw new ChalkInternalException(
                500,
                "Failed to update objects due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}

export async function deleteWorldObjects(
    req: AuthenticatedRequest,
    res: Response
) {
    if (!req.authenticatedUser) {
        return res.sendStatus(401);
    }

    const boardId = req.params.id as string;
    if (boardId === undefined) {
        res.status(400).json({ error: "Board id required." });
        return;
    }

    const objectIds = req.body.objectIds as string[];

    if (!Array.isArray(objectIds)) {
        return res.status(400).json({ error: "Object IDs invalid." });
    }

    const result = await BoardService.deleteWorldObjectsFromBoard(
        req.authenticatedUser.id,
        boardId,
        objectIds
    );

    if (result.success) {
        return res.sendStatus(204);
    }

    const error = result.error;
    const errorReason = error.reason;

    switch (errorReason) {
        case "User ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "Your user ID is invalid.",
                error
            );
        }
        case "Board ID is invalid.": {
            throw new ChalkInternalException(
                400,
                "The board ID is invalid.",
                error
            );
        }
        case "Object IDs cannot be empty.": {
            throw new ChalkInternalException(
                400,
                "Object IDs cannot be empty.",
                error
            );
        }
        case "Couldn't find board.": {
            throw new ChalkInternalException(
                404,
                "Couldn't find board.",
                error
            );
        }
        case "Couldn't delete objects.": {
            throw new ChalkInternalException(
                500,
                "Failed to delete objects due to an internal error.",
                error
            );
        }
        default: {
            throw new Error(`Unhandled error: ${errorReason satisfies never}`);
        }
    }
}
