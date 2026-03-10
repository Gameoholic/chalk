import React, { useRef, useEffect, useContext, useMemo } from "react";
import useDimensions from "react-cool-dimensions";
import CanvasWorld from "./CanvasWorld";
import {
    Camera,
    EllipseObject,
    LineObject,
    PathObject,
    RectObject,
    Tool,
    Vec2,
    WorldObject,
} from "../types/canvas";
import { v4 as uuidv4 } from "uuid";
import { CanvasContext } from "../types/context/CanvasContext";

interface CanvasInteractiveProps {
    onObjectsCommit: () => void;
}

function CanvasInteractive({ onObjectsCommit }: CanvasInteractiveProps) {
    const canvasContext = useContext(CanvasContext);

    const { observe, unobserve, width, height } = useDimensions({
        onResize: ({ observe, unobserve, width, height }) => {
            canvasContext.setLocalCamera((prev) => ({
                ...prev,
                size: { x: width, y: height },
            }));
            unobserve();
            observe();
        },
    });

    function updateOrAddObject(object: WorldObject) {
        canvasContext.setLocalUnsavedObjects((prev) => [
            ...prev.filter((obj) => obj.id !== object.id),
            object,
        ]);
    }

    function commitObjects() {
        onObjectsCommit();
    }

    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        resetCamera, // Extracted from mouse events logic
    } = handleMouseEvents(updateOrAddObject, commitObjects);

    const allObjects = useMemo(() => {
        const map = new Map<string, WorldObject>();
        canvasContext
            .getCurrentBoard()
            .objects.forEach((obj) => map.set(obj.id, obj));
        canvasContext.local_unsavedObjects.forEach((obj) =>
            map.set(obj.id, obj)
        );
        return map;
    }, [
        canvasContext.getCurrentBoard().objects,
        canvasContext.local_unsavedObjects,
    ]);

    return (
        <div ref={observe} className="relative h-full w-full overflow-hidden">
            <CanvasWorld
                camera={canvasContext.local_camera}
                objects={allObjects}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
            />

            {/* UI Zoom Indicator / Reset Button */}
            <div className="absolute right-6 bottom-6 flex items-center justify-center">
                <button
                    onClick={resetCamera}
                    className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-lg backdrop-blur-md transition-all select-none hover:bg-white active:scale-95"
                    title="Reset Zoom (Ctrl+0)"
                >
                    {Math.round(canvasContext.local_camera.zoom * 100)}%
                </button>
            </div>
        </div>
    );
}

function screenToWorld(
    e: React.MouseEvent<HTMLCanvasElement>,
    camera: Camera
): Vec2 {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / camera.zoom + camera.position.x;
    const y = (e.clientY - rect.top) / camera.zoom + camera.position.y;
    return { x, y };
}

function handleMouseEvents(
    updateObject: (object: WorldObject) => void,
    commitObjects: () => void
) {
    const canvasContext = useContext(CanvasContext);

    const selectedTool: Tool = canvasContext.local_selectedTool;
    const selectedColor: string = canvasContext.local_selectedColor;
    const selectedStroke: number = canvasContext.local_selectedStroke;
    const camera: Camera = canvasContext.local_camera;

    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;

    const currentInteraction = useRef<
        DrawingInteraction | CameraDragInteraction | null
    >(null);

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
        tool: DrawingTool;
        path: Vec2[];
    }

    type DrawingTool = Exclude<Tool, "none" | "select">;

    const resetCamera = () => {
        canvasContext.setLocalCamera((prev) => ({
            ...prev,
            zoom: 1,
            position: { x: 0, y: 0 },
        }));
    };

    // GLOBAL Listeners (Window Mouse Up + Shortcuts)
    useEffect(() => {
        const handleWindowMouseUp = () => {
            currentInteraction.current = null;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+0 or Meta(Cmd)+0
            if ((e.ctrlKey || e.metaKey) && e.key === "0") {
                e.preventDefault();
                resetCamera();
            }
        };

        window.addEventListener("mouseup", handleWindowMouseUp);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("mouseup", handleWindowMouseUp);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [camera]); // Re-bind if camera context changes to ensure reset uses latest refs

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (
            e.button === LEFT_MOUSE_BUTTON &&
            ["pencil", "line", "rect", "ellipse"].includes(selectedTool)
        ) {
            currentInteraction.current = {
                type: "drawing",
                objectId: uuidv4(),
                tool: selectedTool as DrawingTool,
                path: [],
            };
            return;
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

    function handleMouseMovePencilDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        updateObject({
            id: currentInteraction.current.objectId,
            type: "path",
            color: selectedColor,
            stroke: selectedStroke,
            points: [...currentInteraction.current.path],
        } as PathObject);
    }

    function handleMouseMoveLineDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }
        currentInteraction.current.path[1] = mouseWorldCoords;

        updateObject({
            id: currentInteraction.current.objectId,
            type: "line",
            color: selectedColor,
            stroke: selectedStroke,
            point1: currentInteraction.current.path[0],
            point2: currentInteraction.current.path[1],
        } as LineObject);
    }

    function handleMouseMoveRectDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") return;
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }
        currentInteraction.current.path[1] = mouseWorldCoords;

        updateObject({
            id: currentInteraction.current.objectId,
            type: "rect",
            color: selectedColor,
            stroke: selectedStroke,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        } as RectObject);
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>
    ) {
        if (currentInteraction.current?.type !== "drawing") return;
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }
        currentInteraction.current.path[1] = mouseWorldCoords;

        updateObject({
            id: currentInteraction.current.objectId,
            type: "ellipse",
            color: selectedColor,
            stroke: selectedStroke,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        } as EllipseObject);
    }

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

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            const tool = currentInteraction.current.tool;
            if (tool === "pencil") handleMouseMovePencilDraw(e);
            if (tool === "line") handleMouseMoveLineDraw(e);
            if (tool === "rect") handleMouseMoveRectDraw(e);
            if (tool === "ellipse") handleMouseMoveEllipseDraw(e);
            return;
        }
        if (currentInteraction.current?.type === "camera-drag") {
            handleMouseMoveDragCamera(e);
        }
    };

    const handleMouseUp = () => {
        if (currentInteraction.current?.type === "drawing") {
            commitObjects();
        }
        currentInteraction.current = null;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0 ? camera.zoom * zoomFactor : camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(100, newZoom));

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
    };

    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        resetCamera,
    };
}

export default CanvasInteractive;
