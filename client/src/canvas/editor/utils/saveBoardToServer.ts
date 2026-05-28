import {
    deleteBoardObjects,
    updateBoardCamera,
    updateBoardCameraPosition,
    updateBoardCameraZoom,
    upsertBoardObjects,
} from "../../../api/boards";
import { Vec2, WorldObject } from "../../../types/canvas";

export type BoardChanges = {
    objectUpsert: Map<string, WorldObject>;
    objectDelete: Set<string>;
    cameraPosition: Vec2 | null;
    cameraZoom: number | null;
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

    if (changes.cameraPosition) {
        requests.push(
            updateBoardCameraPosition(boardId, changes.cameraPosition)
        );
    }

    if (changes.cameraZoom) {
        requests.push(updateBoardCameraZoom(boardId, changes.cameraZoom));
    }

    if (changes.objectDelete.size > 0) {
        requests.push(deleteBoardObjects(boardId, changes.objectDelete));
    }

    await Promise.all(requests);
}
