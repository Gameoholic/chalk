import { Plus } from "lucide-react";
import { BoardData } from "../types/data";
import CanvasWorld from "../canvas/CanvasWorld";
import useDimensions from "react-cool-dimensions";
import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Vec2 } from "../types/canvas";

type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type Size = { width: number; height: number };

export default function MyBoards({
    boards,
    onFinishedZoomingIn,
}: {
    boards: BoardData[];
    onFinishedZoomingIn: (boardData: BoardData) => void;
}) {
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

    // We store the transform state for the grid
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

    // Ref for the grid container to calculate relative positions
    const gridRef = useRef<HTMLDivElement>(null);

    const [windowSize, setWindowSize] = useState<Size>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const windowAspect = windowSize.width / windowSize.height;

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
            // Reset zoom on resize to prevent alignment issues
            setActiveBoardId(null);
            setTransform({ x: 0, y: 0, scale: 1 });
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleBoardClick = (board: BoardData, slotRect: Rect) => {
        if (!gridRef.current) return;

        // 1. Calculate Scale to fill window
        const scale = windowSize.width / slotRect.width;

        // 2. Get Grid's current position (to offset against)
        const gridRect = gridRef.current.getBoundingClientRect();

        // 3. Calculate where the clicked board is *relative* to the grid's top-left
        //    (We use the slotRect passed from the child, which is in viewport coords)
        const relativeX = slotRect.x - gridRect.left;
        const relativeY = slotRect.y - gridRect.top;

        // 4. Calculate target transform
        //    We want the point (relativeX, relativeY) on the grid to end up at (0,0) on screen.
        //    But we are transforming the Grid, so we also need to account for where the Grid *starts* (gridRect.left).
        //
        //    Formula: - (BoardPositionRelativeToGrid * Scale) - InitialGridOffset + WindowCenterOffset?
        //    Actually, simpler: We want the final screen position of the board's top-left to be 0.
        //    ScreenX = GridScreenX + (RelativeX * Scale)
        //    0 = (InitialGridLeft + TranslateX) + (RelativeX * Scale)
        //    TranslateX = -InitialGridLeft - (RelativeX * Scale)

        //    However, since we are animating from a centered state, it's safer to calculate
        //    offsets assuming the Grid Container's transform-origin is top-left (0,0).

        const targetX = -relativeX * scale;
        const targetY = -relativeY * scale;

        // 5. Adjust for the fact that the grid is centered in the viewport initially
        //    The grid is inside a flex-col items-center.
        //    When we apply transform, it applies on top of layout.
        //    Let's calculate the offset needed to effectively move the board to 0,0.

        //    Current Visual Pos = gridRect.left + relativeX
        //    Target Visual Pos = 0
        //    Delta = 0 - (gridRect.left + relativeX) ?
        //    No, because scaling expands outwards.

        //    Let's use the straightforward "Center Viewport" approach:
        //    NewX = (WindowWidth / 2) - (BoardCenterRelative * Scale) - GridLeft
        //    But the user wants it to fill the screen (top-left alignment usually best for full screen).

        const offsetX = -gridRect.left - relativeX * scale;
        const offsetY = -gridRect.top - relativeY * scale;

        setTransform({
            x: offsetX,
            y: offsetY,
            scale: scale,
        });
        setActiveBoardId(board.id);
    };

    const handleClose = () => {
        setActiveBoardId(null);
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-amber-400">
            {/* Header - Fades out when zoomed */}
            <motion.p
                animate={{
                    opacity: activeBoardId ? 0 : 1,
                    y: activeBoardId ? -50 : 0,
                }}
                className="pointer-events-none z-10 mt-4 mb-5 text-4xl"
            >
                Boards
            </motion.p>

            {/* THE GRID CONTAINER 
                We apply the transform here. 
                transformOrigin: 0 0 ensures math is predictable (top-left scaling).
            */}
            <motion.div
                ref={gridRef}
                className="grid w-2/3 origin-top-left grid-cols-3 gap-3"
                animate={{
                    x: transform.x,
                    y: transform.y,
                    scale: transform.scale,
                }}
                transition={{ duration: 0.8, ease: [0.52, 0.22, 0, 1] }}
                onAnimationComplete={() => {
                    const board = boards.find((b) => b.id === activeBoardId);
                    if (board) {
                        console.log(
                            "Finished zooming IN to board:",
                            activeBoardId
                        );
                        onFinishedZoomingIn(board);
                    } else {
                        console.log("Finished zooming OUT to grid view");
                    }
                }}
            >
                {Array.from({ length: 9 }).map((_, i) => (
                    <BoardSlot
                        key={i}
                        boardData={boards[i]}
                        windowAspect={windowAspect}
                        windowSize={windowSize}
                        isActive={boards[i]?.id === activeBoardId}
                        onOpen={handleBoardClick}
                    />
                ))}
            </motion.div>
        </div>
    );
}

