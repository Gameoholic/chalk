import React, { JSX, useState, useRef, useEffect } from "react";
import { MousePointer, Square, Circle, Slash, Pen } from "lucide-react";
import { SketchPicker, ColorResult } from "react-color";
import { Tool } from "./CanvasTypes";

const Toolbox = ({
    onToolChange,
    onColorChange,
    onWidthChange,
    className,
}: {
    onToolChange: (tool: Tool) => void;
    onColorChange: (color: string) => void;
    onWidthChange: (width: number) => void;
    className: string;
}) => {
    const [selectedTool, setSelectedTool] = useState<Tool>("none");
    const [color, setColor] = useState<string>("rgba(0,0,0,1)");
    const [width, setWidth] = useState<number>(2);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setShowColorPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const tools: { name: Tool; icon: JSX.Element }[] = [
        { name: "select", icon: <MousePointer size={20} /> },
        { name: "pencil", icon: <Pen size={20} /> },
        { name: "circle", icon: <Circle size={20} /> },
        { name: "line", icon: <Slash size={20} /> },
        { name: "rectangle", icon: <Square size={20} /> },
    ];

    const handleToolClick = (tool: Tool) => {
        if (selectedTool === tool) {
            tool = "none";
        }
        setSelectedTool(tool);
        onToolChange(tool);
    };

    const handleColorChange = (updatedColor: ColorResult) => {
        const rgba = `rgba(${updatedColor.rgb.r}, ${updatedColor.rgb.g}, ${updatedColor.rgb.b}, ${updatedColor.rgb.a})`;
        setColor(rgba);
        onColorChange(rgba);
    };

    // Generate checkerboard grid for transparency
    const renderCheckerboard = () => {
        const squares = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const isLight = (row + col) % 2 === 0;
                squares.push(
                    <div
                        key={`${row}-${col}`}
                        className={isLight ? "bg-gray-200" : "bg-gray-400"}
                    />
                );
            }
        }
        return (
            <div
                className="absolute inset-0 grid grid-cols-4 grid-rows-4"
                style={{ width: "100%", height: "100%" }}
            >
                {squares}
            </div>
        );
    };

    return (
        <div
            className={`absolute flex w-20 flex-col items-center space-y-4 bg-gray-800 p-3 text-white ${className}`}
        >
            <h2 className="mb-2 text-sm font-bold">Tools</h2>

            <div className="flex flex-col space-y-2">
                {tools.map((tool) => (
                    <button
                        key={tool.name}
                        onClick={() => handleToolClick(tool.name)}
                        className={`rounded p-2 hover:bg-gray-700 ${
                            selectedTool === tool.name ? "bg-gray-700" : ""
                        }`}
                    >
                        {tool.icon}
                    </button>
                ))}
            </div>

            <div className="relative mt-4 flex w-full flex-col items-center">
                <label className="mb-1 text-sm">Color</label>
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="relative h-8 w-full overflow-hidden rounded border border-gray-400"
                >
                    {renderCheckerboard()}
                    <div
                        className="absolute inset-0"
                        style={{ backgroundColor: color }}
                    />
                </button>

                {showColorPicker && (
                    <div
                        ref={pickerRef}
                        className="absolute z-50 mt-2 flex flex-col items-center rounded bg-gray-800 p-2 shadow-lg"
                    >
                        <SketchPicker
                            color={color}
                            onChange={handleColorChange}
                        />
                        <button
                            onClick={() => setShowColorPicker(false)}
                            className="mt-2 rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 flex w-full flex-col space-y-1">
                <label className="text-sm">Width</label>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={width}
                    onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setWidth(newWidth);
                        onWidthChange(newWidth);
                    }}
                    className="w-full"
                />
                <span className="text-center text-xs">{width}px</span>
            </div>
        </div>
    );
};

export default Toolbox;
