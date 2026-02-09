import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import useDimensions from "react-cool-dimensions";
import CanvasBase from "./CanvasBase";
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

interface CanvasWorldProps {
    objects: Map<string, WorldObject>;
    camera: Camera;
    onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseUp?: React.MouseEventHandler<HTMLCanvasElement>;
    onWheel?: React.WheelEventHandler<HTMLCanvasElement>;
    onContextMenu?: React.MouseEventHandler<HTMLCanvasElement>;
}

// Only renders passed objects and processes passed camera position and zoom
// No interaction handling
function CanvasWorld({
    objects,
    camera,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onContextMenu,
}: CanvasWorldProps) {
    // DRAWING
    const draw = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        drawGrid(ctx, camera);
        drawObjects(ctx, objects, camera);
    };

    return (
        <CanvasBase
            draw={draw}
            width={camera.size.x}
            height={camera.size.y}
            zoom={camera.zoom}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onWheel={onWheel}
            onContextMenu={onContextMenu}
        />
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

export default CanvasWorld;
