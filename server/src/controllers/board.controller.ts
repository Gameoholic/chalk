import type { Response } from "express";
import * as BoardService from "../services/board.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { Vec2, WorldObject } from "../types/board.types.js";

export async function getAll(req: AuthenticatedRequest, res: Response) {
    try {
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
                return res.status(400).json({
                    error: "Your user ID is invalid.",
                });
            }
            case "Couldn't get user's boards due to an unknown error.": {
                return res.status(500).json({
                    error: "Failed to fetch boards due to an internal error.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to fetch boards due to an internal error.",
        });
    }
}

export async function create(req: AuthenticatedRequest, res: Response) {
    try {
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
                return res.status(400).json({
                    error: "Your user ID is invalid.",
                });
            }
            case "Unknown user role.": {
                return res.status(400).json({
                    error: "Your role is invalid.",
                });
            }
            case "Name length is zero.": {
                return res.status(400).json({
                    error: "Board name cannot be empty.",
                });
            }
            case "Name is too long.": {
                return res.status(400).json({
                    error: "Board name is too long.",
                });
            }
            case "Guest user already has boards.": {
                return res.status(500).json({
                    error: "You cannot create more than one board as a guest user.",
                });
            }
            case "Couldn't count guest user's boards.": {
                return res.status(500).json({
                    error: "Failed to create board due to an internal error.",
                });
            }
            case "Couldn't create board.": {
                return res.status(500).json({
                    error: "Failed to create board due to an internal error.",
                });
            }

            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to create board due to an internal error.",
        });
    }
}

export async function getById(req: AuthenticatedRequest, res: Response) {
    try {
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
                return res.status(400).json({
                    error: "Your user ID is invalid.",
                });
            }
            case "Board ID is invalid.": {
                return res.status(400).json({
                    error: "The board ID is invalid.",
                });
            }
            case "Board not found for this user.": {
                return res.status(404).json({
                    error: "Board not found.",
                });
            }
            case "Couldn't get board.": {
                return res.status(500).json({
                    error: "Failed to fetch board due to an internal error.",
                });
            }

            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to fetch board due to an internal error.",
        });
    }
}

export async function updateBoard(req: AuthenticatedRequest, res: Response) {
    try {
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

        const result = await BoardService.updateBoardForUser(
            req.authenticatedUser.id,
            boardId,
            {
                name: name,
                objects: objects,
                lastCameraPosition: lastCameraPosition,
                lastCameraZoom: lastCameraZoom,
            }
        );

        if (result.success) {
            return res.sendStatus(204);
        }

        const error = result.error;
        const errorReason = error.reason;

        switch (errorReason) {
            case "User ID is invalid.": {
                return res.status(400).json({
                    error: "Your user ID is invalid.",
                });
            }
            case "Board ID is invalid.": {
                return res.status(400).json({
                    error: "The board ID is invalid.",
                });
            }
            case "Couldn't update board.": {
                return res.status(500).json({
                    error: "Failed to update board due to an internal error.",
                });
            }
            case "No updates provided.": {
                return res.status(400).json({
                    error: "No fields were provided to update.",
                });
            }
            case "Update name is too long.": {
                return res.status(400).json({
                    error: "Name is too long.",
                });
            }
            case "Update name's length is zero.": {
                return res.status(400).json({
                    error: "Name cannot be empty.",
                });
            }
            case "Objects length is too long.": {
                return res.status(400).json({
                    error: "Too many objects. Please contact the administrator to have this limit removed.",
                });
            }

            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to update board due to an internal error.",
        });
    }
}

export async function updateWorldObjects(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
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
                return res.status(400).json({
                    error: "Your user ID is invalid.",
                });
            }
            case "Board ID is invalid.": {
                return res.status(400).json({
                    error: "The board ID is invalid.",
                });
            }
            case "Objects cannot be empty.": {
                return res.status(400).json({
                    error: "Objects cannot be empty.",
                });
            }
            case "Cannot exceed max object amount.": {
                return res.status(400).json({
                    error: "Too many objects. Please contact the administrator to have this limit removed.",
                });
            }
            case "Couldn't find board.": {
                return res.status(404).json({
                    error: "Couldn't find board.",
                });
            }
            case "Couldn't update objects.": {
                return res.status(500).json({
                    error: "Failed to update objects due to an internal error.",
                });
            }
            default: {
                throw new Error(
                    `Unhandled error: ${errorReason satisfies never}`
                );
            }
        }
    } catch (err) {
        return res.status(500).json({
            error: "Failed to update objects due to an internal error.",
        });
    }
}
