import React, { useContext } from "react";
import CanvasBase from "./CanvasDOMRenderer";
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
} from "../types/canvas";
import { AntiAliasingContext } from "../types/context/AntiAliasingContext";
import { computeLines, getCursorLineAndOffset } from "./textLayout";

interface CanvasRendererProps {
    objects: Map<string, WorldObject>;
    camera: Camera;
    selectedObjectId: string | null;
    textCursor?: { objectId: string; index: number; visible: boolean };
    onMouseDown?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
    onMouseUp?: React.MouseEventHandler<HTMLCanvasElement>;
    onWheel?: React.WheelEventHandler<HTMLCanvasElement>;
    onContextMenu?: React.MouseEventHandler<HTMLCanvasElement>;
    // Mobile support:
    onTouchStart?: React.TouchEventHandler<HTMLCanvasElement>;
    onTouchMove?: React.TouchEventHandler<HTMLCanvasElement>;
    onTouchEnd?: React.TouchEventHandler<HTMLCanvasElement>;
}

// Only renders passed objects and processes passed camera position and zoom
// No interaction handling
// Doesn't reference any context. Randers as is, as the passed parameters say
function CanvasRenderer({
    objects,
    camera,
    selectedObjectId,
    textCursor,
    ...handlers
}: CanvasRendererProps) {
    const antiAliasing = useContext(AntiAliasingContext).value;

    const drawGrid_ = (ctx: CanvasRenderingContext2D) => {
        drawGrid(ctx, camera);
    };

    const drawObjects_ = (ctx: CanvasRenderingContext2D) => {
        drawObjects(ctx, objects, camera, antiAliasing, textCursor);

        if (selectedObjectId) {
            const selected = objects.get(selectedObjectId);
            if (selected) drawSelectionHighlight(ctx, selected, camera);
        }
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
            {/* We separate into two layers so eraser will work on the object layer */}

            {/* Grid layer — never affected by eraser */}
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

/**
 * Apply anti aliasing to a stroke size and return the new size (if enabled, stroke size will ALWAYS be opaque and be at least 1px)
 */
const getStrokeSize = (
    stroke: number,
    ctx: CanvasRenderingContext2D,
    antiAliasing: boolean
) => {
    // Ensures a stroke is always visible on screen.
    // Reads the actual applied scale from the context transform so it's
    // always in sync with whatever zoom CanvasBase just called ctx.scale() with.

    // Besides anti aliasing and disabling it, there's no other solution to zoomed out drwaings looking better, besides using OpenGL or other rendering frameworks
    // Anti aliasing = true -> Return stroke with the alpha automatically lowering when zoomed out (DOM canvas feature) to simulate sub-pixel sizes
    if (antiAliasing) {
        return stroke;
    }
    // Otherwise, always render so it's at least stroke = 1px
    const zoom = ctx.getTransform().a;
    return Math.max(stroke, 1 / zoom);
};

/**
 * Draws a grid that scales with the world, but adjusts its density
 * so cells always appear roughly the same size on screen.
 */
function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera) {
    // These thresholds control the "Screen Size" of the tiles.
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
    ctx.strokeStyle = "#e2e8f0"; // Light gray
    ctx.lineWidth = 1 / camera.zoom; // Always 1px on screen

    const left = camera.position.x;
    const top = camera.position.y;
    const width = camera.size.x / camera.zoom;
    const height = camera.size.y / camera.zoom;

    // Snap start positions to the grid to prevent "drifting"
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

function getObjectBoundingBox(
    obj: WorldObject
): { min: Vec2; max: Vec2 } | null {
    switch (obj.type) {
        case "path":
        case "eraser-path": {
            if (obj.points.length === 0) return null;
            const xs = obj.points.map((p) => p.x);
            const ys = obj.points.map((p) => p.y);
            const pad = (obj.stroke ?? 0) / 2;
            return {
                min: { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad },
                max: { x: Math.max(...xs) + pad, y: Math.max(...ys) + pad },
            };
        }
        case "line": {
            const pad = (obj.stroke ?? 0) / 2;
            return {
                min: {
                    x: Math.min(obj.point1.x, obj.point2.x) - pad,
                    y: Math.min(obj.point1.y, obj.point2.y) - pad,
                },
                max: {
                    x: Math.max(obj.point1.x, obj.point2.x) + pad,
                    y: Math.max(obj.point1.y, obj.point2.y) + pad,
                },
            };
        }
        case "rect":
        case "ellipse": {
            const x0 = Math.min(obj.position.x, obj.position.x + obj.size.x);
            const y0 = Math.min(obj.position.y, obj.position.y + obj.size.y);
            return {
                min: { x: x0, y: y0 },
                max: {
                    x: x0 + Math.abs(obj.size.x),
                    y: y0 + Math.abs(obj.size.y),
                },
            };
        }
        default:
            return null;
    }
}

function drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    obj: WorldObject,
    camera: Camera
) {
    const bb = getObjectBoundingBox(obj);
    if (!bb) return;

    const PADDING = 6 / camera.zoom; // 6px padding in screen space, constant regardless of zoom

    const x = bb.min.x - camera.position.x - PADDING;
    const y = bb.min.y - camera.position.y - PADDING;
    const w = bb.max.x - bb.min.x + PADDING * 2;
    const h = bb.max.y - bb.min.y + PADDING * 2;

    ctx.save();
    ctx.strokeStyle = "#ff8ca5";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]); // dashes scale with zoom
    ctx.lineDashOffset = 0;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
}

