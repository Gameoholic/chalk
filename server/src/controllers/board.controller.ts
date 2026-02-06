import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import * as BoardService from "../services/board.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { WorldObject } from "../types/board.types.js";

export async function getAll(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }
        const boards = await BoardService.getAllBoardsOfUser_WithoutObjects(
            req.authenticatedUser.id
        );

        // Change _id to id
        const response = boards.map(({ _id, ...rest }) => ({
            id: _id!.toString(),
            ...rest,
        }));

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch boards" });
    }
}

export async function create(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        const { name } = req.body;

        if (!name) {
            res.status(400).json({ error: "Board name required." });
            return;
        }

        const board = await BoardService.createBoardForUser(
            req.authenticatedUser.id,
            name,
            req.authenticatedUser.role
        );

        res.status(200).json({ id: board._id, name: board.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create board" });
    }
}

export async function getById(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
            return;
        }

        const id = req.params.id as string;
        if (!id) {
            res.status(400).json({ error: "Board id required." });
            return;
        }
        const board = await BoardService.getBoardByIdForUser(
            req.authenticatedUser.id,
            id
        );
        if (!board) {
            res.status(404).json({ error: "Board not found" });
            return;
        }

        // change _id to id
        const response = { id: board._id!.toString(), ...board };

        res.status(200).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch board" });
    }
}

export async function updateBoard(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        const boardId = req.params.id as string;
        if (!boardId) {
            return res.status(400).json({ error: "Board id required." });
        }

        const updates = req.body;

        try {
            const updated = await BoardService.updateBoardForUser(
                req.authenticatedUser.id,
                boardId,
                updates
            );

            if (!updated) {
                return res.status(404).json({ error: "Board not found" });
            }

            res.status(200).json(updated);
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update board" });
    }
}

export async function upsertWorldObjects(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        if (!req.authenticatedUser) {
            return res.sendStatus(401);
        }

        const boardId = req.params.id as string;
        const objects = req.body.objects as WorldObject[];

        if (!Array.isArray(objects) || objects.length === 0) {
            return res.status(400).json({ error: "World objects required." });
        }

        const result = await BoardService.upsertWorldObjectsToBoard(
            req.authenticatedUser.id,
            boardId,
            objects
        );

        if (!result) {
            return res.status(404).json({ error: "Board not found" });
        }

        res.status(200).json({ success: true });
    } catch (err) {
        return res
            .status(500)
            .json({ error: "Couldn't upserts all world objects." });
    }
}

// export async function update(req: Request, res: Response) {
//     try {
//         const updates = req.body;
//         const result = await BoardService.updateBoard(
//             req.params.id as string,
//             updates
//         );

//         res.status(200).json(result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to update board" });
//     }
// }

// export async function remove(req: Request, res: Response) {
//     try {
//         const result = await BoardService.deleteBoard(req.params.id as string);
//         res.status(200).json(result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Failed to delete board" });
//     }
// }
