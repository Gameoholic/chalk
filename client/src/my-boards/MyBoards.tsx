import { Plus } from "lucide-react";
import { BoardData } from "../types/data";
import CanvasEditor from "../canvas/CanvasEditor";
import CanvasBase from "../canvas/CanvasBase";
import CanvasWorld from "../canvas/CanvasWorld";
import useDimensions from "react-cool-dimensions";
import { useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Vec2 } from "../types/canvas";

export default function MyBoards({ boards }: { boards: BoardData[] }) {
    return (
        <div className="m-4 flex flex-col items-center gap-5">
            <p className="mt-4 text-4xl">Boards</p>

            {/* Board container */}
            <div className="grid aspect-17/10 w-6/9 grid-cols-3 grid-rows-3 gap-3">
                <Board boardData={boards[0] ?? null} />
                <Board boardData={boards[1] ?? null} />
                <Board boardData={boards[2] ?? null} />
                <Board boardData={boards[3] ?? null} />
                <Board boardData={boards[4] ?? null} />
                <Board boardData={boards[5] ?? null} />
                <Board boardData={boards[6] ?? null} />
                <Board boardData={boards[7] ?? null} />
                <Board boardData={boards[8] ?? null} />
            </div>
        </div>
    );
}

function Board({ boardData }: { boardData?: BoardData }) {
    const [cameraSize, setCameraSize] = useState<Vec2>({ x: 300, y: 300 }); // Initial camera size, later overrided by the actual size of the div
    const { observe, unobserve, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            setCameraSize({ x: width, y: height });

            unobserve(); // To stop observing the current target element
            observe(); // To re-start observing the current target element
        },
    });

    const zoom = 0.1; // todo this!

    if (boardData) {
        return (
            <div
                ref={observe}
                className="relative h-full w-full cursor-pointer"
                onClick={() => {}}
            >
                {/* Board name */}
                <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-black select-none">
                    {boardData.name}
                </div>

                {/* Canvas */}
                <CanvasWorld
                    objects={
                        new Map(
                            boardData.objects.map((object) => [
                                object.id,
                                object,
                            ])
                        )
                    }
                    camera={{
                        position: { x: 0, y: 0 },
                        size: cameraSize,
                        zoom: zoom,
                    }}
                />
            </div>
        );
    }
    return <div className="bg-gray-500" />;
}