function drawObjects(
    ctx: CanvasRenderingContext2D,
    objects: Map<string, WorldObject>,
    camera: Camera,
    antiAliasing: boolean,
    textCursor?: { objectId: string; index: number; visible: boolean }
) {
    objects.forEach((object) => {
        switch (object.type) {
            case "line":
                drawLine(ctx, object, camera, antiAliasing);
                break;
            case "rect":
                drawRect(ctx, object, camera, antiAliasing);
                break;
            case "path":
                drawPath(ctx, object, camera, antiAliasing);
                break;
            case "eraser-path":
                drawEraserPath(ctx, object, camera, antiAliasing);
                break;
            case "ellipse":
                drawEllipse(ctx, object, camera, antiAliasing);
                break;
            case "text":
                drawText(
                    ctx,
                    object,
                    camera,
                    antiAliasing,
                    textCursor?.objectId === object.id
                        ? {
                              index: textCursor.index,
                              visible: textCursor.visible,
                          }
                        : undefined
                );
                break;
        }
    });
}

function drawRect(
    ctx: CanvasRenderingContext2D,
    object: RectObject,
    camera: Camera,
    antiAliasing: boolean
) {
    ctx.beginPath();
    ctx.rect(
        object.position.x - camera.position.x,
        object.position.y - camera.position.y,
        object.size.x,
        object.size.y
    );

    if (object.hollow) {
        ctx.strokeStyle = object.color;
        ctx.lineWidth = getStrokeSize(
            getStrokeSize(object.hollowStroke, ctx, antiAliasing),
            ctx,
            true
        );

        // Single point — stroke() won't render anything, draw a filled circle instead
        if (object.size.x === 0 || object.size.y === 0) {
            const radius = ctx.lineWidth / 2;
            ctx.arc(
                object.position.x - camera.position.x,
                object.position.y - camera.position.y,
                radius,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = object.color;
            ctx.fill();
            return;
        }

        ctx.stroke();
    } else {
        ctx.fillStyle = object.color;
        ctx.fill();
    }
}

function drawEllipse(
    ctx: CanvasRenderingContext2D,
    object: EllipseObject,
    camera: Camera,
    antiAliasing: boolean
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

    if (object.hollow) {
        ctx.strokeStyle = object.color;
        ctx.lineWidth = getStrokeSize(
            getStrokeSize(object.hollowStroke, ctx, antiAliasing),
            ctx,
            true
        );

        // Single point — stroke() won't render anything, draw a filled circle instead
        if (object.size.x === 0 || object.size.y === 0) {
            const radius = ctx.lineWidth / 2;
            ctx.arc(
                object.position.x - camera.position.x,
                object.position.y - camera.position.y,
                radius,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = object.color;
            ctx.fill();
            return;
        }

        ctx.stroke();
    } else {
        ctx.fillStyle = object.color;
        ctx.fill();
    }
}

function drawText(
    ctx: CanvasRenderingContext2D,
    object: TextObject,
    camera: Camera,
    antiAliasing: boolean,
    cursor?: { index: number; visible: boolean }
) {
    const x = object.boxPosition.x - camera.position.x;
    const y = object.boxPosition.y - camera.position.y;

    // Dashed box outline
    ctx.save();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = getStrokeSize(1, ctx, antiAliasing);
    ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
    ctx.strokeRect(x, y, object.boxSize.x, object.boxSize.y);
    ctx.restore();

    if (!object.text) return;

    // Text rendering
    const style = [
        object.italic ? "italic" : "",
        object.bold ? "bold" : "",
        `${object.fontSize}px`,
        object.fontFamily,
    ]
        .filter(Boolean)
        .join(" ");

    ctx.save();
    ctx.font = style;
    ctx.fillStyle = object.color;
    ctx.textBaseline = "top";

    // Word-wrap the text into the box
    const lineHeightPx = object.fontSize * (object.lineHeight ?? 1.2);
    const maxWidth = object.boxSize.x - 8;
    wrapText(ctx, object.text, x + 4, y + 4, maxWidth, lineHeightPx);

    // Draw cursor
    if (cursor?.visible) {
        const lines = computeLines(object.text, ctx, maxWidth);
        const { lineIndex, offsetInLine } = getCursorLineAndOffset(
            lines,
            cursor.index
        );
        const line = lines[lineIndex];

        const cursorX =
            x + 4 + ctx.measureText(line.text.slice(0, offsetInLine)).width;
        const cursorY = y + 4 + lineIndex * lineHeightPx;

        ctx.beginPath();
        ctx.strokeStyle = object.color;
        ctx.lineWidth = getStrokeSize(1, ctx, antiAliasing);
        ctx.setLineDash([]);
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + object.fontSize);
        ctx.stroke();
    }

    ctx.restore();
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
) {
    const lines = computeLines(text, ctx, maxWidth);
    lines.forEach((line, i) => {
        ctx.fillText(line.text, x, y + i * lineHeight);
    });
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    object: PathObject,
    camera: Camera,
    antiAliasing: boolean
) {
    if (!object.points || object.points.length < 1) return; // sanity check
    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = getStrokeSize(object.stroke, ctx, antiAliasing);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Single point — stroke() won't render anything, draw a circle instead
    if (object.points.length === 1) {
        const radius = getStrokeSize(object.stroke, ctx, antiAliasing) / 2;
        ctx.arc(
            object.points[0].x - camera.position.x,
            object.points[0].y - camera.position.y,
            radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = object.color;
        ctx.fill();
        return;
    }

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
    camera: Camera,
    antiAliasing: boolean
) {
    ctx.beginPath();
    ctx.strokeStyle = object.color;
    ctx.lineWidth = getStrokeSize(object.stroke, ctx, antiAliasing);
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
    camera: Camera,
    antiAliasing: boolean
) {
    if (!object.points || object.points.length < 1) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,1)"; // bugfix: Always erase fully regardless of current alpha set by previous tools
    ctx.lineWidth = getStrokeSize(object.stroke, ctx, antiAliasing);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Single point — stroke() won't render anything, draw a circle instead
    if (object.points.length === 1) {
        const radius = getStrokeSize(object.stroke, ctx, antiAliasing) / 2;
        ctx.arc(
            object.points[0].x - camera.position.x,
            object.points[0].y - camera.position.y,
            radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fill();
        ctx.restore();
        return;
    }

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

export default CanvasRenderer;
