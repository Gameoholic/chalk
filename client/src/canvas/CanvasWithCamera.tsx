import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import useDimensions from "react-cool-dimensions";
import BaseCanvas from "./BaseCanvas";
import {
    Camera,
    PathObject,
    RectObject,
    Vec2,
    WorldObject,
} from "./CanvasTypes";

function CanvasWithCamera({ className = "" }: { className?: string }) {
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

    // CAMERA
    const [camera, setCamera] = useState<Camera>({
        position: { x: 0, y: 0 },
        size: { x: 900, y: 900 },
        zoom: 1,
    });
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
        handleCamera(camera, setCamera);

    // DRAWING
    const draw = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        drawGrid(ctx, camera);

        const objects: WorldObject[] = [
            {
                type: "rect",
                position: { x: 0, y: 0 },
                size: { x: 30, y: 30 },
                color: "#000000" + "FF",
                id: "1",
                stroke: 1,
            },
            {
                type: "path",
                points: [
                    { x: 100, y: 2 },
                    { x: 15, y: 40 },
                ],
                color: "#F42000" + "8F",
                id: "2",
                stroke: 1,
            },

            // wavy freestyle
            {
                type: "path",
                points: [
                    { x: 50, y: 150 },
                    { x: 70, y: 140 },
                    { x: 90, y: 155 },
                    { x: 110, y: 145 },
                    { x: 130, y: 160 },
                    { x: 150, y: 150 },
                ],
                color: "#F42000" + "8F",
                id: "3",
                stroke: 1,
            },

            // sharp zig-zag
            {
                type: "path",
                points: [
                    { x: 200, y: 50 },
                    { x: 220, y: 80 },
                    { x: 240, y: 50 },
                    { x: 260, y: 80 },
                    { x: 280, y: 50 },
                ],
                color: "#000000" + "FF",
                id: "4",
                stroke: 1,
            },

            // loose freehand scribble
            {
                type: "path",
                points: [
                    { x: 300, y: 200 },
                    { x: 310, y: 190 },
                    { x: 325, y: 205 },
                    { x: 315, y: 215 },
                    { x: 330, y: 225 },
                    { x: 350, y: 210 },
                ],
                color: "#F42000" + "8F",
                id: "5",
                stroke: 1,
            },
        ];

        const worldMap: Map<string, WorldObject> = new Map();
        objects.forEach((obj) => worldMap.set(obj.id, obj));
        drawObjects(ctx, worldMap, camera);
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

export function handleCamera(
    camera: Camera,
    setCamera: React.Dispatch<React.SetStateAction<Camera>>
) {
    // Camera dragging
    const isDragging = useRef(false);
    const lastMousePos = useRef<Vec2 | null>(null);

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
        console.log(e.button);
        if (e.button !== 0) return; // only allow left mouse button
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging.current || !lastMousePos.current) return;

        const dx = (e.clientX - lastMousePos.current.x) / camera.zoom;
        const dy = (e.clientY - lastMousePos.current.y) / camera.zoom;

        setCamera((prev) => ({
            ...prev,
            position: { x: prev.position.x - dx, y: prev.position.y - dy },
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return; // only allow left mouse button
        isDragging.current = false;
        lastMousePos.current = null;
    };

    // Camera zoom
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setCamera((prev) => {
            const newZoom =
                e.deltaY < 0 ? prev.zoom * zoomFactor : prev.zoom / zoomFactor;
            const clampedZoom = Math.max(0.05, Math.min(100, newZoom));

            const worldX = prev.position.x + mouseX / prev.zoom;
            const worldY = prev.position.y + mouseY / prev.zoom;

            return {
                ...prev,
                zoom: clampedZoom,
                position: {
                    x: worldX - mouseX / clampedZoom,
                    y: worldY - mouseY / clampedZoom,
                },
            };
        });
    };

    return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}

export default CanvasWithCamera;
