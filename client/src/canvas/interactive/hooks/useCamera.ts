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
    commitCamera: () => void;
}

/**
 * Camera drag interactions and other camera event handling
 */
export function useCamera({ commitCamera }: useCameraProps) {
    const canvasContext = useContext(CanvasContext);
    const camera = canvasContext.local_camera;

    function handleCameraDragInteraction_MouseMove(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        const dx =
            (e.clientX - interaction.current.lastMousePos.x) /
            canvasContext.local_camera.zoom;
        const dy =
            (e.clientY - interaction.current.lastMousePos.y) /
            canvasContext.local_camera.zoom;

        canvasContext.setLocalCamera((prev) => ({
            ...prev,
            position: {
                x: prev.position.x - dx,
                y: prev.position.y - dy,
            },
        }));

        interaction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }
    function handleCameraDragInteraction_MouseUp(
        e: React.MouseEvent<HTMLCanvasElement>,
        interaction: React.RefObject<CameraDragInteraction>
    ) {
        commitCamera();
    }

    function handleCamera_Wheel(e: React.WheelEvent<HTMLCanvasElement>) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0
                ? canvasContext.local_camera.zoom * zoomFactor
                : canvasContext.local_camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(1000, newZoom));

        const worldX =
            canvasContext.local_camera.position.x +
            mouseX / canvasContext.local_camera.zoom;
        const worldY =
            canvasContext.local_camera.position.y +
            mouseY / canvasContext.local_camera.zoom;

        canvasContext.setLocalCamera({
            ...canvasContext.local_camera,
            zoom: clampedZoom,
            position: {
                x: worldX - mouseX / clampedZoom,
                y: worldY - mouseY / clampedZoom,
            },
        });
        commitCamera();
    }

    return {
        handleCameraDragInteraction_MouseMove,
        handleCameraDragInteraction_MouseUp,
        handleCamera_Wheel,
    };
}
