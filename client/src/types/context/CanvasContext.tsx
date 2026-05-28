import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BoardData } from "../data";
import { Camera, TextObject, Vec2, WorldObject } from "../canvas";
import { SessionContext } from "./SessionContext";
import { Tool } from "../tool";

/**
 * Local properties - not synced with server.
 */
interface CanvasContextType {
    // technically currentBoardId doesn't even have a server-side counterpart, we keep it local_ just for clarity
    local_currentBoardId: string;

    // local: board data that haven't been pushed to server yet, exists only on client
    local_unsavedObjects: WorldObject[];
    local_deletedObjectIds: Set<string>;
    local_cameraPosition: Vec2 | null;
    local_cameraZoom: number | null;
    // pending: board data that has been sent to the server but doesn't exist there yet
    pending_unsavedObjects: WorldObject[];
    pending_deletedObjectIds: Set<string>;
    pending_cameraPosition: Vec2 | null;
    pending_cameraZoom: number | null;

    local_cameraSize: Vec2;
    local_tool: Tool;
    // Color to persist across tool changes, even for tools that don't have a color property (e.g. eraser).
    local_cachedColor: string;
    // Stroke to persist across tool changes, even for tools that don't have a stroke property (e.g. rect).
    local_cachedStroke: number;
    // Text style to use as defaults when creating new text objects.
    local_cachedTextProps: Pick<
        TextObject,
        "color" | "fontSize" | "fontFamily" | "lineHeight" | "bold" | "italic"
    >;

    // Local state updaters
    setLocalCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    setLocalCameraPosition: React.Dispatch<React.SetStateAction<Vec2 | null>>;
    setLocalCameraZoom: React.Dispatch<React.SetStateAction<number | null>>;
    setLocalCameraSize: React.Dispatch<React.SetStateAction<Vec2>>;
    setLocalTool: React.Dispatch<React.SetStateAction<Tool>>;
    setLocalUnsavedObjects: React.Dispatch<React.SetStateAction<WorldObject[]>>;
    setLocalDeletedObjectIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setLocalCachedColor: React.Dispatch<React.SetStateAction<string>>;
    setLocalCachedStroke: React.Dispatch<React.SetStateAction<number>>;
    setLocalCachedTextProps: React.Dispatch<
        React.SetStateAction<
            Pick<
                TextObject,
                | "color"
                | "fontSize"
                | "fontFamily"
                | "lineHeight"
                | "bold"
                | "italic"
            >
        >
    >;

    // Server-synced-properties methods
    updateCurrentBoardCamera: (
        cameraPosition: Vec2,
        cameraZoom: number
    ) => void;
    updateCurrentBoardObjects: (objects: WorldObject[]) => void;
    getCurrentBoard: () => BoardData;
    updateCurrentBoard: (boardData: BoardData) => void;

    // Get all objects including client and server changes (useMemo internally)
    allObjects: Map<string, WorldObject>;
    // gets the most recent camera with local and pending changes applied
    updatedCamera: Camera;
    onSaveCompleted: (
        savedObjects: WorldObject[],
        deletedIds: Set<string>,
        cameraPosition: Vec2 | null,
        cameraZoom: number | null
    ) => void;
    moveLocalChangesToPendingChanges: () => void;
    mergeLocalIntoPendingChanges: () => void;
}

export const CanvasContext = createContext<CanvasContextType>(null!);

