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
import { computeLines, getCursorLineAndOffset } from "./computeTextLayout";

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

function drawTextResizeHandles(
    ctx: CanvasRenderingContext2D,
    object: TextObject,
    camera: Camera
) {
    const halfHandle = 4 / camera.zoom;
    const corners: Vec2[] = [
        { x: object.boxPosition.x, y: object.boxPosition.y },
        { x: object.boxPosition.x + object.boxSize.x, y: object.boxPosition.y },
        { x: object.boxPosition.x, y: object.boxPosition.y + object.boxSize.y },
        {
            x: object.boxPosition.x + object.boxSize.x,
            y: object.boxPosition.y + object.boxSize.y,
        },
    ];

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([]);
    corners.forEach((corner) => {
        const cx = corner.x - camera.position.x;
        const cy = corner.y - camera.position.y;
        ctx.beginPath();
        ctx.rect(
            cx - halfHandle,
            cy - halfHandle,
            halfHandle * 2,
            halfHandle * 2
        );
        ctx.fill();
        ctx.stroke();
    });
    ctx.restore();
}

export function drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    obj: WorldObject,
    camera: Camera
) {
    const bb = getObjectBoundingBox(obj);
    if (!bb) return;

    const PADDING = 6 / camera.zoom;
    const x = bb.min.x - camera.position.x - PADDING;
    const y = bb.min.y - camera.position.y - PADDING;
    const w = bb.max.x - bb.min.x + PADDING * 2;
    const h = bb.max.y - bb.min.y + PADDING * 2;

    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

export function drawMultipleObjectSelectionBox(
    ctx: CanvasRenderingContext2D,
    start: Vec2,
    end: Vec2,
    camera: Camera
) {
    const x = start.x - camera.position.x;
    const y = start.y - camera.position.y;
    const w = end.x - start.x;
    const h = end.y - start.y;

    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

export function drawObjects(
    ctx: CanvasRenderingContext2D,
    objects: Map<string, WorldObject>,
    camera: Camera,
    antiAliasing: boolean,
    drawingTextBoxObjectId: string | null,
    selectedObjectIds: Set<string>,
    textCursor?: { objectId: string; index: number; visible: boolean; selectionStart?: number; selectionEnd?: number }
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
                              selectionStart: textCursor.selectionStart,
                              selectionEnd: textCursor.selectionEnd,
                          }
                        : undefined,
                    drawingTextBoxObjectId,
                    selectedObjectIds.has(object.id)
                );
                break;
        }

        // draw highlight if object is selected
        if (selectedObjectIds.has(object.id)) {
            drawSelectionHighlight(ctx, object, camera);
        }

        // draw corners on text object if selected
        if (selectedObjectIds.has(object.id) && object.type === "text") {
            drawTextResizeHandles(ctx, object, camera);
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
    cursor?: { index: number; visible: boolean; selectionStart?: number; selectionEnd?: number },
    drawingTextBoxObjectId?: string | null,
    isSelected?: boolean
) {
    const x = object.boxPosition.x - camera.position.x;
    const y = object.boxPosition.y - camera.position.y;

    // Draw dashed box outline when text is being edited, or textbox is being drawn
    // cursor is only defined as long as text is being actively edited
    if (cursor || drawingTextBoxObjectId === object.id || isSelected) {
        ctx.save();
        ctx.strokeStyle = object.color;
        ctx.lineWidth = getStrokeSize(1, ctx, antiAliasing);
        ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeRect(x, y, object.boxSize.x, object.boxSize.y);
        ctx.restore();
    }

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

    const lineHeightPx = object.fontSize * object.lineHeight;
    const maxWidth = object.boxSize.x - 8;

    // Selection highlight (drawn before text so text renders on top)
    if (
        cursor &&
        cursor.selectionStart !== undefined &&
        cursor.selectionEnd !== undefined &&
        cursor.selectionStart !== cursor.selectionEnd
    ) {
        const selStart = Math.min(cursor.selectionStart, cursor.selectionEnd);
        const selEnd = Math.max(cursor.selectionStart, cursor.selectionEnd);
        const lines = computeLines(object.text, ctx, maxWidth);
        ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineCharEnd =
                i < lines.length - 1
                    ? lines[i + 1].startIndex
                    : object.text.length;
            if (selEnd <= line.startIndex || selStart >= lineCharEnd) continue;
            const lineSelStart = Math.max(0, selStart - line.startIndex);
            const lineSelEnd = Math.min(line.text.length, selEnd - line.startIndex);
            const selX =
                x + 4 + ctx.measureText(line.text.slice(0, lineSelStart)).width;
            const selW =
                ctx.measureText(line.text.slice(lineSelStart, lineSelEnd)).width ||
                ctx.measureText(" ").width;
            ctx.fillRect(selX, y + 4 + i * lineHeightPx, selW, lineHeightPx);
        }
        ctx.fillStyle = object.color;
    }

    // Word-wrap the text into the box
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
