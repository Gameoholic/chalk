import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BoardData, ObjectlessBoardData } from "../data";
import { Camera, TextObject, Vec2, WorldObject } from "../canvas";
import { SessionContext } from "./SessionContext";
import { Tool } from "../tool";

/**
 * Properties relating to the currently open/selected board
 */
interface CanvasContextType {
    // unsaved: board data that haven't been pushed to server yet, exists only on client
    unsaved_objects: WorldObject[];
    unsaved_deletedObjectIds: Set<string>;
    unsaved_cameraPosition: Vec2 | null;
    unsaved_cameraZoom: number | null;

    // pending: board data that has been sent to the server but doesn't exist there yet
    pending_objects: WorldObject[];
    pending_deletedObjectIds: Set<string>;
    pending_cameraPosition: Vec2 | null;
    pending_cameraZoom: number | null;

    // local: stuff that exists purely on client - no pushing it to server
    local_currentBoardId: string;
    local_cameraSize: Vec2;
    local_tool: Tool;
    // Color to persist across tool changes, even for tools that don't have a color property (e.g. eraser).
    local_color: string;
    // Stroke to persist across tool changes, even for tools that don't have a stroke property (e.g. rect).
    local_stroke: number;
    // Text style to use as defaults when creating new text objects.
    local_textProperties: Pick<
        TextObject,
        "color" | "fontSize" | "fontFamily" | "lineHeight" | "bold" | "italic"
    >;

    // Unsaved state updaters
    setUnsavedObjects: React.Dispatch<React.SetStateAction<WorldObject[]>>;
    setUnsavedDeletedObjectIds: React.Dispatch<
        React.SetStateAction<Set<string>>
    >;
    setUnsavedCameraPosition: React.Dispatch<React.SetStateAction<Vec2 | null>>;
    setUnsavedCameraZoom: React.Dispatch<React.SetStateAction<number | null>>;

    // Local state updaters
    setLocalCurrentBoardId: React.Dispatch<React.SetStateAction<string>>;
    setLocalCameraSize: React.Dispatch<React.SetStateAction<Vec2>>;
    setLocalTool: React.Dispatch<React.SetStateAction<Tool>>;
    setLocalColor: React.Dispatch<React.SetStateAction<string>>;
    setLocalStroke: React.Dispatch<React.SetStateAction<number>>;
    setLocalTextProperties: React.Dispatch<
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

    // Server-synced data (no optimistic layer) Getting objects/camera from this will return the server state, ignoring unsaved/pending changes
    serverBoard: BoardData;

    // Computed values (optimistically merged: server + pending + unsaved)
    objects: Map<string, WorldObject>;
    camera: Camera;

    // Board change data update functions
    updateCurrentBoard: (updates: Partial<ObjectlessBoardData>) => void;
    onSaveCompleted: (
        savedObjects: WorldObject[],
        deletedIds: Set<string>,
        cameraPosition: Vec2 | null,
        cameraZoom: number | null
    ) => void;
    moveLocalChangesToPendingChanges: () => void;
    mergeLocalIntoPendingChanges: () => void;
    onBoardReset: () => void;
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

    // --- Unsaved board data ---
    const [unsaved_objects, setUnsavedObjects] = useState<WorldObject[]>([]);
    const [unsaved_deletedObjectIds, setUnsavedDeletedObjectIds] = useState<
        Set<string>
    >(new Set());
    const [unsaved_cameraPosition, setUnsavedCameraPosition] =
        useState<Vec2 | null>(null);
    const [unsaved_cameraZoom, setUnsavedCameraZoom] = useState<number | null>(
        null
    );

    // --- Pending board data ---
    const [pending_objects, setPendingObjects] = useState<WorldObject[]>([]);
    const [pending_deletedObjectIds, setPendingDeletedObjectIds] = useState<
        Set<string>
    >(new Set());
    const [pending_cameraPosition, setPendingCameraPosition] =
        useState<Vec2 | null>(null);
    const [pending_cameraZoom, setPendingCameraZoom] = useState<number | null>(
        null
    );

    // --- Local state ---
    const [local_currentBoardId, setLocalCurrentBoardId] =
        useState<string>(defaultBoardId);
    const [local_cameraSize, setLocalCameraSize] = useState<Vec2>(
        defaultBoardCameraSize
    );
    const [local_tool, setLocalTool] = useState<Tool>(defaultTool);
    const [local_color, setLocalColor] = useState<string>(defaultCachedColor);
    const [local_stroke, setLocalStroke] =
        useState<number>(defaultCachedStroke);
    const [local_textProperties, setLocalTextProperties] = useState(
        defaultCachedTextProps
    );

    // --- Server-synced data ---

    const serverBoard = useMemo(() => {
        const board = sessionContext.boards.find(
            (b) => b.id === local_currentBoardId
        );
        if (!board) throw new Error("Couldn't get current board in context!");
        return board;
    }, [sessionContext.boards, local_currentBoardId]);

    // --- Computed values ---

