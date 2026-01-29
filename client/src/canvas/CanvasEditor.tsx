import WorldViewport from "./WorldViewport";
import Toolbox from "./Toolbox";
import { useState } from "react";
import { Camera, Tool, Vec2 } from "./CanvasTypes";

function CanvasEditor() {
    const [tool, setTool] = useState<Tool>("none");
    const [color, setColor] = useState("#000000FF");
    const [stroke, setStroke] = useState(1);

    const [cameraPosition, setCameraPosition] = useState<Vec2>({ x: 0, y: 0 });
    const [cameraZoom, setCameraZoom] = useState<number>(1);

    return (
        <div className="relative h-screen w-screen border-3">
            <div className="absolute top-4 left-4 w-125 rounded-lg bg-black/60 p-3 font-mono text-white shadow-md backdrop-blur-sm">
                <p className="mb-1 font-bold">Debug</p>
                <p className="mb-1">
                    Camera Pos: {cameraPosition.x}, {cameraPosition.y}
                </p>
                <p>Camera Zoom: {cameraZoom.toFixed(2)}</p>
            </div>
            <Toolbox
                className="absolute top-4 right-4 rounded-lg"
                onToolChange={(tool: Tool) => {
                    setTool(tool);
                }}
                onColorChange={(color: string) => {
                    setColor(color);
                }}
                onWidthChange={(width: number) => {
                    setStroke(width);
                }}
            />

            <WorldViewport
                className="h-full w-full"
                selectedTool={tool}
                selectedColor={color}
                selectedStroke={stroke}
                onCameraChange={(camera: Camera) => {
                    setCameraPosition(camera.position);
                    setCameraZoom(camera.zoom);
                }}
            />
        </div>
    );
}
export default CanvasEditor;
