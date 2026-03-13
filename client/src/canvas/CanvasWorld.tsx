import React from "react";
import CanvasBase from "./CanvasBase";
import {
    Camera,
    EllipseObject,
    EraserPathObject,
    LineObject,
    PathObject,
    RectObject,
    WorldObject,
} from "../types/canvas";

interface CanvasWorldProps {
    objects: Map<string, WorldObject>;
    camera: Camera;
    onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseUp?: React.MouseEventHandler<HTMLCanvasElement>;
    onWheel?: React.WheelEventHandler<HTMLCanvasElement>;
    onContextMenu?: React.MouseEventHandler<HTMLCanvasElement>;
}

/**
 * Ensures a stroke is always visible on screen.
 * Reads the actual applied scale from the context transform so it's
 * always in sync with whatever zoom CanvasBase just called ctx.scale() with.
 */
const getVisibleStroke = (stroke: number, ctx: CanvasRenderingContext2D) => {
    const zoom = ctx.getTransform().a;
    return Math.max(stroke, 1 / zoom);
};

function CanvasWorld({ objects, camera, ...handlers }: CanvasWorldProps) {
    const drawGrid_ = (ctx: CanvasRenderingContext2D) => {
        drawGrid(ctx, camera);
    };

    const drawObjects_ = (ctx: CanvasRenderingContext2D) => {
        drawObjects(ctx, objects, camera);
    };

    return (
        <div
            style={{
                position: "relative",
                width: camera.size.x,
                height: camera.size.y,
                overflow: "hidden",
            }}
        >
            {/* Grid Layer */}
            <CanvasBase
                draw={drawGrid_}
                width={camera.size.x}
                height={camera.size.y}
                zoom={camera.zoom}
                className="bg-white"
                style={{ position: "absolute", top: 0, left: 0 }}
            />
            {/* Object Layer */}
            <CanvasBase
                draw={drawObjects_}
                width={camera.size.x}
                height={camera.size.y}
                zoom={camera.zoom}
                style={{ position: "absolute", top: 0, left: 0 }}
                {...handlers}
            />
        </div>
    );
}

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
    const MIN_TILE_SIZE = 50;
    const MAX_TILE_SIZE = 200;
    let adaptiveGridSize = MAX_TILE_SIZE;

    while (adaptiveGridSize * camera.zoom < MIN_TILE_SIZE) {
        adaptiveGridSize *= 2;
    }
    while (adaptiveGridSize * camera.zoom > MAX_TILE_SIZE) {
        adaptiveGridSize /= 2;
    }

    ctx.beginPath();
    ctx.strokeStyle = "#e2e8f0"; // Slate-200
    ctx.lineWidth = 1 / camera.zoom; // Always 1px on screen

    const left = camera.position.x;
    const top = camera.position.y;
    const width = camera.size.x / camera.zoom;
    const height = camera.size.y / camera.zoom;

    const startX = Math.floor(left / adaptiveGridSize) * adaptiveGridSize;
    const startY = Math.floor(top / adaptiveGridSize) * adaptiveGridSize;

    for (
        let x = startX;
        x < left + width + adaptiveGridSize;
        x += adaptiveGridSize
    ) {
        ctx.moveTo(x - camera.position.x, 0);
        ctx.lineTo(x - camera.position.x, height);
    }

    for (
        let y = startY;
        y < top + height + adaptiveGridSize;
        y += adaptiveGridSize
    ) {
        ctx.moveTo(0, y - camera.position.y);
        ctx.lineTo(width, y - camera.position.y);
    }

    ctx.stroke();
}

function drawObjects(
    ctx: CanvasRenderingContext2D,
    objects: Map<string, WorldObject>,
    camera: Camera
) {
    objects.forEach((object) => {
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
            case "eraser-path":
                drawEraserPath(ctx, object, camera);
                break;
            case "ellipse":
                drawEllipse(ctx, object, camera);
                break;
        }
    });
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
    ctx.fill();

    ctx.lineWidth = getVisibleStroke(object.stroke, ctx);
    ctx.strokeStyle = object.color;
    ctx.stroke();
}

function drawEllipse(
    ctx: CanvasRenderingContext2D,
    object: EllipseObject,
    camera: Camera
) {
    ctx.beginPath();
    ctx.ellipse(
        object.position.x - camera.position.x + object.size.x / 2,
        object.position.y - camera.position.y + object.size.y / 2,
        Math.abs(object.size.x / 2),
        Math.abs(object.size.y / 2),
        0,
        0,
        2 * Math.PI
    );
    ctx.fillStyle = object.color;
    ctx.fill();

    ctx.lineWidth = getVisibleStroke(object.stroke, ctx);
    ctx.strokeStyle = object.color;
    ctx.stroke();
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    object: PathObject,
    camera: Camera
) {
    if (!object.points || object.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = getVisibleStroke(object.stroke, ctx);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.moveTo(
        object.points[0].x - camera.position.x,
        object.points[0].y - camera.position.y
    );
    for (let i = 1; i < object.points.length; i++) {
        ctx.lineTo(
            object.points[i].x - camera.position.x,
            object.points[i].y - camera.position.y
        );
    }
    ctx.stroke();
}

function drawLine(
    ctx: CanvasRenderingContext2D,
    object: LineObject,
    camera: Camera
) {
    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = getVisibleStroke(object.stroke, ctx);
    ctx.lineCap = "round";
    ctx.moveTo(
        object.point1.x - camera.position.x,
        object.point1.y - camera.position.y
    );
    ctx.lineTo(
        object.point2.x - camera.position.x,
        object.point2.y - camera.position.y
    );
    ctx.stroke();
}

function drawEraserPath(
    ctx: CanvasRenderingContext2D,
    object: EraserPathObject,
    camera: Camera
) {
    if (!object.points || object.points.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.lineWidth = getVisibleStroke(object.stroke, ctx);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.moveTo(
        object.points[0].x - camera.position.x,
        object.points[0].y - camera.position.y
    );
    for (let i = 1; i < object.points.length; i++) {
        ctx.lineTo(
            object.points[i].x - camera.position.x,
            object.points[i].y - camera.position.y
        );
    }
    ctx.stroke();
    ctx.restore();
}

export default CanvasWorld;