    const objects = useMemo(() => {
        const map = new Map<string, WorldObject>();
        // Base: server-synced
        serverBoard.objects.forEach((obj) => map.set(obj.id, obj));
        // Pending objects layer on top
        pending_objects.forEach((obj) => map.set(obj.id, obj));
        // Local (freshest) wins over pending
        unsaved_objects.forEach((obj) => map.set(obj.id, obj));
        // Deletions last — both pending and local
        pending_deletedObjectIds.forEach((id) => map.delete(id));
        unsaved_deletedObjectIds.forEach((id) => map.delete(id));
        return map;
    }, [
        serverBoard.objects,
        pending_objects,
        unsaved_objects,
        pending_deletedObjectIds,
        unsaved_deletedObjectIds,
    ]);

    const camera = useMemo<Camera>(() => {
        return {
            position:
                unsaved_cameraPosition ??
                pending_cameraPosition ??
                serverBoard.lastCameraPosition,
            zoom:
                unsaved_cameraZoom ??
                pending_cameraZoom ??
                serverBoard.lastCameraZoom,
            size: local_cameraSize,
        };
    }, [
        unsaved_cameraPosition,
        pending_cameraPosition,
        unsaved_cameraZoom,
        pending_cameraZoom,
        local_cameraSize,
        serverBoard.lastCameraPosition,
        serverBoard.lastCameraZoom,
        defaultBoardCameraSize,
    ]);

    // --- Board change functions ---

    function moveLocalChangesToPendingChanges() {
        // Snapshot local → pending
        setPendingObjects(unsaved_objects);
        setPendingDeletedObjectIds(unsaved_deletedObjectIds);
        setPendingCameraPosition(unsaved_cameraPosition);
        setPendingCameraZoom(unsaved_cameraZoom);

        // Clear local — new edits from here accumulate fresh
        setUnsavedObjects([]);
        setUnsavedDeletedObjectIds(new Set());
        setUnsavedCameraPosition(null);
        setUnsavedCameraZoom(null);
    }

    // Like moveLocalChangesToPendingChanges, but merges all unsaved changes into an existing pending batch
    // (used when retrying a failed save because pending still holds the failed batch, local holds new edits since)
    function mergeLocalIntoPendingChanges() {
        // Merge objects: pending base, local wins on ID collision
        setPendingObjects((prev) => {
            const merged = new Map(prev.map((o) => [o.id, o]));
            unsaved_objects.forEach((o) => merged.set(o.id, o));
            unsaved_deletedObjectIds.forEach((id) => merged.delete(id));
            return Array.from(merged.values());
        });
        setPendingDeletedObjectIds(
            (prev) => new Set([...prev, ...unsaved_deletedObjectIds])
        );
        // Local camera overwrites pending if present
        if (unsaved_cameraPosition !== null)
            setPendingCameraPosition(unsaved_cameraPosition);
        if (unsaved_cameraZoom !== null)
            setPendingCameraZoom(unsaved_cameraZoom);

        // Clear local — new edits from here accumulate fresh
        setUnsavedObjects([]);
        setUnsavedDeletedObjectIds(new Set());
        setUnsavedCameraPosition(null);
        setUnsavedCameraZoom(null);
    }

    function updateCurrentBoard(updates: Partial<ObjectlessBoardData>) {
        sessionContext.updateBoardById({ ...serverBoard, ...updates });
    }

    function onBoardReset() {
        setUnsavedObjects([]);
        setUnsavedDeletedObjectIds(new Set());
        setUnsavedCameraPosition(null);
        setUnsavedCameraZoom(null);
        setPendingObjects([]);
        setPendingDeletedObjectIds(new Set());
        setPendingCameraPosition(null);
        setPendingCameraZoom(null);
        sessionContext.updateBoardById({ ...serverBoard, objects: [] });
    }

    function onSaveCompleted(
        savedObjects: WorldObject[],
        deletedIds: Set<string>,
        cameraPosition: Vec2 | null,
        cameraZoom: number | null
    ) {
        const board = serverBoard;
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
        setPendingObjects((prev) => prev.filter((o) => !savedIds.has(o.id)));
        setPendingDeletedObjectIds(
            (prev) => new Set([...prev].filter((id) => !deletedIds.has(id)))
        );
        setPendingCameraPosition(null);
        setPendingCameraZoom(null);
    }

    return (
        <CanvasContext.Provider
            value={{
                // Unsaved board data
                unsaved_objects,
                unsaved_deletedObjectIds,
                unsaved_cameraPosition,
                unsaved_cameraZoom,

                // Pending board data
                pending_objects,
                pending_deletedObjectIds,
                pending_cameraPosition,
                pending_cameraZoom,

                // Local state
                local_currentBoardId,
                local_cameraSize,
                local_tool,
                local_color,
                local_stroke,
                local_textProperties,

                // Unsaved state updaters
                setUnsavedObjects,
                setUnsavedDeletedObjectIds,
                setUnsavedCameraPosition,
                setUnsavedCameraZoom,

                // Local state updaters
                setLocalCurrentBoardId,
                setLocalCameraSize,
                setLocalTool,
                setLocalColor,
                setLocalStroke,
                setLocalTextProperties,

                // Server-synced data
                serverBoard,

                // Computed values
                objects,
                camera,

                // Board change functions
                updateCurrentBoard,
                onSaveCompleted,
                moveLocalChangesToPendingChanges,
                mergeLocalIntoPendingChanges,
                onBoardReset,
            }}
        >
            {children}
        </CanvasContext.Provider>
    );
}
