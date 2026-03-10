import { useEffect, useRef } from "react";

// Most basic canvas. No logic besides basic DOM canvas setup and drawing loop
function CanvasBase({
    draw,
    width,
    height,
    zoom,
    ...rest
}: {
    draw: (ctx: CanvasRenderingContext2D) => void;
    width: number;
    height: number;
    zoom: number;
    [key: string]: any;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        let frameCount = 0;
        let animationFrameId: number;

        // const dpr = window.devicePixelRatio || 1
        // canvas.width = props.width * dpr
        // canvas.height = props.height * dpr
        // context.scale(dpr, dpr)
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.scale(zoom, zoom);

        // if (window.devicePixelRatio !== 1) {
        //     console.log(
        //         'There might be a problem since deivce pixel ratio is ' +
        //             window.devicePixelRatio
        //     )
        // }

        const render = () => {
            frameCount++;
            draw(context);
            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [draw, height, width]);

    return <canvas ref={canvasRef} {...rest} />;
}

export default CanvasBase;
