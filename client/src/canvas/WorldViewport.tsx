import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import useDimensions from "react-cool-dimensions";
import BaseCanvas from "./BaseCanvas";
import {
    Camera,
    PathObject,
    RectObject,
    Tool,
    Vec2,
    WorldObject,
} from "./CanvasTypes";
import { v4 as uuidv4 } from "uuid";

function WorldViewport({
    className = "",
    selectedTool,
    selectedColor,
    selectedStroke,
    onCameraChange,
}: {
    className?: string;
    selectedTool: Tool;
    selectedColor: string;
    selectedStroke: number;
    onCameraChange: (camera: Camera) => void;
}) {
    // CAMERA
    const [camera, setCamera] = useState<Camera>({
        position: { x: 0, y: 0 },
        size: { x: 900, y: 900 },
        zoom: 1,
    });
    function setCameraWrapper(camera: Camera) {
        setCamera(camera);
        onCameraChange(camera);
    }

    // Automatically set camera size to this component's MAX allocated size
    const { observe, unobserve, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            setCameraWrapper({
                position: { x: camera.position.x, y: camera.position.y },
                size: { x: width, y: height },
                zoom: camera.zoom,
            });
            onCameraChange(camera);

            unobserve(); // To stop observing the current target element
            observe(); // To re-start observing the current target element
        },
    });

    // OBJECTS
    const [objects, setObjects] = useState<Map<string, WorldObject>>(new Map());

    // MOUSE EVENTS
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
        handleMouseEvents(
            camera,
            setCameraWrapper,
            selectedTool,
            objects,
            setObjects,
            selectedColor,
            selectedStroke
        );

    // DRAWING
    const draw = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        drawGrid(ctx, camera);

        drawObjects(ctx, objects, camera);
    };

    return (
        <div className={className} ref={observe}>
            <BaseCanvas
                draw={draw}
                width={camera.size.x}
                height={camera.size.y}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onWheel={handleWheel}
                zoom={camera.zoom}
                onContextMenu={(e: React.MouseEvent<HTMLCanvasElement>) =>
                    e.preventDefault()
                }
            />
        </div>
    );
}

/**
 * Draws a grid that scales with the world, but adjusts its density
 * so cells always appear roughly the same size on screen.
 */
function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
    // These thresholds control the "Screen Size" of the tiles.
    // If you want giant tiles, increase these numbers.
    const MIN_TILE_SIZE = 50; // Tiles won't get smaller than this value on screen
    const MAX_TILE_SIZE = 200; // Tiles won't get bigger than this value on screen
    let adaptiveGridSize = MAX_TILE_SIZE;

    while (adaptiveGridSize * camera.zoom < MIN_TILE_SIZE) {
        adaptiveGridSize *= 2;
    }
    while (adaptiveGridSize * camera.zoom > MAX_TILE_SIZE) {
        adaptiveGridSize /= 2;
    }

    ctx.beginPath();
    ctx.strokeStyle = "#dddddd"; // Light gray

    // Important: divide lineWidth by zoom so lines stay 1px sharp on screen
    ctx.lineWidth = 1 / camera.zoom;

    // Calculate visible world bounds
    const left = camera.position.x;
    const top = camera.position.y;
    const width = camera.size.x / camera.zoom;
    const height = camera.size.y / camera.zoom;

    // Snap start positions to the grid to prevent "drifting"
    const startX = Math.floor(left / adaptiveGridSize) * adaptiveGridSize;
    const startY = Math.floor(top / adaptiveGridSize) * adaptiveGridSize;

    // Draw Vertical Lines
    for (
        let x = startX;
        x < left + width + adaptiveGridSize;
        x += adaptiveGridSize
    ) {
        // We draw in World Coordinates because BaseCanvas applies the zoom
        // Subtract camera.position because BaseCanvas does NOT handle translation, only scale
        // (Assuming BaseCanvas is just context.scale(zoom,zoom))

        // Actually, looking at your previous code, you handle Translation manually in drawRect
        // by doing (obj.x - cam.x). We must do the same here.
        const drawX = x - camera.position.x;
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, height);
    }

    // Draw Horizontal Lines
    for (
        let y = startY;
        y < top + height + adaptiveGridSize;
        y += adaptiveGridSize
    ) {
        const drawY = y - camera.position.y;
        ctx.moveTo(0, drawY);
        ctx.lineTo(width, drawY);
    }

    ctx.stroke();
    ctx.closePath();
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

