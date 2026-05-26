import React, { useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { CanvasContext } from "../../../types/context/CanvasContext";
import {
    Camera,
    EllipseObject,
    EraserPathObject,
    LineObject,
    PathObject,
    RectObject,
    TextObject,
    Vec2,
    WorldObject,
} from "../../../types/canvas";
import {
    EllipseTool,
    EraserTool,
    LineTool,
    PencilTool,
    RectTool,
    SelectTool,
    TextTool,
    Tool,
    ToolType,
} from "../../../types/tool";
import { screenToWorld } from "../utils/canvasCoords";
import {
    findObjectAtCoords as hitTest,
    hitTestCorner,
} from "../utils/canvasHitTesting";
import { object } from "zod";

const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

export interface Interaction {
    type:
        | "camera-drag"
        | "drawing"
        | "multiple-object-selection-box"
        | "selected-object-drag"
        | "selected-object-resize"
        | "text-cursor-drag";
}
export interface CameraDragInteraction extends Interaction {
    type: "camera-drag";
    lastMousePos: Vec2;
}
export interface DrawingInteraction extends Interaction {
    type: "drawing";
    objectId: string;
    tool: Exclude<Tool, SelectTool>;
    path: Vec2[];
    latestObject?: WorldObject;
}

export interface MultipleObjectSelectionBoxInteraction extends Interaction {
    type: "multiple-object-selection-box";
    boxStart: Vec2 | null;
    boxEnd: Vec2 | null;
}

export interface SelectedObjectDragInteraction extends Interaction {
    type: "selected-object-drag";
    startMousePos: Vec2;
    // originalObjects never changes for the duration of the interaction. The original, untranslated objects.
    originalObjects: WorldObject[];
}

export interface SelectedObjectResizeInteraction extends Interaction {
    type: "selected-object-resize";
    objectId: string;
    corner: "tl" | "tr" | "bl" | "br";
    startMousePos: Vec2;
    originalObject: WorldObject;
}

export interface TextCursorDragInteraction extends Interaction {
    type: "text-cursor-drag";
}

interface useMouseEventsProps {
    handleDrawingInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) => void;
    handleDrawingInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<DrawingInteraction>
    ) => void;
    handleCameraDragInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) => void;
    handleCameraDragInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) => void;
    handleMultipleObjectSelectionBoxInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionBoxInteraction>
    ) => void;
    handleMultipleObjectSelectionBoxInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionBoxInteraction>
    ) => void;
    handleSelectedObjectDragInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectDragInteraction>
    ) => void;
    handleSelectedObjectDragInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectDragInteraction>
    ) => void;
    handleSelectedObjectResizeInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectResizeInteraction>
    ) => void;
    handleSelectedObjectResizeInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<SelectedObjectResizeInteraction>
    ) => void;
    handleCamera_Wheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    handleSingleObjectSelected: (object: WorldObject) => void;
    handleAdditionalSingleObjectSelected: (object: WorldObject) => void;
    handleDeselectAllObjects: () => void;
    selectedObjectIds: Set<string>;
    selectedObjects: WorldObject[];
    editingTextObjectId: string | null;
    onTextCursorMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onTextCursorMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onTextObjectDoubleClick: (objectId: string, worldPos: { x: number; y: number }) => void;
}

// Maps a corner name to the CSS resize cursor string for that corner's drag axis.
function cornerToCursor(corner: "tl" | "tr" | "bl" | "br"): string {
    if (corner === "tl" || corner === "br") return "nwse-resize";
    return "nesw-resize";
}

/**
 * Delegates mouse events into events
 */
