import { Plus } from "lucide-react";
import { BoardData } from "../types/data";
import CanvasEditor from "../canvas/CanvasEditor";
import CanvasBase from "../canvas/CanvasBase";

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
    if (boardData) {
        return (
            <CanvasEditor
                theme="dark"
                userData={{ displayName: "test", id: "asd", role: "guest" }}
                openMyBoards={() => {}}
                setTheme={() => {}}
                currentBoard={boardData}
                boards={[boardData]}
            />
        );
    }
    return <div className="bg-gray-500" />;
}