function drawObjects(
    ctx: CanvasRenderingContext2D,
    objects: Map<string, WorldObject>,
    camera: Camera
) {
    objects.forEach((object) => drawObject(ctx, object, camera));
}

function drawObject(
    ctx: CanvasRenderingContext2D,
    object: WorldObject,
    camera: Camera
) {
    switch (object.type) {
        case "rect":
            drawRect(ctx, object, camera);
            break;
        case "path":
            drawPath(ctx, object, camera);
            break;
    }
}

function drawRect(
    ctx: CanvasRenderingContext2D,
    object: RectObject,
    camera: Camera
) {
    ctx.fillStyle = object.color;
    const localPosition: Vec2 = {
        x: object.position.x - camera.position.x,
        y: object.position.y - camera.position.y,
    };
    ctx.fillRect(
        localPosition.x,
        localPosition.y,
        object.size.x,
        object.size.y
    );
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    object: PathObject,
    camera: Camera
) {
    if (!object.points || object.points.length < 2) return; // nothing to draw

    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = 2;

    const first = object.points[0];
    ctx.moveTo(first.x - camera.position.x, first.y - camera.position.y);

    // draw lines to the rest of the points
    for (let i = 1; i < object.points.length; i++) {
        const p = object.points[i];
        ctx.lineTo(p.x - camera.position.x, p.y - camera.position.y);
    }

    ctx.stroke();
    ctx.closePath();
}

export function handleMouseEvents(
    camera: Camera,
    setCamera: (camera: Camera) => void,
    selectedTool: Tool,
    objects: Map<string, WorldObject>,
    setObjects: React.Dispatch<React.SetStateAction<Map<string, WorldObject>>>,
    selectedColor: string,
    selectedStroke: number
) {
    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 2;

    // Camera dragging
    const isDragging = useRef(false);
    const lastMousePos = useRef<Vec2 | null>(null);

    // Drawing
    let isHoldingWithPencil = false;

    // GLOBAL mouseup to fix mouse up outside of canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            isDragging.current = false;
            lastMousePos.current = null;
        };
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => window.removeEventListener("mouseup", handleWindowMouseUp);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "pencil") {
            isHoldingWithPencil = true;
            return;
        }
        if (e.button !== LEFT_MOUSE_BUTTON && e.button !== MIDDLE_MOUSE_BUTTON)
            return;
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    let previousMouseCoords: Vec2 | null = null;
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isHoldingWithPencil) {
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
            if (previousMouseCoords !== null) {
                const newId = uuidv4();
                const newPath: PathObject = {
                    id: newId,
                    type: "path",
                    color: selectedColor,
                    stroke: selectedStroke,
                    points: [previousMouseCoords, mouseWorldCoords],
                };

                setObjects((prev) => new Map(prev).set(newId, newPath));
            }
            previousMouseCoords = mouseWorldCoords;
        }

        if (!isDragging.current || !lastMousePos.current) return;

        const dx = (e.clientX - lastMousePos.current.x) / camera.zoom;
        const dy = (e.clientY - lastMousePos.current.y) / camera.zoom;

        camera.position = {
            x: camera.position.x - dx,
            y: camera.position.y - dy,
        };
        setCamera(camera);

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "pencil") {
            isHoldingWithPencil = false;
            return;
        }
        if (e.button !== LEFT_MOUSE_BUTTON && e.button !== MIDDLE_MOUSE_BUTTON)
            return;
        isDragging.current = false;
        lastMousePos.current = null;
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

    return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}

export default WorldViewport;
