import { Plus } from "lucide-react";
import { BoardData, ObjectlessBoardData } from "../types/data";

export default function MyBoards({ boards }: { boards: BoardData[] }) {
    const MAX_SLOTS = 6;

    const normalizedBoards = boards.slice(0, 5);
    const hasCreateFirst = normalizedBoards.length === 5;

    const slots: Array<
        { type: "create" } | { type: "board"; board: BoardData }
    > = [];

    if (hasCreateFirst) {
        slots.push({ type: "create" });
        normalizedBoards.forEach((board) =>
            slots.push({ type: "board", board })
        );
    } else {
        normalizedBoards.forEach((board) =>
            slots.push({ type: "board", board })
        );
        while (slots.length < MAX_SLOTS) {
            slots.push({ type: "create" });
        }
    }

    return (
        <div className="flex h-screen items-center justify-center overflow-hidden">
            {/* Centered bounding box */}
            <div className="max-h-[80vh] w-full max-w-[90vw]">
                <div
                    className="grid h-full w-full gap-4"
                    style={{
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gridTemplateRows: "repeat(2, 1fr)",
                    }}
                >
                    {slots.map((slot, index) => {
                        if (slot.type === "board") {
                            return (
                                <button
                                    key={`board-${slot.board.id}`}
                                    onClick={() =>
                                        console.log("Open board:", slot.board)
                                    }
                                    className="group border-border bg-background flex h-full w-full flex-col gap-2 rounded-md border p-3 transition-transform duration-150 hover:scale-[1.02]"
                                >
                                    <div className="border-border bg-muted relative flex-1 overflow-hidden rounded-sm border">
                                        {/* Placeholder thumbnail */}
                                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.05]">
                                            {Array.from({ length: 16 }).map(
                                                (_, i) => (
                                                    <div
                                                        key={i}
                                                        className="border border-black"
                                                    />
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-foreground truncate text-sm font-medium">
                                        {slot.board.name}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <button
                                key={`create-${index}`}
                                onClick={() => console.log("Create new board")}
                                className="group border-border bg-muted/30 hover:bg-muted/50 flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 transition-transform duration-150 hover:scale-[1.02]"
                            >
                                <div className="border-border bg-background flex h-10 w-10 items-center justify-center rounded-full border">
                                    <Plus className="text-muted-foreground h-5 w-5" />
                                </div>
                                <span className="text-muted-foreground text-sm font-medium">
                                    Create board
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
