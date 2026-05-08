import React, { useContext } from "react";
import CanvasDOMRenderer from "./CanvasDOMRenderer";
import { Camera, WorldObject } from "../../types/canvas";
import { AntiAliasingContext } from "../../types/context/AntiAliasingContext";
import { drawGrid } from "./utils/drawGrid";
import { drawObjects, drawSelectionHighlight } from "./utils/drawObjects";

interface CanvasRendererProps {
    objects: Map<string, WorldObject>;
    camera: Camera;
    textCursor?: { objectId: string; index: number; visible: boolean };
    drawingTextBoxObjectId: string | null;
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
    textCursor,
    drawingTextBoxObjectId,
    ...handlers
}: CanvasRendererProps) {
    const antiAliasing = useContext(AntiAliasingContext).value;

    const drawGrid_ = (ctx: CanvasRenderingContext2D) => {
        drawGrid(ctx, camera);
    };

    const drawObjects_ = (ctx: CanvasRenderingContext2D) => {
        drawObjects(
            ctx,
            objects,
            camera,
            antiAliasing,
            drawingTextBoxObjectId,
            textCursor
        );

        // if (selectedObjectId) {
        //     const selected = objects.get(selectedObjectId);
        //     if (selected) drawSelectionHighlight(ctx, selected, camera);
        // }
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

            {/* Grid layer - never affected by eraser */}
            <CanvasDOMRenderer
                draw={drawGrid_}
                width={camera.size.x}
                height={camera.size.y}
                zoom={camera.zoom}
                className="bg-white"
                style={{ position: "absolute", top: 0, left: 0 }}
            />
            {/* Object Layer */}
            <CanvasDOMRenderer
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

export default CanvasRenderer;
