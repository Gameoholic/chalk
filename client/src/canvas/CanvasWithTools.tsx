import CanvasWithCamera from "./CanvasWithCamera";
import Toolbox from "./Toolbox";

type Tool = "select" | "line" | "rectangle" | "circle";

function CanvasWithTools() {
    return (
        <div className="relative h-screen w-screen border-3">
            <Toolbox
                className="absolute top-4 right-4 rounded-lg"
                onToolChange={(tool: Tool) => {}}
                onColorChange={(color: string) => {}}
                onWidthChange={(width: number) => {}}
            />

            <CanvasWithCamera className="h-full w-full" />
        </div>
    );
}
export default CanvasWithTools;
