import { useEffect, useRef, useLayoutEffect } from "react";

interface CanvasBaseProps {
    draw: (ctx: CanvasRenderingContext2D) => void;
    width: number;
    height: number;
    zoom: number;
    [key: string]: any;
}

// Most basic canvas. No logic besides basic DOM canvas setup and drawing loop
function CanvasBase({ draw, width, height, zoom, ...rest }: CanvasBaseProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Create Refs for values that change frequently
    const drawRef = useRef(draw);
    const zoomRef = useRef(zoom);

    // Update refs immediately when props change without restarting the loop
    useLayoutEffect(() => {
        drawRef.current = draw;
        zoomRef.current = zoom;
    }, [draw, zoom]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        let animationFrameId: number;

        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const render = () => {
            const currentZoom = zoomRef.current;

            // Clear the canvas
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Apply zoom from Ref
            context.scale(currentZoom, currentZoom);

            // Draw
            drawRef.current(context);

            animationFrameId = window.requestAnimationFrame(render);
        };

        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [width, height]);

    return <canvas ref={canvasRef} {...rest} />;
}

export default CanvasBase;
