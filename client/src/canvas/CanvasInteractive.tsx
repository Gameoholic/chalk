import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
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
import { CheckCircle, FileVideoCamera, Loader2, XCircle } from "lucide-react";

interface CanvasInteractiveProps {
    initialObjects: WorldObject[];
    selectedTool: Tool;
    selectedColor: string;
    selectedStroke: number;
    onObjectUpdated: (object: WorldObject) => void;
    onObjectAmountChange: (amount: number) => void;
    onObjectsCommit: () => void;
    onCameraChange: (camera: Camera) => void;
}

// Handles canvas camera movement and zooming, as well as all mouse interactions including drawing
// Stores the objects state and camera state
function CanvasInteractive({
    initialObjects,
    selectedTool,
    selectedColor,
    selectedStroke,
    onObjectUpdated,
    onObjectAmountChange,
    onObjectsCommit,
    onCameraChange,
}: CanvasInteractiveProps) {
    // CAMERA
    const [camera, setCamera] = useState<Camera>({
        position: { x: 0, y: 0 },
        size: { x: 900, y: 900 },
        zoom: 1,
    });

    // OBJECTS
    const [objects, setObjects] = useState<Map<string, WorldObject>>(
        () => new Map(initialObjects.map((object) => [object.id, object]))
    );

    // Immediately call onChange functions for initial value
    useEffect(() => {
        onObjectAmountChange(objects.size);
    }, [objects.size]);

    useEffect(() => {
        onCameraChange(camera);
    }, [camera]);

    // Automatically set camera size to this component's MAX allocated size
    const { observe, unobserve, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            setCamera({
                position: { x: camera.position.x, y: camera.position.y },
                size: { x: width, y: height },
                zoom: camera.zoom,
            });

            unobserve(); // To stop observing the current target element
            observe(); // To re-start observing the current target element
        },
    });

    function updateCamera(camera: Camera) {
        setCamera(camera);
    }

    // Either add an entirely new object or update an existing one (based on its ID)
    function updateObject(object: WorldObject) {
        const previousObjectAmount = objects.size;

        const newObjects = new Map(objects).set(object.id, object); // todo: is creating a new map every time performant?
        setObjects(newObjects);

        if (previousObjectAmount !== newObjects.size) {
            onObjectAmountChange(newObjects.size);
        }
        onObjectUpdated(object);
    }

    // User released left click so object should be committed to database
    function commitObjects() {
        onObjectsCommit();
    }

    // MOUSE EVENTS
    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
    } = handleMouseEvents(
        selectedTool,
        selectedColor,
        selectedStroke,
        updateObject,
        commitObjects,
        camera,
        updateCamera
    );

    return (
        <div ref={observe} className="h-full w-full">
            <CanvasWorld
                camera={camera}
                objects={objects}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
            />
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
    selectedTool: Tool,
    selectedColor: string,
    selectedStroke: number,
    updateObject: (object: WorldObject) => void,
    commitObjects: () => void,
    camera: Camera,
    setCamera: (camera: Camera) => void
) {
    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 2;

    // Interaction starts with mouse down and ends with (usually) mouse up (or other special cases)
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

    const toolHandleMouseMove: Record<
        DrawingTool,
        (e: React.MouseEvent<HTMLCanvasElement>) => void
    > = {
        pencil: handleMouseMovePencilDraw,
        line: handleMouseMoveLineDraw,
        rect: handleMouseMoveRectDraw,
        ellipse: handleMouseMoveEllipseDraw,
    };

    // GLOBAL mouseup to fix mouse up outside of canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            currentInteraction.current = null;
        };
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => window.removeEventListener("mouseup", handleWindowMouseUp);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (
            e.button === LEFT_MOUSE_BUTTON &&
            (selectedTool === "pencil" ||
                selectedTool === "line" ||
                selectedTool === "rect" ||
                selectedTool === "ellipse")
        ) {
            currentInteraction.current = {
                type: "drawing",
                objectId: uuidv4(),
                tool: selectedTool,
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
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        const newPath: PathObject = {
            id: currentInteraction.current.objectId,
            type: "path",
            color: selectedColor,
            stroke: selectedStroke,
            points: currentInteraction.current.path,
        };
        updateObject(newPath);
    }

    function handleMouseMoveLineDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;

        const newLine: LineObject = {
            id: currentInteraction.current.objectId,
            type: "line",
            color: selectedColor,
            stroke: selectedStroke,
            point1: currentInteraction.current.path[0],
            point2: currentInteraction.current.path[1],
        };
        updateObject(newLine);
    }

    function handleMouseMoveRectDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newRect: RectObject = {
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
        };
        updateObject(newRect);
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>
    ) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            return;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newEllipse: EllipseObject = {
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
        };
        updateObject(newEllipse);
    }

    function handleMouseMoveDragCamera(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "camera-drag") {
            return;
        }

        const dx =
            (e.clientX - currentInteraction.current.lastMousePos.x) /
            camera.zoom;
        const dy =
            (e.clientY - currentInteraction.current.lastMousePos.y) /
            camera.zoom;

        camera.position = {
            x: camera.position.x - dx,
            y: camera.position.y - dy,
        };
        setCamera(camera);

        currentInteraction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            toolHandleMouseMove[currentInteraction.current.tool](e);
            return;
        }

        if (currentInteraction.current?.type === "camera-drag") {
            handleMouseMoveDragCamera(e);
            return;
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        currentInteraction.current = null;
        commitObjects();
    };

    // // Camera zoom
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0 ? camera.zoom * zoomFactor : camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.05, Math.min(100, newZoom));

        const worldX = camera.position.x + mouseX / camera.zoom;
        const worldY = camera.position.y + mouseY / camera.zoom;

        setCamera({
            ...camera,
            zoom: clampedZoom,
            position: {
                x: worldX - mouseX / clampedZoom,
                y: worldY - mouseY / clampedZoom,
            },
        });
    };

    // Right click on canvas
    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
    };
}

export default CanvasInteractive;
