import { Plus } from "lucide-react";
import { BoardData } from "../types/data";
import CanvasWorld from "../canvas/CanvasWorld";
import useDimensions from "react-cool-dimensions";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion } from "motion/react";
import { Vec2 } from "../types/canvas";

type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type Size = { width: number; height: number };

const BOARD_SLOT_ROUNDED = 6; // in pixels

interface MyBoardsProps {
    boards: BoardData[];
    initialBoardId: string;
    onBoardFinishZoomIn: (boardData: BoardData) => void;
}

export default function MyBoards({
    boards,
    initialBoardId,
    onBoardFinishZoomIn,
}: MyBoardsProps) {
    // Selected means we're zooming in on it
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

    // The board that we're hovering on now, or were last hovering on in case we're now not hovering on any board rn
    const [lastHoveredBoardId, setLastHoveredBoardId] = useState<string | null>(
        null
    );

    // Track if the initial zoom-out animation has completed
    const [hasZoomedOut, setHasZoomedOut] = useState(false);

    // Whether myboards is zooming in, or zooming out
    const [isUserZoomIn, setIsUserZoomIn] = useState(false);

    // Store the initial transform (calculated once, used for Motion's initial prop)
    const [initialTransform, setInitialTransform] = useState<{
        x: number;
        y: number;
        scale: number;
    } | null>(null);

    // Store whether we should animate to grid view
    const [shouldAnimateOut, setShouldAnimateOut] = useState(false);

    // Ref for the grid container to calculate relative positions
    const gridRef = useRef<HTMLDivElement>(null);

    // Store refs for each board slot
    const boardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
            setSelectedBoardId(null);
            setInitialTransform(null);
            setShouldAnimateOut(false);
            setHasZoomedOut(true); // Skip animation on resize
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Calculate initial zoom position
    useLayoutEffect(() => {
        if (initialTransform !== null || !gridRef.current || !initialBoardId)
            return;

        const calculateTransform = () => {
            const initialBoardRef = boardRefs.current.get(initialBoardId);

            if (!initialBoardRef || !gridRef.current) {
                console.log("Board ref not found, skipping animation");
                setInitialTransform({ x: 0, y: 0, scale: 1 });
                setHasZoomedOut(true);
                return;
            }

            // Get the board's position in the grid
            const boardRect = initialBoardRef.getBoundingClientRect();
            const gridRect = gridRef.current.getBoundingClientRect();

            // Calculate where the board is relative to the grid
            const relativeX = boardRect.left - gridRect.left;
            const relativeY = boardRect.top - gridRect.top;

            // Calculate the scale needed to make the board fill the window
            const scale = windowSize.width / boardRect.width;

            // Calculate the transform to make this board fill the screen
            const offsetX = -gridRect.left - relativeX * scale;
            const offsetY = -gridRect.top - relativeY * scale;

            console.log("Initial zoom calculated:", {
                offsetX,
                offsetY,
                scale,
            });

            // Set the initial zoomed-in position
            setInitialTransform({
                x: offsetX,
                y: offsetY,
                scale: scale,
            });

            // After a brief moment, start animating out
            setTimeout(() => {
                console.log("Starting zoom out animation");
                setShouldAnimateOut(true);
            }, 100);
        };

        // Use requestAnimationFrame to ensure DOM is painted
        requestAnimationFrame(() => {
            requestAnimationFrame(calculateTransform);
        });
    }, [
        initialTransform,
        initialBoardId,
        windowSize.width,
        windowSize.height,
        boardRefs.current.size,
    ]);

    const handleBoardClick = (board: BoardData, slotRect: Rect) => {
        if (!gridRef.current || !hasZoomedOut) return;

        // 1. Calculate Scale to fill window
        const scale = windowSize.width / slotRect.width;

        // 2. Get Grid's current position (to offset against)
        const gridRect = gridRef.current.getBoundingClientRect();

        // 3. Calculate where the clicked board is *relative* to the grid's top-left
        const relativeX = slotRect.x - gridRect.left;
        const relativeY = slotRect.y - gridRect.top;

        // 4. Calculate target transform
        const offsetX = -gridRect.left - relativeX * scale;
        const offsetY = -gridRect.top - relativeY * scale;

        // For click zoom, we'll handle this differently - set it as a selected board
        // which will be handled by the parent component
        setSelectedBoardId(board.id);
        setLastHoveredBoardId(board.id);

        // Trigger the zoom animation
        setShouldAnimateOut(false);
        setInitialTransform({
            x: offsetX,
            y: offsetY,
            scale: scale,
        });
    };

    return (
        // This motion.div fixes the flicker on mount zoom out by fading in
        // only when initial transform is calculated
        <motion.div
            className="fixed inset-0 flex flex-col items-center overflow-hidden bg-amber-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: initialTransform !== null ? 1 : 0 }}
            transition={{ duration: 0 }}
        >
            {/* Boards page header - fades out when zoomed or during initial animation */}
            <motion.p
                initial={{ opacity: 0, y: -50 }}
                animate={{
                    opacity: selectedBoardId || !hasZoomedOut ? 0 : 1,
                    y: selectedBoardId || !hasZoomedOut ? -50 : 0,
                }}
                transition={{ duration: 0.8, ease: [0.52, 0.22, 0, 1] }}
                className="pointer-events-none z-10 mt-4 mb-5 text-4xl"
            >
                Boards
            </motion.p>

            {/* THE GRID CONTAINER */}
            <motion.div
                ref={gridRef}
                className="grid w-2/3 origin-top-left grid-cols-3 gap-3"
                initial={
                    initialTransform
                        ? {
                              x: initialTransform.x,
                              y: initialTransform.y,
                              scale: initialTransform.scale,
                          }
                        : {
                              x: 0,
                              y: 0,
                              scale: 1,
                          }
                }
                animate={
                    shouldAnimateOut
                        ? {
                              x: 0,
                              y: 0,
                              scale: 1,
                          }
                        : initialTransform
                          ? {
                                x: initialTransform.x,
                                y: initialTransform.y,
                                scale: initialTransform.scale,
                            }
                          : {
                                x: 0,
                                y: 0,
                                scale: 1,
                            }
                }
                transition={{
                    duration: shouldAnimateOut
                        ? 1.2
                        : selectedBoardId === null
                          ? 0 // For zooming out duration should be zero
                          : 0.8,
                    ease: shouldAnimateOut ? [0.52, 0.22, 0, 1] : undefined,
                }}
                onAnimationComplete={(definition) => {
                    if (shouldAnimateOut) {
                        console.log("Zoom out animation completed");
                        setHasZoomedOut(true);
                    } else if (selectedBoardId) {
                        // Zoom in animation completed
                        const selectedBoard = boards.find(
                            (b) => b.id === selectedBoardId
                        );
                        if (selectedBoard) {
                            onBoardFinishZoomIn(selectedBoard);
                        }
                    }
                }}
            >
                {/* First slot is "Create Board" */}
                <CreateBoard
                    windowAspect={windowAspect}
                    hasZoomedOut={hasZoomedOut}
                />

                {/* Rest are normal boards or empty board slots */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <BoardSlot
                        key={i}
                        boardData={boards[i]}
                        windowAspect={windowAspect}
                        windowSize={windowSize}
                        isSelected={boards[i]?.id === selectedBoardId}
                        isLastHovered={boards[i]?.id === lastHoveredBoardId}
                        isInitialBoard={boards[i]?.id === initialBoardId}
                        hasZoomedOut={hasZoomedOut}
                        onOpen={handleBoardClick}
                        onHover={(id) => setLastHoveredBoardId(id)}
                        onRefReady={(id, ref) => {
                            if (ref && id) {
                                boardRefs.current.set(id, ref);
                            }
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}

function BoardSlot({
    boardData,
    onOpen,
    windowAspect,
    windowSize,
    isSelected,
    isLastHovered,
    isInitialBoard,
    hasZoomedOut,
    onHover,
    onRefReady,
}: {
    boardData?: BoardData;
    windowAspect: number;
    windowSize: Size;
    isSelected: boolean;
    isLastHovered: boolean;
    isInitialBoard: boolean;
    hasZoomedOut: boolean;
    onOpen: (board: BoardData, rect: Rect) => void;
    onHover: (id: string | null) => void;
    onRefReady?: (id: string | null, ref: HTMLDivElement | null) => void;
}) {
    if (!boardData) return <EmptyBoard windowAspect={windowAspect} />;

    return (
        <Board
            boardData={boardData}
            windowAspect={windowAspect}
            windowSize={windowSize}
            isSelected={isSelected}
            isLastHovered={isLastHovered}
            isInitialBoard={isInitialBoard}
            hasZoomedOut={hasZoomedOut}
            onOpen={onOpen}
            onHover={onHover}
            onRefReady={onRefReady}
        />
    );
}

function Board({
    boardData,
    onOpen,
    windowAspect,
    windowSize,
    isSelected,
    isLastHovered,
    isInitialBoard,
    hasZoomedOut,
    onHover,
    onRefReady,
}: {
    boardData: BoardData;
    windowAspect: number;
    windowSize: Size;
    isSelected: boolean;
    isLastHovered: boolean;
    isInitialBoard: boolean;
    hasZoomedOut: boolean;
    onOpen: (board: BoardData, rect: Rect) => void;
    onHover: (id: string | null) => void;
    onRefReady?: (id: string | null, ref: HTMLDivElement | null) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [slotSize, setSlotSize] = useState<Vec2>({ x: 300, y: 300 });

    const { observe } = useDimensions({
        onResize: ({ width, height }) => {
            setSlotSize({ x: width, y: height });
        },
    });

    // Notify parent when ref is ready
    useLayoutEffect(() => {
        if (ref.current && onRefReady) {
            onRefReady(boardData.id, ref.current);
        }
    }, [boardData.id, onRefReady]);

    // We calculate the inverse scale so the "CanvasWorld" inside stays 1:1 with window pixels
    const scaleX = slotSize.x / windowSize.width;
    const scaleY = slotSize.y / windowSize.height;

    const zIndex = isSelected || isLastHovered ? 100 : undefined;

    // Determine if this board should appear zoomed (selected or initial board before zoom out)
    const isZoomed = isSelected || (isInitialBoard && !hasZoomedOut);

    return (
        <motion.div
            whileHover="hovered"
            initial="initial"
            onHoverStart={() => {
                if (hasZoomedOut) {
                    onHover(boardData.id);
                }
            }}
            ref={(el) => {
                observe(el);
                if (el) (ref as any).current = el;
            }}
            style={{
                aspectRatio: windowAspect,
                zIndex: zIndex,
            }}
            className="relative w-full"
            onClick={(e) => {
                e.stopPropagation();
                if (!ref.current || isSelected || !hasZoomedOut) return;

                const rect = ref.current.getBoundingClientRect();
                onOpen(boardData, {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                });
            }}
        >
            <motion.div
                variants={{
                    initial: { scale: 1, zIndex: 0 },
                    hovered: {
                        scale: isZoomed || !hasZoomedOut ? 1 : 1.2,
                        zIndex: 50,
                    },
                }}
                animate={{
                    borderRadius: isZoomed ? "0px" : `${BOARD_SLOT_ROUNDED}px`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="pointer-events-auto relative h-full w-full cursor-pointer overflow-hidden bg-white shadow-sm"
            >
                {/* Title - Fade out when zoomed (selected or during initial animation) */}
                <motion.div
                    initial={{ opacity: isZoomed ? 0 : 1 }}
                    animate={{ opacity: isZoomed ? 0 : 1 }}
                    transition={{ duration: 0.8, ease: [0.52, 0.22, 0, 1] }}
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
                            transform: `scale(${scaleX}, ${scaleY})`,
                        }}
                        className={
                            isSelected
                                ? "pointer-events-auto"
                                : "pointer-events-none"
                        }
                    >
                        <CanvasWorld
                            objects={
                                new Map(boardData.objects.map((o) => [o.id, o]))
                            }
                            camera={{
                                position: { x: 0, y: 0 },
                                size: {
                                    x: windowSize.width,
                                    y: windowSize.height,
                                },
                                zoom: 1,
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function EmptyBoard({ windowAspect }: { windowAspect: number }) {
    return (
        <div
            style={{ aspectRatio: windowAspect }}
            className={`flex w-full items-center justify-center rounded-[${BOARD_SLOT_ROUNDED}px] bg-black/10`}
        ></div>
    );
}

function CreateBoard({
    windowAspect,
    hasZoomedOut,
}: {
    windowAspect: number;
    hasZoomedOut: boolean;
}) {
    return (
        <motion.div
            style={{ aspectRatio: windowAspect }}
            whileHover={{ scale: hasZoomedOut ? 1.05 : 1 }}
            whileTap={{ scale: hasZoomedOut ? 0.95 : 1 }}
            className={`flex w-full cursor-pointer items-center justify-center rounded-[${BOARD_SLOT_ROUNDED}px] bg-black/10`}
        >
            <Plus className="text-white opacity-50" />
        </motion.div>
    );
}
