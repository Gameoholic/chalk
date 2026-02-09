import { Plus } from "lucide-react";
import { BoardData } from "../types/data";
import CanvasEditor from "../canvas/CanvasEditor";
import CanvasBase from "../canvas/CanvasBase";
import CanvasWorld from "../canvas/CanvasWorld";
import useDimensions from "react-cool-dimensions";
import { useState } from "react";
import { motion } from "motion/react";
import { Vec2 } from "../types/canvas";

export default function MyBoards({ boards }: { boards: BoardData[] }) {
    return (
        <div className="m-4 flex flex-col items-center gap-5">
            <p className="mt-4 text-4xl">Boards</p>

            {/* Board container */}
            <div className="grid aspect-17/10 w-6/9 grid-cols-3 grid-rows-3 gap-3">
                <BoardSlot boardData={boards[0] ?? null} />

                <BoardSlot boardData={boards[1] ?? null} />
                <BoardSlot boardData={boards[2] ?? null} />
                <BoardSlot boardData={boards[3] ?? null} />
                <BoardSlot boardData={boards[4] ?? null} />
                <BoardSlot boardData={boards[5] ?? null} />
                <BoardSlot boardData={boards[6] ?? null} />
                <BoardSlot boardData={boards[7] ?? null} />
                <BoardSlot boardData={boards[8] ?? null} />
            </div>
        </div>
    );
}

function BoardSlot({ boardData }: { boardData?: BoardData }) {
    if (boardData) {
        return <Board boardData={boardData} />;
    }
    return <EmptyBoard />;
}

function Board({ boardData }: { boardData: BoardData }) {
    const [cameraSize, setCameraSize] = useState<Vec2>({ x: 300, y: 300 }); // Initial camera size, later overrided by the actual size of the div
    const { observe, unobserve, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            setCameraSize({ x: width, y: height });

            unobserve(); // To stop observing the current target element
            observe(); // To re-start observing the current target element
        },
    });

    const zoom = 0.1; // todo this!

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
                        boardData.objects.map((object) => [object.id, object])
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

function EmptyBoard() {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-gray-500"
        >
            <Plus className="text-white opacity-50" />
        </motion.div>
    );
}
