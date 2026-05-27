import {
    deleteBoardObjects,
    updateBoardCamera,
    upsertBoardObjects,
} from "../../../api/boards";
import { Vec2, WorldObject } from "../../../types/canvas";

export type BoardChanges = {
    objectUpsert: Map<string, WorldObject>;
    objectDelete: Set<string>;
    camera: { position: Vec2; zoom: number } | null;
};

export async function pushBoardChangesToServer(
    boardId: string,
    changes: BoardChanges
): Promise<void> {
    const requests: Promise<void>[] = [];

    if (changes.objectUpsert.size > 0) {
        requests.push(
            upsertBoardObjects(
                boardId,
                Array.from(changes.objectUpsert.values())
            )
        );
    }

    if (changes.camera) {
        requests.push(
            updateBoardCamera(
                boardId,
                changes.camera.position,
                changes.camera.zoom
            )
        );
    }

    if (changes.objectDelete.size > 0) {
        requests.push(deleteBoardObjects(boardId, changes.objectDelete));
    }

    await Promise.all(requests);
}
