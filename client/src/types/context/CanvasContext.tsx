import { createContext, useContext, useEffect, useState } from "react";
import { BoardData } from "../data";
import { Camera, Vec2, WorldObject } from "../canvas";
import { SessionContext } from "./SessionContext";
import { Tool } from "../tool";

/**
 * Local properties - not synced with server.
 */
interface CanvasContextType {
    // technically currentBoardId doesn't even have a server-side counterpart, we keep it local just for clarity
    local_currentBoardId: string;
    local_unsavedObjects: WorldObject[];
    local_deletedObjectIds: Set<string>;
    local_camera: Camera;
    local_tool: Tool;
    // Color to persist across tool changes, even for tools that don't have a color property (e.g. eraser).
    local_cachedColor: string;
    // Stroke to persist across tool changes, even for tools that don't have a stroke property (e.g. rect).
    local_cachedStroke: number;

    // Local state updaters
    setLocalCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    setLocalCamera: React.Dispatch<React.SetStateAction<Camera>>;
    setLocalTool: React.Dispatch<React.SetStateAction<Tool>>;
    setLocalUnsavedObjects: React.Dispatch<React.SetStateAction<WorldObject[]>>;
    setLocalDeletedObjectIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setLocalCachedColor: React.Dispatch<React.SetStateAction<string>>;
    setLocalCachedStroke: React.Dispatch<React.SetStateAction<number>>;

    // Server-synced-properties methods
    updateCurrentBoardCamera: (
        cameraPosition: Vec2,
        cameraZoom: number
    ) => void;
    updateCurrentBoardObjects: (objects: WorldObject[]) => void;
    onCurrentBoardSaved: (
        savedObjects: WorldObject[],
        deletedObjectIds: Set<string>,
        cameraPosition: Vec2,
        cameraZoom: number
    ) => void;
    getCurrentBoard: () => BoardData;
    updateCurrentBoard: (boardData: BoardData) => void;
}

export const CanvasContext = createContext<CanvasContextType>(null!);

export function CanvasContextProvider({
    children,
    defaultBoardId,
    defaultBoardCameraSize,
    defaultTool,
    defaultCachedColor,
    defaultCachedStroke,
}: {
    children: React.ReactNode;
    defaultBoardId: string;
    defaultBoardCameraSize: Vec2;
    defaultTool: Tool;
    defaultCachedColor: string;
    defaultCachedStroke: number;
}) {
    const sessionContext = useContext(SessionContext);
    const [local_currentBoardId, setLocalCurrentBoardId] =
        useState<string>(defaultBoardId);

    const [local_cachedColor, setLocalCachedColor] =
        useState<string>(defaultCachedColor);
    const [local_cachedStroke, setLocalCachedStroke] =
        useState<number>(defaultCachedStroke);

    function getCurrentBoard(): BoardData {
        const currentBoard = sessionContext.boards.find(
            (board) => board.id === local_currentBoardId
        );
        if (!currentBoard) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    const [local_unsavedObjects, setLocalUnsavedObjects] = useState<
        WorldObject[]
    >([]);
    const [local_deletedObjectIds, setLocalDeletedObjectIds] = useState<
        Set<string>
    >(new Set());

    const [local_camera, setLocalCamera] = useState<Camera>({
        position: getCurrentBoard().lastCameraPosition,
        zoom: getCurrentBoard().lastCameraZoom,
        size: defaultBoardCameraSize,
    });

    const [local_tool, setLocalTool] = useState<Tool>(defaultTool);

    // --- Server-Side Sync Logic ---
    function updateCurrentBoard(boardData: BoardData) {
        if (boardData.id !== local_currentBoardId) {
            throw new Error(
                "Provided board data's id doesn't match current board id."
            );
        }
        sessionContext.updateBoardById(boardData);
    }

    function updateCurrentBoardCamera(
        cameraPosition: Vec2,
        cameraZoom: number
    ) {
        const currentBoardData = getCurrentBoard();
        sessionContext.updateBoardById({
            ...currentBoardData,
            lastCameraPosition: cameraPosition,
            lastCameraZoom: cameraZoom,
        });
    }

    function updateCurrentBoardObjects(objects: WorldObject[]) {
        const currentBoardData = getCurrentBoard();
        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: objects,
        });
    }

    function onCurrentBoardSaved(
        savedObjects: WorldObject[],
        deletedObjectIds: Set<string>,
        cameraPosition: Vec2,
        cameraZoom: number
    ) {
        const currentBoardData = getCurrentBoard();
        const newObjectsMap = new Map(
            currentBoardData.objects
                .filter((x) => !deletedObjectIds.has(x.id))
                .map((x) => [x.id, x])
        );
        savedObjects.forEach((x) => newObjectsMap.set(x.id, x));
        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: Array.from(newObjectsMap.values()),
            lastCameraPosition: cameraPosition,
            lastCameraZoom: cameraZoom,
        });
    }

    return (
        <CanvasContext.Provider
            value={{
                local_currentBoardId,
                local_unsavedObjects,
                local_deletedObjectIds,
                local_camera,
                local_tool: local_tool,
                local_cachedColor,
                local_cachedStroke,
                setLocalCurrentBoardId,
                setLocalCamera,
                setLocalTool,
                setLocalUnsavedObjects,
                setLocalDeletedObjectIds,
                setLocalCachedColor,
                setLocalCachedStroke,
                updateCurrentBoardCamera,
                updateCurrentBoardObjects,
                onCurrentBoardSaved,
                getCurrentBoard,
                updateCurrentBoard,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
