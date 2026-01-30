import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import useDimensions from "react-cool-dimensions";
import BaseCanvas from "./BaseCanvas";
import {
    Camera,
    EllipseObject,
    LineObject,
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
    onObjectAmountChange,
}: {
    className?: string;
    selectedTool: Tool;
    selectedColor: string;
    selectedStroke: number;
    onCameraChange: (camera: Camera) => void;
    onObjectAmountChange: (objectAmount: number) => void;
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
    function setObjectsWrapper(objects: Map<string, WorldObject>) {
        setObjects(objects);
        onObjectAmountChange(objects.size);
    }

    // MOUSE EVENTS
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
        handleMouseEvents(
            camera,
            setCameraWrapper,
            selectedTool,
            objects,
            setObjectsWrapper,
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
        case "line":
            drawLine(ctx, object, camera);
            break;
        case "rect":
            drawRect(ctx, object, camera);
            break;
        case "path":
            drawPath(ctx, object, camera);
            break;
        case "ellipse":
            drawEllipse(ctx, object, camera);
            break;
    }
}

function drawRect(
    ctx: CanvasRenderingContext2D,
    object: RectObject,
    camera: Camera
) {
    ctx.beginPath();
    ctx.fillStyle = object.color;

    ctx.rect(
        object.position.x - camera.position.x,
        object.position.y - camera.position.y,
        object.size.x,
        object.size.y
    );
    ctx.fillStyle = object.color;
    ctx.fill();

    // Draw stroke
    ctx.lineWidth = object.stroke;
    ctx.strokeStyle = object.color;
    ctx.stroke();
    ctx.closePath();
}

