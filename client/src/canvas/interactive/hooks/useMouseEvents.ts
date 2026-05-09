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
import { findObjectAtCoords as hitTest } from "../utils/canvasHitTesting";

const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

export interface Interaction {
    type: "camera-drag" | "drawing" | "multiple-object-selection";
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

export interface MultipleObjectSelectionInteraction extends Interaction {
    type: "multiple-object-selection";
    boxStart: Vec2 | null;
    boxEnd: Vec2 | null;
}

interface useHandleMouseEventsProps {
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
    handleMultipleObjectSelectionInteraction_MouseMove: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionInteraction>
    ) => void;
    handleMultipleObjectSelectionInteraction_MouseUp: (
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<MultipleObjectSelectionInteraction>
    ) => void;
    handleCamera_Wheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    handleSingleObjectSelected: (object: WorldObject) => void;
}

/**
 * Delegates mouse events into events
 */
export function useHandleMouseEvents({
    handleDrawingInteraction_MouseMove,
    handleDrawingInteraction_MouseUp,
    handleCameraDragInteraction_MouseMove,
    handleCameraDragInteraction_MouseUp,
    handleMultipleObjectSelectionInteraction_MouseMove,
    handleMultipleObjectSelectionInteraction_MouseUp,
    handleCamera_Wheel,
    handleSingleObjectSelected,
}: useHandleMouseEventsProps) {
    const canvasContext = useContext(CanvasContext);
    const tool: Tool = canvasContext.local_tool;
    const camera: Camera = canvasContext.local_camera;

    const currentInteraction = useRef<
        | DrawingInteraction
        | CameraDragInteraction
        | MultipleObjectSelectionInteraction
        | null
    >(null);

    // hikakin todo fix - what about local_deletedObjects? we should have more centralized way of getting all UPDATED object states...
    function findObjectAtCoords(coords: Vec2): WorldObject | null {
        return hitTest(
            [
                ...canvasContext.getCurrentBoard().objects,
                ...canvasContext.local_unsavedObjects,
            ],
            coords
        );
    }

    // Prevent the default browser context menu on right-click
    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // If holding shift + left mouse button regardless of tool, edit them
        if (e.button === LEFT_MOUSE_BUTTON && e.shiftKey) {
            currentInteraction.current = {
                type: "multiple-object-selection",
                boxStart: null,
                boxEnd: null,
            };
            handleMultipleObjectSelectionInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionInteraction>
            );
            return;
        }

        // If left click was pressed regardless of tool over an object, edit it
        if (e.button === LEFT_MOUSE_BUTTON) {
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
            const clickedObject = findObjectAtCoords(mouseWorldCoords);
            if (clickedObject) {
                handleSingleObjectSelected(clickedObject);
                return;
            }
        }

        // If holding down left mouse with any DRAWING tool:
        if (e.button === LEFT_MOUSE_BUTTON && tool.type !== "select") {
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
        if (currentInteraction.current?.type === "multiple-object-selection") {
            handleMultipleObjectSelectionInteraction_MouseMove(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionInteraction>
            );
            return;
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
        if (currentInteraction.current?.type === "multiple-object-selection") {
            handleMultipleObjectSelectionInteraction_MouseUp(
                e,
                currentInteraction as React.RefObject<MultipleObjectSelectionInteraction>
            );
        }
        currentInteraction.current = null;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();

        handleCamera_Wheel(e);
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
    };
}