export function CanvasContextProvider({
    children,
    defaultBoardId,
    defaultBoardCameraSize,
    defaultTool,
    defaultCachedColor,
    defaultCachedStroke,
    defaultCachedTextProps,
}: {
    children: React.ReactNode;
    defaultBoardId: string;
    defaultBoardCameraSize: Vec2;
    defaultTool: Tool;
    defaultCachedColor: string;
    defaultCachedStroke: number;
    defaultCachedTextProps: Pick<
        TextObject,
        "color" | "fontSize" | "fontFamily" | "lineHeight" | "bold" | "italic"
    >;
}) {
    const sessionContext = useContext(SessionContext);
    const [local_currentBoardId, setLocalCurrentBoardId] =
        useState<string>(defaultBoardId);

    const [local_cachedColor, setLocalCachedColor] =
        useState<string>(defaultCachedColor);
    const [local_cachedStroke, setLocalCachedStroke] =
        useState<number>(defaultCachedStroke);
    const [local_cachedTextProps, setLocalCachedTextProps] = useState(
        defaultCachedTextProps
    );

    function getCurrentBoard(): BoardData {
        const currentBoard = sessionContext.boards.find(
            (board) => board.id === local_currentBoardId
        );
        if (!currentBoard) {
            throw new Error("Couldn't get current board in context!");
        }
        return currentBoard;
    }

    const [local_cameraSize, setLocalCameraSize] = useState<Vec2>(
        defaultBoardCameraSize
    );

    const [local_tool, setLocalTool] = useState<Tool>(defaultTool);

    // Local board data:
    const [local_cameraPosition, setLocalCameraPosition] =
        useState<Vec2 | null>(null);
    const [local_cameraZoom, setLocalCameraZoom] = useState<number | null>(
        null
    );
    const [local_unsavedObjects, setLocalUnsavedObjects] = useState<
        WorldObject[]
    >([]);
    const [local_deletedObjectIds, setLocalDeletedObjectIds] = useState<
        Set<string>
    >(new Set());

    // pending board data:
    const [pending_unsavedObjects, setPendingUnsavedObjects] = useState<
        WorldObject[]
    >([]);
    const [pending_deletedObjectIds, setPendingDeletedObjectIds] = useState<
        Set<string>
    >(new Set());
    const [pending_cameraPosition, setPendingCameraPosition] =
        useState<Vec2 | null>(null);
    const [pending_cameraZoom, setPendingCameraZoom] = useState<number | null>(
        null
    );

    // Server-synced objects and local unsaved objects and locally deleted objects. Basically, most recent objects "state"
    const allObjects = useMemo(() => {
        const map = new Map<string, WorldObject>();
        // Base: server-synced
        getCurrentBoard().objects.forEach((obj) => map.set(obj.id, obj));
        // Pending objects layer on top
        pending_unsavedObjects.forEach((obj) => map.set(obj.id, obj));
        // Local (freshest) wins over pending
        local_unsavedObjects.forEach((obj) => map.set(obj.id, obj));
        // Deletions last — both pending and local
        pending_deletedObjectIds.forEach((id) => map.delete(id));
        local_deletedObjectIds.forEach((id) => map.delete(id));
        return map;
    }, [
        getCurrentBoard().objects,
        pending_unsavedObjects,
        local_unsavedObjects,
        pending_deletedObjectIds,
        local_deletedObjectIds,
    ]);

    const updatedCamera = useMemo<Camera>(() => {
        return {
            position:
                local_cameraPosition ??
                pending_cameraPosition ??
                getCurrentBoard().lastCameraPosition,
            zoom:
                local_cameraZoom ??
                pending_cameraZoom ??
                getCurrentBoard().lastCameraZoom,
            size: local_cameraSize,
        };
    }, [
        local_cameraPosition,
        pending_cameraPosition,
        local_cameraZoom,
        pending_cameraZoom,
        local_cameraSize,
        getCurrentBoard().lastCameraPosition,
        getCurrentBoard().lastCameraZoom,
        defaultBoardCameraSize,
    ]);

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

    function moveLocalChangesToPendingChanges() {
        // Snapshot local → pending
        setPendingUnsavedObjects(local_unsavedObjects);
        setPendingDeletedObjectIds(local_deletedObjectIds);
        setPendingCameraPosition(local_cameraPosition);
        setPendingCameraZoom(local_cameraZoom);

        // Clear local — new edits from here accumulate fresh
        setLocalUnsavedObjects([]);
        setLocalDeletedObjectIds(new Set());
        setLocalCameraPosition(null);
        setLocalCameraZoom(null);
    }

    // Like moveLocalChangesToPendingChanges, but merges into an existing pending batch
    // (used when retrying a failed save — pending holds the failed batch, local holds new edits since)
    function mergeLocalIntoPendingChanges() {
        // Merge objects: pending base, local wins on ID collision
        setPendingUnsavedObjects((prev) => {
            const merged = new Map(prev.map((o) => [o.id, o]));
            local_unsavedObjects.forEach((o) => merged.set(o.id, o));
            local_deletedObjectIds.forEach((id) => merged.delete(id));
            return Array.from(merged.values());
        });
        setPendingDeletedObjectIds(
            (prev) => new Set([...prev, ...local_deletedObjectIds])
        );
        // Local camera overwrites pending if present
        if (local_cameraPosition !== null)
            setPendingCameraPosition(local_cameraPosition);
        if (local_cameraZoom !== null) setPendingCameraZoom(local_cameraZoom);

        // Clear local — new edits from here accumulate fresh
        setLocalUnsavedObjects([]);
        setLocalDeletedObjectIds(new Set());
        setLocalCameraPosition(null);
        setLocalCameraZoom(null);
    }

    function onSaveCompleted(
        savedObjects: WorldObject[],
        deletedIds: Set<string>,
        cameraPosition: Vec2 | null,
        cameraZoom: number | null
    ) {
        const board = getCurrentBoard();
        const savedIds = new Set(savedObjects.map((o) => o.id));

        // Build final object state in one pass
        const updatedObjects = new Map(board.objects.map((o) => [o.id, o]));
        savedObjects.forEach((o) => updatedObjects.set(o.id, o));
        deletedIds.forEach((id) => updatedObjects.delete(id));

        // Single updateBoardById — no clobber
        sessionContext.updateBoardById({
            ...board,
            objects: Array.from(updatedObjects.values()),
            ...(cameraPosition !== null && {
                lastCameraPosition: cameraPosition,
            }),
            ...(cameraZoom !== null && { lastCameraZoom: cameraZoom }),
        });

        // Drain all pending buffers
        setPendingUnsavedObjects((prev) =>
            prev.filter((o) => !savedIds.has(o.id))
        );
        setPendingDeletedObjectIds(
            (prev) => new Set([...prev].filter((id) => !deletedIds.has(id)))
        );
        setPendingCameraPosition(null);
        setPendingCameraZoom(null);
    }

    return (
        <CanvasContext.Provider
            value={{
                local_currentBoardId,
                local_unsavedObjects,
                local_deletedObjectIds,
                local_cameraPosition,
                local_cameraZoom,
                pending_unsavedObjects,
                pending_deletedObjectIds,
                pending_cameraPosition,
                pending_cameraZoom,
                local_cameraSize,
                local_tool: local_tool,
                local_cachedColor,
                local_cachedStroke,
                local_cachedTextProps,
                setLocalCurrentBoardId,
                setLocalCameraPosition,
                setLocalCameraZoom,
                setLocalCameraSize,
                setLocalTool,
                setLocalUnsavedObjects,
                setLocalDeletedObjectIds,
                setLocalCachedColor,
                setLocalCachedStroke,
                setLocalCachedTextProps,
                updateCurrentBoardCamera,
                updateCurrentBoardObjects,
                // onCurrentBoardSaved,
                getCurrentBoard,
                updateCurrentBoard,
                allObjects,
                updatedCamera,
                onSaveCompleted,
                moveLocalChangesToPendingChanges,
                mergeLocalIntoPendingChanges,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
