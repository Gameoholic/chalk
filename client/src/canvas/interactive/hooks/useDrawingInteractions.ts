import React, { useContext, useEffect, useRef } from "react";
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

export interface ContextMenuState {
    object: WorldObject;
    screenX: number;
    screenY: number;
}

interface Interaction {
    type: "camera-drag" | "drawing";
}
interface CameraDragInteraction extends Interaction {
    type: "camera-drag";
    lastMousePos: Vec2;
}
interface DrawingInteraction extends Interaction {
    type: "drawing";
    objectId: string;
    tool: Exclude<Tool, SelectTool>;
    path: Vec2[];
    latestObject?: WorldObject;
}

export function useDrawingInteractions(
    updateObject: (object: WorldObject) => void,
    removeObject: (objectId: string) => void,
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void,
    commitCamera: () => void,
    displayContextMenu: (contextMenuState: ContextMenuState) => void,
    openTextEditor: (object: TextObject) => void,
    setDrawingTextBoxObjectId: React.Dispatch<
        React.SetStateAction<string | null>
    >
) {
    const canvasContext = useContext(CanvasContext);

    const tool: Tool = canvasContext.local_tool;
    const camera: Camera = canvasContext.local_camera;

    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 2;

    const currentInteraction = useRef<
        DrawingInteraction | CameraDragInteraction | null
    >(null);
    const lastPinchDistance = useRef<number | null>(null);

    function findObjectAtCoords(coords: Vec2): WorldObject | null {
        return hitTest(
            [
                ...canvasContext.getCurrentBoard().objects,
                ...canvasContext.local_unsavedObjects,
            ],
            coords
        );
    }

    const toolHandleMouseMove: Record<
        ToolType,
        (e: React.MouseEvent<HTMLCanvasElement>) => void
    > = {
        select: () => {
            console.error("Unexpected mouse move with select tool");
        },
        pencil: handleMouseMovePencilDraw,
        eraser: handleMouseMoveEraserDraw,
        line: handleMouseMoveLineDraw,
        rect: handleMouseMoveRectDraw,
        ellipse: handleMouseMoveEllipseDraw,
        text: handleMouseMoveTextDraw,
    };

    // GLOBAL mouseup to fix mouse up outside of canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            currentInteraction.current = null;
        };
        window.addEventListener("touchend", handleWindowMouseUp);
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleWindowMouseUp);
            window.removeEventListener("touchend", handleWindowMouseUp);
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === LEFT_MOUSE_BUTTON && tool.type !== "select") {
            currentInteraction.current = {
                type: "drawing",
                objectId: uuidv4(),
                tool: tool,
                path: [],
            };
            // On first initial mouse down also treat it as a draw (so pressing and quickly releasing still draws a point)
            toolHandleMouseMove[currentInteraction.current.tool.type](e);
            return;
        }
        if (e.button === RIGHT_MOUSE_BUTTON) {
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
            const hoveredObject = findObjectAtCoords(mouseWorldCoords);
            if (hoveredObject) {
                displayContextMenu({
                    object: hoveredObject,
                    screenX: e.clientX,
                    screenY: e.clientY,
                });
            }
        }

        if (
            e.button === LEFT_MOUSE_BUTTON ||
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
            toolHandleMouseMove[currentInteraction.current.tool.type](e);
            return;
        }
        if (currentInteraction.current?.type === "camera-drag") {
            handleMouseMoveDragCamera(e);
            return;
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            const objectToCommit = currentInteraction.current.latestObject;
            if (objectToCommit) {
                if (objectToCommit.type === "text") {
                    openTextEditor(objectToCommit as TextObject);
                } else {
                    commitChanges([objectToCommit], undefined);
                }
            }
            setDrawingTextBoxObjectId(null);
        }
        if (currentInteraction.current?.type === "camera-drag") {
            commitCamera();
        }
        currentInteraction.current = null;
    };

    // ---------------------------------- Tool draw handlers ------------------------------------------

    function handleMouseMovePencilDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const pencilTool = currentInteraction.current.tool as PencilTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        const newPath: PathObject = {
            id: currentInteraction.current.objectId,
            type: "path",
            color: pencilTool.color,
            stroke: pencilTool.stroke,
            points: currentInteraction.current.path,
        };
        currentInteraction.current.latestObject = newPath;
        updateObject(newPath);
    }

    function handleMouseMoveEraserDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const eraserTool = currentInteraction.current.tool as EraserTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        if (eraserTool.eraserMode === "object") {
            const hoveredObject = findObjectAtCoords(mouseWorldCoords);
            if (hoveredObject) {
                removeObject(hoveredObject.id);
                commitChanges(undefined, [hoveredObject.id]);
            }
        } else {
            const newPath: EraserPathObject = {
                id: currentInteraction.current.objectId,
                type: "eraser-path",
                stroke: eraserTool.stroke,
                points: currentInteraction.current.path,
            };
            currentInteraction.current.latestObject = newPath;
            updateObject(newPath);
        }
    }

    function handleMouseMoveLineDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const lineTool = currentInteraction.current.tool as LineTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
        }
        currentInteraction.current.path[1] = mouseWorldCoords;

        const newLine: LineObject = {
            id: currentInteraction.current.objectId,
            type: "line",
            color: lineTool.color,
            stroke: lineTool.stroke,
            point1: currentInteraction.current.path[0],
            point2: currentInteraction.current.path[1],
        };
        currentInteraction.current.latestObject = newLine;
        updateObject(newLine);
    }

    function handleMouseMoveRectDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const rectTool = currentInteraction.current.tool as RectTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!rectTool.hollow) return;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newRect: RectObject = {
            id: currentInteraction.current.objectId,
            type: "rect",
            color: rectTool.color,
            hollow: rectTool.hollow,
            hollowStroke: rectTool.hollow ? rectTool.hollowStroke : 0,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        };
        currentInteraction.current.latestObject = newRect;
        updateObject(newRect);
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>
    ) {
        if (currentInteraction.current?.type !== "drawing") return;
        const ellipseTool = currentInteraction.current.tool as EllipseTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!ellipseTool.hollow) return;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newEllipse: EllipseObject = {
            id: currentInteraction.current.objectId,
            type: "ellipse",
            color: ellipseTool.color,
            hollow: ellipseTool.hollow,
            hollowStroke: ellipseTool.hollow ? ellipseTool.hollowStroke : 0,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        };
        currentInteraction.current.latestObject = newEllipse;
        updateObject(newEllipse);
    }

    function handleMouseMoveTextDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const textTool = currentInteraction.current.tool as TextTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
        }

        const MIN_W = 20;
        const MIN_H = 10;

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newText: TextObject = {
            id: currentInteraction.current.objectId,
            type: "text",
            text: "",
            color: textTool.color,
            bold: textTool.bold,
            italic: textTool.italic,
            fontFamily: textTool.fontFamily,
            fontSize: textTool.fontSize,
            lineHeight: textTool.lineHeight,
            boxPosition: currentInteraction.current.path[0],
            boxSize: {
                x: Math.max(
                    currentInteraction.current.path[1].x -
                        currentInteraction.current.path[0].x,
                    MIN_W
                ),
                y: Math.max(
                    currentInteraction.current.path[1].y -
                        currentInteraction.current.path[0].y,
                    MIN_H
                ),
            },
        };
        currentInteraction.current.latestObject = newText;
        updateObject(newText);
        setDrawingTextBoxObjectId(currentInteraction.current.objectId);
    }

    // ---------------------------------- Camera handlers ------------------------------------------

    function handleMouseMoveDragCamera(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "camera-drag") return;

        const dx =
            (e.clientX - currentInteraction.current.lastMousePos.x) /
            camera.zoom;
        const dy =
            (e.clientY - currentInteraction.current.lastMousePos.y) /
            camera.zoom;

        canvasContext.setLocalCamera((prev) => ({
            ...prev,
            position: {
                x: prev.position.x - dx,
                y: prev.position.y - dy,
            },
        }));

        currentInteraction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0 ? camera.zoom * zoomFactor : camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(1000, newZoom));

        const worldX = camera.position.x + mouseX / camera.zoom;
        const worldY = camera.position.y + mouseY / camera.zoom;

        canvasContext.setLocalCamera({
            ...camera,
            zoom: clampedZoom,
            position: {
                x: worldX - mouseX / clampedZoom,
                y: worldY - mouseY / clampedZoom,
            },
        });
        commitCamera();
    };

    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    // ---------------------------------- Mobile support ------------------------------------------

    function touchToMouseEvent(
        e: React.TouchEvent<HTMLCanvasElement>,
        button = 0
    ): React.MouseEvent<HTMLCanvasElement> {
        const touch = e.touches[0] ?? e.changedTouches[0];
        return {
            ...e,
            button,
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: e.target,
            preventDefault: () => e.preventDefault(),
        } as unknown as React.MouseEvent<HTMLCanvasElement>;
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseDown(touchToMouseEvent(e, 0));
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const dist = Math.hypot(dx, dy);

            if (lastPinchDistance.current !== null) {
                const scale = dist / lastPinchDistance.current;
                const midX = (touch1.clientX + touch2.clientX) / 2;
                const midY = (touch1.clientY + touch2.clientY) / 2;
                const rect = (
                    e.target as HTMLCanvasElement
                ).getBoundingClientRect();
                const canvasMidX = midX - rect.left;
                const canvasMidY = midY - rect.top;

                canvasContext.setLocalCamera((prev) => {
                    const newZoom = Math.max(
                        0.01,
                        Math.min(100, prev.zoom * scale)
                    );
                    const worldX = prev.position.x + canvasMidX / prev.zoom;
                    const worldY = prev.position.y + canvasMidY / prev.zoom;
                    return {
                        ...prev,
                        zoom: newZoom,
                        position: {
                            x: worldX - canvasMidX / newZoom,
                            y: worldY - canvasMidY / newZoom,
                        },
                    };
                });
            }
            lastPinchDistance.current = dist;
        } else {
            lastPinchDistance.current = null;
            if (e.touches.length === 1) {
                handleMouseMove(touchToMouseEvent(e));
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        commitCamera();
        handleMouseUp(touchToMouseEvent(e));
    };

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}
