import React, { useContext, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { CameraDragInteraction, DrawingInteraction } from "./useMouseEvents";
import { CanvasContext } from "../../../types/context/CanvasContext";
import {
    EllipseTool,
    EraserTool,
    LineTool,
    PencilTool,
    RectTool,
    TextTool,
    Tool,
} from "../../../types/tool";
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
import { screenToWorld } from "../utils/canvasCoords";
import { findObjectAtCoords as hitTest } from "../utils/canvasHitTesting";
interface useCameraProps {
    saveBoard: () => void;
}
/**
 * Camera drag interactions and other camera event handling
 */
export function useCamera({ saveBoard }: useCameraProps) {
    const canvasContext = useContext(CanvasContext);
    const camera = canvasContext.updatedCamera;
    function handleCameraDragInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        const dx =
            (e.clientX - interaction.current.lastMousePos.x) /
            canvasContext.updatedCamera.zoom;
        const dy =
            (e.clientY - interaction.current.lastMousePos.y) /
            canvasContext.updatedCamera.zoom;

        canvasContext.setUnsavedCameraPosition({
            x: canvasContext.updatedCamera.position.x - dx,
            y: canvasContext.updatedCamera.position.y - dy,
        });

        interaction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }
    function handleCameraDragInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        saveBoard();
    }
    function handleCamera_Wheel(e: React.WheelEvent<HTMLCanvasElement>) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newZoom =
            e.deltaY < 0
                ? canvasContext.updatedCamera.zoom * zoomFactor
                : canvasContext.updatedCamera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(1000, newZoom));
        const worldX =
            canvasContext.updatedCamera.position.x +
            mouseX / canvasContext.updatedCamera.zoom;
        const worldY =
            canvasContext.updatedCamera.position.y +
            mouseY / canvasContext.updatedCamera.zoom;
        const newPosition = {
            x: worldX - mouseX / clampedZoom,
            y: worldY - mouseY / clampedZoom,
        };
        canvasContext.setUnsavedCameraPosition(newPosition);
        canvasContext.setUnsavedCameraZoom(clampedZoom);
        saveBoard();
    }
    return {
        handleCameraDragInteraction_MouseMove,
        handleCameraDragInteraction_MouseUp,
        handleCamera_Wheel,
    };
}
