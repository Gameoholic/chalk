import { useContext, useEffect, useRef, useState } from "react";
import { CanvasContext } from "../../../types/context/CanvasContext";

export default function DebugPanel() {
    const canvasContext = useContext(CanvasContext);

    const [fps, setFps] = useState(0);
    const frames = useRef(0);
    const lastTime = useRef(performance.now());

    useEffect(() => {
        let rafId: number;
        const loop = () => {
            frames.current++;
            const now = performance.now();
            if (now - lastTime.current >= 1000) {
                setFps(frames.current);
                frames.current = 0;
                lastTime.current = now;
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    const cameraStatus =
        canvasContext.pending_cameraPosition != null ||
        canvasContext.pending_cameraZoom != null
            ? canvasContext.unsaved_cameraPosition != null ||
              canvasContext.unsaved_cameraZoom != null
                ? "Pending but changed since."
                : "Pending."
            : canvasContext.unsaved_cameraPosition != null ||
                canvasContext.unsaved_cameraZoom != null
              ? "Unsaved."
              : "Saved.";

    return (
        <div
            className="absolute bottom-4 left-4 w-110 rounded-lg p-3 font-mono text-sm shadow-md"
            style={{
                backgroundColor: "var(--card)",
                color: "var(--card-foreground)",
            }}
        >
            <p className="font-bold">Debug</p>
            <p>
                Camera Pos: {canvasContext.camera.position.x},{" "}
                {canvasContext.camera.position.y}
            </p>
            <p>Camera Zoom: {canvasContext.camera.zoom.toFixed(2)}</p>
            <p>FPS: {fps}</p>
            <p>Objects: {canvasContext.objects.size} total</p>
            <p>
                Server: {canvasContext.serverBoard.objects.length} | Local
                unsaved: {canvasContext.unsaved_objects.length} | Local
                deleting: {canvasContext.unsaved_deletedObjectIds.size}
            </p>
            <p>
                Pending unsaved: {canvasContext.pending_objects.length} |
                Pending deleting:{" "}
                {canvasContext.pending_deletedObjectIds.size}
            </p>
            <p>Camera: {cameraStatus}</p>
        </div>
    );
}
