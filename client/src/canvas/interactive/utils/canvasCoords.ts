import React from "react";
import { Camera, Vec2 } from "../../../types/canvas";

export function screenToWorld(
    e: React.MouseEvent<HTMLCanvasElement>,
    camera: Camera
): Vec2 {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / camera.zoom + camera.position.x;
    const y = (e.clientY - rect.top) / camera.zoom + camera.position.y;
    return { x, y };
}
