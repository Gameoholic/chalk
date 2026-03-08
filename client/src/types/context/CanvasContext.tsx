import { createContext, useContext, useState } from "react";
import { BoardData } from "../data";
import { Camera, Tool, Vec2, WorldObject } from "../canvas";
import { SessionContext } from "./SessionContext";

/**
 * Local properties - not synced with server.
 */
interface CanvasContextType {
    // technically currentBoardId doesn't even have a server-side counterpart, we keep it local just for clarity
    local_currentBoardId: string;
    local_unsavedObjects: WorldObject[];
    local_camera: Camera;
    local_selectedTool: Tool;
    local_selectedColor: string;
    local_selectedStroke: number;

    // Local state updaters
    setLocalCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    setLocalCamera: React.Dispatch<React.SetStateAction<Camera>>;
    setLocalTool: React.Dispatch<React.SetStateAction<Tool>>;
    setLocalColor: React.Dispatch<React.SetStateAction<string>>;
    setLocalStroke: React.Dispatch<React.SetStateAction<number>>;
    setLocalUnsavedObjects: React.Dispatch<React.SetStateAction<WorldObject[]>>;

    // Server-synced-properties methods
    updateCurrentBoardCamera: (
        cameraPosition: Vec2,
        cameraZoom: number
    ) => void;
    updateCurrentBoardObjects: (objects: WorldObject[]) => void;
    onCurrentBoardObjectsSaved: (savedObjects: WorldObject[]) => void;
    getCurrentBoard: () => BoardData;
    updateCurrentBoard: (boardData: BoardData) => void;
}

export const CanvasContext = createContext<CanvasContextType>(null!);

export function CanvasContextProvider({
    children,
    defaultBoardId,
    defaultBoardCameraSize,
    defaultTool,
    defaultColor,
    defaultStroke,
}: {
    children: React.ReactNode;
    defaultBoardId: string;
    defaultBoardCameraSize: Vec2;
    defaultTool: Tool;
    defaultColor: string;
    defaultStroke: number;
}) {
    const sessionContext = useContext(SessionContext);
    const [local_currentBoardId, setLocalCurrentBoardId] =
        useState<string>(defaultBoardId);

    function getCurrentBoard(): BoardData {
        const currentBoard = sessionContext.boards.find(
            (board) => board.id === local_currentBoardId
        );
        if (!currentBoard) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    // --- Local State ---
    const [local_unsavedObjects, setLocalUnsavedObjects] = useState<
        WorldObject[]
    >([]);

    const [local_camera, setLocalCamera] = useState<Camera>({
        position: getCurrentBoard().lastCameraPosition,
        zoom: getCurrentBoard().lastCameraZoom,
        size: defaultBoardCameraSize,
    });

    const [local_selectedTool, setLocalTool] = useState<Tool>(defaultTool);
    const [local_selectedColor, setLocalColor] = useState<string>(defaultColor);
    const [local_selectedStroke, setLocalStroke] =
        useState<number>(defaultStroke);

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

    function onCurrentBoardObjectsSaved(savedObjects: WorldObject[]) {
        const currentBoardData = getCurrentBoard();
        const newObjectsMap = new Map(
            currentBoardData.objects.map((x) => [x.id, x])
        );
        savedObjects.forEach((x) => newObjectsMap.set(x.id, x));

        const newObjects = Array.from(newObjectsMap.values());
        sessionContext.updateBoardById({
            ...currentBoardData,
            objects: newObjects,
        });
    }

    return (
        <CanvasContext.Provider
            value={{
                local_currentBoardId,
                local_unsavedObjects,
                local_camera,
                local_selectedTool,
                local_selectedColor,
                local_selectedStroke,
                setLocalCurrentBoardId,
                setLocalCamera,
                setLocalTool,
                setLocalColor,
                setLocalStroke,
                setLocalUnsavedObjects,
                updateCurrentBoardCamera,
                updateCurrentBoardObjects,
                onCurrentBoardObjectsSaved,
                getCurrentBoard,
                updateCurrentBoard,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