export function useMouseEvents({
    handleDrawingInteraction_MouseMove,
    handleDrawingInteraction_MouseUp,
    handleCameraDragInteraction_MouseMove,
    handleCameraDragInteraction_MouseUp,
    handleMultipleObjectSelectionBoxInteraction_MouseMove,
    handleMultipleObjectSelectionBoxInteraction_MouseUp,
    handleSelectedObjectDragInteraction_MouseMove,
    handleSelectedObjectDragInteraction_MouseUp,
    handleSelectedObjectResizeInteraction_MouseMove,
    handleSelectedObjectResizeInteraction_MouseUp,
    handleCamera_Wheel,
    handleSingleObjectSelected,
    handleAdditionalSingleObjectSelected,
    handleDeselectAllObjects,
    selectedObjectIds,
    selectedObjects,
    editingTextObjectId,
    onTextCursorMouseDown,
    onTextCursorMouseMove,
    onTextObjectDoubleClick,
}: useMouseEventsProps) {
    const canvasContext = useContext(CanvasContext);
    const tool: Tool = canvasContext.local_tool;
    const camera: Camera = canvasContext.local_camera;

    // what to show as the cursor (when resizing text object corners for example)
    const [cursor, setCursor] = useState<string>("default");

    const currentInteraction = useRef<
        | DrawingInteraction
        | CameraDragInteraction
        | MultipleObjectSelectionBoxInteraction
        | SelectedObjectDragInteraction
        | SelectedObjectResizeInteraction
        | TextCursorDragInteraction
        | null
    >(null);

    function findObjectAtCoords(coords: Vec2): WorldObject | null {
        return hitTest([...canvasContext.allObjects.values()], coords);
    }

    // Prevent the default browser context menu on right-click
    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // If clicking/holding shift + left click with any tool
        if (e.button === LEFT_MOUSE_BUTTON && e.shiftKey) {
            // Check if clicked an object
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
            const clickedObject = findObjectAtCoords(mouseWorldCoords);

            // If clicked an object with shift key, select that object in addition to the already selected objects
            if (clickedObject) {
                handleAdditionalSingleObjectSelected(clickedObject);
                return;
            }

            // If an object wasn't clicked, proceed as though we're holding down left mouse button, multiple object selection
            currentInteraction.current = {
                type: "multiple-object-selection-box",
                boxStart: null,
                boxEnd: null,
            };
            handleMultipleObjectSelectionBoxInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionBoxInteraction>
            );
            return;
        }

        // If left clicking on an object with select tool, we probably want to select it
        if (e.button === LEFT_MOUSE_BUTTON && tool.type === "select") {
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);

            // Check if holding one of the object's corners, in which case we start a resize interaction instead
            for (const obj of selectedObjects) {
                const corner = hitTestCorner(
                    mouseWorldCoords,
                    obj,
                    camera.zoom
                );
                if (corner) {
                    currentInteraction.current = {
                        type: "selected-object-resize",
                        objectId: obj.id,
                        corner,
                        startMousePos: mouseWorldCoords,
                        originalObject: obj,
                    };
                    return;
                }
            }

            const clickedObject = findObjectAtCoords(mouseWorldCoords);
            // If clicked on an object:
            if (clickedObject) {
                // HOWEVER, exception: If this object is already selected...
                if (selectedObjectIds.has(clickedObject.id)) {
                    // If it's the currently editing text object, route to text cursor positioning
                    if (editingTextObjectId && clickedObject.id === editingTextObjectId) {
                        onTextCursorMouseDown(e);
                        currentInteraction.current = { type: "text-cursor-drag" };
                        return;
                    }
                    // Otherwise start an object drag interaction
                    currentInteraction.current = {
                        type: "selected-object-drag",
                        startMousePos: mouseWorldCoords,
                        originalObjects: selectedObjects,
                    };
                    return;
                }
                // Otherwise, select it
                handleSingleObjectSelected(clickedObject);
                return;
            }

            // The user didn't left click on an object.
            // If using the select tool, deselect all objects
            if (tool.type === "select") {
                handleDeselectAllObjects();
                // we don't return on purpose, could also be dragging camera
            }
        }

        // If holding down left mouse with any DRAWING tool:
        if (e.button === LEFT_MOUSE_BUTTON && tool.type !== "select") {
            handleDeselectAllObjects();

            currentInteraction.current = {
                type: "drawing",
                objectId: uuidv4(),
                tool: tool,
                path: [],
            };
            // On first initial mouse down also treat it as a draw (so pressing and quickly releasing still draws a point)
            handleDrawingInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<DrawingInteraction>
            );
            return;
        }

        // If holding down left mouse with select tool, or holding down middle mouse with any tool:
        if (
            (tool.type === "select" && e.button === LEFT_MOUSE_BUTTON) ||
            e.button === MIDDLE_MOUSE_BUTTON
        ) {
            currentInteraction.current = {
                type: "camera-drag",
                lastMousePos: { x: e.clientX, y: e.clientY },
            };
            return;
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            handleDrawingInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<DrawingInteraction>
            );
            return;
        }
        if (currentInteraction.current?.type === "camera-drag") {
            handleCameraDragInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<CameraDragInteraction>
            );
            return;
        }
        if (
            currentInteraction.current?.type === "multiple-object-selection-box"
        ) {
            handleMultipleObjectSelectionBoxInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionBoxInteraction>
            );
            return;
        }
        if (currentInteraction.current?.type === "selected-object-drag") {
            handleSelectedObjectDragInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<SelectedObjectDragInteraction>
            );
            return;
        }
        if (currentInteraction.current?.type === "selected-object-resize") {
            setCursor(cornerToCursor(currentInteraction.current.corner));
            handleSelectedObjectResizeInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<SelectedObjectResizeInteraction>
            );
            return;
        }
        if (currentInteraction.current?.type === "text-cursor-drag") {
            onTextCursorMouseMove(e);
            return;
        }

        // If there is no active interaction - if we're in select tool and hovering over one of an object's corners - set the matching cursor
        if (tool.type === "select") {
            const mouseWorldCoords = screenToWorld(e, camera);
            let found: "tl" | "tr" | "bl" | "br" | null = null;
            for (const obj of selectedObjects) {
                const corner = hitTestCorner(
                    mouseWorldCoords,
                    obj,
                    camera.zoom
                );
                if (corner) {
                    found = corner;
                    break;
                }
            }
            setCursor(found ? cornerToCursor(found) : "default");
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            handleDrawingInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<DrawingInteraction>
            );
        }
        if (currentInteraction.current?.type === "camera-drag") {
            handleCameraDragInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<CameraDragInteraction>
            );
        }
        if (
            currentInteraction.current?.type === "multiple-object-selection-box"
        ) {
            handleMultipleObjectSelectionBoxInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionBoxInteraction>
            );
        }
        if (currentInteraction.current?.type === "selected-object-drag") {
            handleSelectedObjectDragInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<SelectedObjectDragInteraction>
            );
        }
        if (currentInteraction.current?.type === "selected-object-resize") {
            handleSelectedObjectResizeInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<SelectedObjectResizeInteraction>
            );
        }
        currentInteraction.current = null;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();

        handleCamera_Wheel(e);
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool.type !== "select") return;
        const mouseWorldCoords = screenToWorld(e, camera);
        const clickedObject = findObjectAtCoords(mouseWorldCoords);
        if (clickedObject?.type === "text") {
            onTextObjectDoubleClick(clickedObject.id, mouseWorldCoords);
        }
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleDoubleClick,
        cursor: editingTextObjectId ? "text" : cursor,
    };
}