function BoardSlot({
    boardData,
    onOpen,
    windowAspect,
    windowSize,
    isActive,
}: {
    boardData?: BoardData;
    windowAspect: number;
    windowSize: Size;
    isActive: boolean;
    onOpen: (board: BoardData, rect: Rect) => void;
}) {
    if (!boardData) return <EmptyBoard windowAspect={windowAspect} />;

    return (
        <Board
            boardData={boardData}
            windowAspect={windowAspect}
            windowSize={windowSize}
            isActive={isActive}
            onOpen={onOpen}
        />
    );
}

function Board({
    boardData,
    onOpen,
    windowAspect,
    windowSize,
    isActive,
}: {
    boardData: BoardData;
    windowAspect: number;
    windowSize: Size;
    isActive: boolean;
    onOpen: (board: BoardData, rect: Rect) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [slotSize, setSlotSize] = useState<Vec2>({ x: 300, y: 300 });

    const { observe } = useDimensions({
        onResize: ({ width, height }) => {
            setSlotSize({ x: width, y: height });
        },
    });

    // We calculate the inverse scale so the "CanvasWorld" inside stays 1:1 with window pixels
    // even when the board is small.
    const scaleX = slotSize.x / windowSize.width;
    const scaleY = slotSize.y / windowSize.height;

    return (
        <div
            ref={(el) => {
                observe(el);
                (ref as any).current = el;
            }}
            style={{ aspectRatio: windowAspect }}
            className="relative w-full cursor-pointer overflow-hidden rounded-md bg-white shadow-sm"
            onClick={(e) => {
                e.stopPropagation(); // Prevent clicking through
                if (!ref.current || isActive) return;
                const rect = ref.current.getBoundingClientRect();
                onOpen(boardData, {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                });
            }}
        >
            {/* Title - Fade out when active/zoomed */}
            <motion.div
                animate={{ opacity: isActive ? 0 : 1 }}
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/50 font-bold"
            >
                {boardData.name}
            </motion.div>

            {/* The World Content */}
            <div className="absolute top-0 left-0">
                <div
                    style={{
                        width: windowSize.width,
                        height: windowSize.height,
                        transformOrigin: "top left",
                        // If active, we don't need to scale down anymore?
                        // Actually, since we scale the PARENT up, we keep this scale logic.
                        // Parent Scale UP * Child Scale DOWN = 1 (Original Size).
                        transform: `scale(${scaleX}, ${scaleY})`,
                    }}
                    // Enable pointer events only when active so you can drag the canvas
                    className={
                        isActive ? "pointer-events-auto" : "pointer-events-none"
                    }
                >
                    <CanvasWorld
                        objects={
                            new Map(boardData.objects.map((o) => [o.id, o]))
                        }
                        camera={{
                            position: { x: 0, y: 0 },
                            size: { x: windowSize.width, y: windowSize.height },
                            zoom: 1,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function EmptyBoard({ windowAspect }: { windowAspect: number }) {
    return (
        <motion.div
            style={{ aspectRatio: windowAspect }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-black/10"
        >
            <Plus className="text-white opacity-50" />
        </motion.div>
    );
}