function drawEllipse(
    ctx: CanvasRenderingContext2D,
    object: EllipseObject,
    camera: Camera
) {
    ctx.beginPath();

    ctx.ellipse(
        object.position.x - camera.position.x + object.size.x / 2, // centerX
        object.position.y - camera.position.y + object.size.y / 2, // centerY
        Math.abs(object.size.x / 2), // radiusX
        Math.abs(object.size.y / 2), // radiusY
        0, //rotation
        0, //startangle
        2 * Math.PI // end angle
    );
    ctx.fillStyle = object.color;
    ctx.fill();

    // Draw stroke
    ctx.lineWidth = object.stroke;
    ctx.strokeStyle = object.color;
    ctx.stroke();

    ctx.closePath();
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    object: PathObject,
    camera: Camera
) {
    if (!object.points || object.points.length < 2) return; // nothing to draw

    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = object.stroke;

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

function drawLine(
    ctx: CanvasRenderingContext2D,
    object: LineObject,
    camera: Camera
) {
    if (!object.point1 || !object.point2) return; // nothing to draw

    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = object.stroke;

    const point1 = object.point1;
    const point2 = object.point2;
    ctx.moveTo(point1.x - camera.position.x, point1.y - camera.position.y);
    ctx.lineTo(point2.x - camera.position.x, point2.y - camera.position.y);

    ctx.stroke();
    ctx.closePath();
}

export function handleMouseEvents(
    camera: Camera,
    setCamera: (camera: Camera) => void,
    selectedTool: Tool,
    objects: Map<string, WorldObject>,
    setObjects: (objects: Map<string, WorldObject>) => void,
    selectedColor: string,
    selectedStroke: number
) {
    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 2;

    // Camera dragging
    const isDragging = useRef(false);
    const lastMousePos = useRef<Vec2 | null>(null);

    // Drawing with pencil
    const isHoldingWithPencil = useRef(false);
    const currentPencilPath = useRef<Vec2[]>([]);
    const currentPencilPathId = useRef<string | null>(null);

    // Drawing with line tool
    const isHoldingWithLine = useRef(false);
    const currentLinePath = useRef<Vec2[]>([]);
    const currentLinePathId = useRef<string | null>(null);

    // Drawing with rect tool
    const isHoldingWithRect = useRef(false);
    const currentRectPath = useRef<Vec2[]>([]);
    const currentRectPathId = useRef<string | null>(null);

    // Drawing with ellipse tool
    const isHoldingWithEllipse = useRef(false);
    const currentEllipsePath = useRef<Vec2[]>([]);
    const currentEllipsePathId = useRef<string | null>(null);

    // GLOBAL mouseup to fix mouse up outside of canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            isDragging.current = false;
            lastMousePos.current = null;
            isHoldingWithPencil.current = false;
        };
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => window.removeEventListener("mouseup", handleWindowMouseUp);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "pencil") {
            isHoldingWithPencil.current = true;
            currentPencilPath.current = [];
            currentPencilPathId.current = uuidv4();
            return;
        }
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "line") {
            isHoldingWithLine.current = true;
            currentLinePath.current = [];
            currentLinePathId.current = uuidv4();
            return;
        }
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "rect") {
            isHoldingWithRect.current = true;
            currentRectPath.current = [];
            currentRectPathId.current = uuidv4();
            return;
        }
        if (e.button === LEFT_MOUSE_BUTTON && selectedTool === "ellipse") {
            isHoldingWithEllipse.current = true;
            currentEllipsePath.current = [];
            currentEllipsePathId.current = uuidv4();
            return;
        }
        if (
            e.button === LEFT_MOUSE_BUTTON ||
            e.button === MIDDLE_MOUSE_BUTTON
        ) {
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }
    };

    function handleMouseMovePencilDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentPencilPath.current.push(mouseWorldCoords);

        const newPath: PathObject = {
            id: currentPencilPathId.current!,
            type: "path",
            color: selectedColor,
            stroke: selectedStroke,
            points: currentPencilPath.current,
            // ??? points: [...currentPencilPath.current],
        };
        setObjects(new Map(objects).set(currentPencilPathId.current!, newPath));
    }

    function handleMouseMoveLineDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentLinePath.current.length === 0) {
            currentLinePath.current[0] = mouseWorldCoords;
            return;
        }

        currentLinePath.current[1] = mouseWorldCoords;

        const newPath: LineObject = {
            id: currentLinePathId.current!,
            type: "line",
            color: selectedColor,
            stroke: selectedStroke,
            point1: currentLinePath.current[0],
            point2: currentLinePath.current[1],
        };
        setObjects(new Map(objects).set(currentLinePathId.current!, newPath));
    }

    function handleMouseMoveRectDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentRectPath.current.length === 0) {
            currentRectPath.current[0] = mouseWorldCoords;
            return;
        }

        currentRectPath.current[1] = mouseWorldCoords;
        const newPath: RectObject = {
            id: currentRectPathId.current!,
            type: "rect",
            color: selectedColor,
            stroke: selectedStroke,
            position: currentRectPath.current[0],
            size: {
                x: currentRectPath.current[1].x - currentRectPath.current[0].x,
                y: currentRectPath.current[1].y - currentRectPath.current[0].y,
            },
        };
        setObjects(new Map(objects).set(currentRectPathId.current!, newPath));
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>
    ) {
        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentEllipsePath.current.length === 0) {
            currentEllipsePath.current[0] = mouseWorldCoords;
            return;
        }

        currentEllipsePath.current[1] = mouseWorldCoords;
        const newPath: EllipseObject = {
            id: currentEllipsePathId.current!,
            type: "ellipse",
            color: selectedColor,
            stroke: selectedStroke,
            position: currentEllipsePath.current[0],
            size: {
                x:
                    currentEllipsePath.current[1].x -
                    currentEllipsePath.current[0].x,
                y:
                    currentEllipsePath.current[1].y -
                    currentEllipsePath.current[0].y,
            },
        };
        setObjects(
            new Map(objects).set(currentEllipsePathId.current!, newPath)
        );
    }

    function handleMouseMoveDragCamera(e: React.MouseEvent<HTMLCanvasElement>) {
        const dx = (e.clientX - lastMousePos.current!.x) / camera.zoom;
        const dy = (e.clientY - lastMousePos.current!.y) / camera.zoom;

        camera.position = {
            x: camera.position.x - dx,
            y: camera.position.y - dy,
        };
        setCamera(camera);

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isHoldingWithPencil.current) {
            handleMouseMovePencilDraw(e);
            return;
        }
        if (isHoldingWithLine.current) {
            handleMouseMoveLineDraw(e);
            return;
        }
        if (isHoldingWithRect.current) {
            handleMouseMoveRectDraw(e);
            return;
        }
        if (isHoldingWithEllipse.current) {
            handleMouseMoveEllipseDraw(e);
            return;
        }

        if (isDragging.current && lastMousePos.current !== null) {
            handleMouseMoveDragCamera(e);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === LEFT_MOUSE_BUTTON) {
            isHoldingWithPencil.current = false;
            isHoldingWithLine.current = false;
            isHoldingWithRect.current = false;
            isHoldingWithEllipse.current = false;
        }
        if (
            e.button === MIDDLE_MOUSE_BUTTON ||
            e.button === LEFT_MOUSE_BUTTON
        ) {
            isDragging.current = false;
            lastMousePos.current = null;
        }
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
