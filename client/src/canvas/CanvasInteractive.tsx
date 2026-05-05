import React, {
    useRef,
    useEffect,
    useState,
    useLayoutEffect,
    useContext,
    useMemo,
} from "react";
import useDimensions from "react-cool-dimensions";
import CanvasRenderer from "./CanvasRenderer";
import {
    Camera,
    EllipseObject,
    EraserPathObject,
    LineObject,
    PathObject,
    RectObject,
    TextObject,
    Vec2,
    WorldObject,
} from "../types/canvas";
import { v4 as uuidv4 } from "uuid";
import { CheckCircle, FileVideoCamera, Loader2, XCircle } from "lucide-react";
import { CanvasContext } from "../types/context/CanvasContext";
import {
    EllipseTool,
    EraserTool,
    LineTool,
    PencilTool,
    RectTool,
    SelectTool,
    TextTool,
    Tool,
    ToolType,
} from "../types/tool";
import ObjectContextMenu from "./ObjectContextMenu";

interface ContextMenuState {
    object: WorldObject;
    screenX: number;
    screenY: number;
}

interface CanvasInteractiveProps {
    onObjectsCommit: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    onCameraCommit: () => void;
}

// Handles canvas camera movement and zooming, as well as all mouse interactions including drawing
// Stores the objects state and camera state
function CanvasInteractive({
    onObjectsCommit,
    onCameraCommit,
}: CanvasInteractiveProps) {
    const canvasContext = useContext(CanvasContext);
    // Automatically set camera size to this component's MAX allocated size
    const { observe, unobserve, width, height, entry } = useDimensions({
        onResize: ({ observe, unobserve, width, height, entry }) => {
            canvasContext.setLocalCamera((prev) => ({
                ...prev,
                size: { x: width, y: height },
            }));

            unobserve(); // To stop observing the current target element
            observe(); // To re-start observing the current target element
        },
    });

    // Either add an entirely new object or update an existing one (based on its ID)
    // For example: Every time a new point is drawn in a line, or a circle's radius is being changed.
    // Basically, ANY change to an object calls this method.
    function updateOrAddObject(object: WorldObject) {
        canvasContext.setLocalUnsavedObjects((prev) => [
            ...prev.filter((obj) => obj.id !== object.id),
            object,
        ]);
    }

    function removeObject(objectId: string) {
        // First, remove the object from the local objects (handles cases where the object was created, then immediately deleted before committing to server)
        canvasContext.setLocalUnsavedObjects((prev) =>
            prev.filter((obj) => obj.id !== objectId)
        );
        // Then prepare the object to be deleted
        canvasContext.setLocalDeletedObjectIds(
            (prev) => new Set([...prev, objectId])
        );
    }

    // User released left click so object should be committed to database
    function commitChanges(
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) {
        if (
            (updatedObjects?.length === 0 && deletedObjectIds?.length === 0) ||
            (updatedObjects === undefined && deletedObjectIds === undefined)
        ) {
            console.warn(
                "Commit changes was called, but there are no changes to commit."
            );
        }
        // Explicitly tells CanvasEditor what to delete, bypassing state closure bugs caused by relying only on CanvasContext states
        onObjectsCommit(updatedObjects, deletedObjectIds);
    }

    // Camera ended drag or zoom changed
    function commitCamera() {
        onCameraCommit();
    }

    // Show context menu on right clicking an object
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
        null
    );
    function displayContextMenuState(contextMenuState: ContextMenuState) {
        setContextMenu(contextMenuState);
    }

    // Text editing
    const [editingText, setEditingText] = useState<{
        object: TextObject;
        cursorVisible: boolean;
    } | null>(null);
    const cursorBlinkIntervalRef = useRef<number | undefined>(undefined);

    function openTextEditor(object: TextObject) {
        clearInterval(cursorBlinkIntervalRef.current);
        cursorBlinkIntervalRef.current = window.setInterval(() => {
            setEditingText((prev) =>
                prev ? { ...prev, cursorVisible: !prev.cursorVisible } : prev
            );
        }, 500);
        setEditingText({
            object,
            cursorVisible: true,
        });
    }

    function closeTextEditor() {
        clearInterval(cursorBlinkIntervalRef.current);
        if (editingText) {
            updateOrAddObject(editingText.object);
            commitChanges([editingText.object], undefined);
        }
        setEditingText(null);
    }

    useEffect(() => {
        return () => {
            clearInterval(cursorBlinkIntervalRef.current);
        };
    }, []);

    // When editingText changes:
    useEffect(() => {
        if (!editingText) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Reset blink so cursor is always visible right after a keypress
            clearInterval(cursorBlinkIntervalRef.current);
            cursorBlinkIntervalRef.current = window.setInterval(() => {
                setEditingText((prev) =>
                    prev
                        ? { ...prev, cursorVisible: !prev.cursorVisible }
                        : prev
                );
            }, 500);
            setEditingText((prev) =>
                prev
                    ? {
                          ...prev,
                          cursorVisible: true,
                      }
                    : prev
            );

            const text = editingText.object.text;
            const cursorIndex = editingText.object.text.length;

            if (e.key === "Escape") {
                closeTextEditor();
                return;
            }

            let newText = text;
            let newCursorIndex = cursorIndex;

            if (e.key === "Backspace") {
                if (cursorIndex > 0) {
                    newText =
                        text.slice(0, cursorIndex - 1) +
                        text.slice(cursorIndex);
                    newCursorIndex = cursorIndex - 1;
                }
            } else if (e.key === "Delete") {
                if (cursorIndex < text.length) {
                    newText =
                        text.slice(0, cursorIndex) +
                        text.slice(cursorIndex + 1);
                }
            } else if (e.key === "ArrowLeft") {
                newCursorIndex = Math.max(0, cursorIndex - 1);
            } else if (e.key === "ArrowRight") {
                newCursorIndex = Math.min(text.length, cursorIndex + 1);
            } else if (e.key === "Enter") {
                newText =
                    text.slice(0, cursorIndex) + "\n" + text.slice(cursorIndex);
                newCursorIndex = cursorIndex + 1;
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                // Writable character
                newText =
                    text.slice(0, cursorIndex) +
                    e.key +
                    text.slice(cursorIndex);
                newCursorIndex = cursorIndex + 1;
            } else {
                return;
            }

            const updatedObject = {
                ...editingText.object,
                text: newText,
                boxSize: measureTextBox(newText, editingText.object),
            };

            setEditingText({
                object: updatedObject,
                cursorVisible: true,
            });
            updateOrAddObject(updatedObject);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editingText]);

    function measureTextBox(text: string, obj: TextObject): Vec2 {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const style = [
            obj.italic ? "italic" : "",
            obj.bold ? "bold" : "",
            `${obj.fontSize}px`,
            obj.fontFamily,
        ]
            .filter(Boolean)
            .join(" ");
        ctx.font = style;

        const lines = text.split("\n");
        const longestLine = lines.reduce((max, line) => {
            const w = ctx.measureText(line).width;
            return w > max ? w : max;
        }, 0);

        const lineHeightPx = obj.fontSize * (obj.lineHeight ?? 1.2);
        const requiredW = longestLine + 16;
        const requiredH = lines.length * lineHeightPx + 8;

        // Expand if needed, but never shrink box
        return {
            x: Math.max(requiredW, obj.boxSize.x),
            y: Math.max(requiredH, obj.boxSize.y),
        };
    }

    // MOUSE EVENTS
    const {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    } = handleMouseEvents(
        updateOrAddObject,
        removeObject,
        commitChanges,
        commitCamera,
        displayContextMenuState,
        openTextEditor,
        () => editingText, // getter to avoid stale closure
        closeTextEditor
    );

    // Server-synced objects and local unsaved objects and locally deleted objects, render all
    const allObjects = useMemo(() => {
        const map = new Map<string, WorldObject>();
        canvasContext
            .getCurrentBoard()
            .objects.forEach((obj) => map.set(obj.id, obj));
        canvasContext.local_unsavedObjects.forEach((obj) =>
            map.set(obj.id, obj)
        );
        canvasContext.local_deletedObjectIds.forEach((id) => map.delete(id));
        return map;
    }, [
        canvasContext.getCurrentBoard().objects,
        canvasContext.local_unsavedObjects,
        canvasContext.local_deletedObjectIds,
    ]);

    return (
        <div ref={observe} className="h-full w-full touch-none">
            <CanvasRenderer
                camera={canvasContext.local_camera}
                objects={allObjects}
                selectedObjectId={contextMenu?.object.id ?? null}
                onTouchStart={handleTouchStart} // Mobile support
                onTouchMove={handleTouchMove} // Mobile support
                onTouchEnd={handleTouchEnd} // Mobile support
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                textCursor={
                    editingText
                        ? {
                              objectId: editingText.object.id,
                              index: editingText.object.text.length,
                              visible: editingText.cursorVisible,
                          }
                        : undefined
                }
            />

            {contextMenu && (
                <ObjectContextMenu
                    object={contextMenu.object}
                    screenX={contextMenu.screenX}
                    screenY={contextMenu.screenY}
                    onUpdate={(updated) => {
                        updateOrAddObject(updated);
                        commitChanges([updated], undefined);
                    }}
                    onDelete={() => {
                        removeObject(contextMenu.object.id);
                        commitChanges(undefined, [contextMenu.object.id]);
                        setContextMenu(null);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

function screenToWorld(
    e: React.MouseEvent<HTMLCanvasElement>,
    camera: Camera
): Vec2 {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / camera.zoom + camera.position.x;
    const y = (e.clientY - rect.top) / camera.zoom + camera.position.y;
    return { x, y };
}

function handleMouseEvents(
    updateObject: (object: WorldObject) => void,
    removeObject: (objectId: string) => void,
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void,
    commitCamera: () => void,
    displayContextMenu: (contextMenuState: ContextMenuState) => void,
    openTextEditor: (object: TextObject) => void,
    getEditingText: () => {
        object: TextObject;
        cursorVisible: boolean;
    } | null, // to avoid stale closure
    closeTextEditor: () => void
) {
    const canvasContext = useContext(CanvasContext);

    const tool: Tool = canvasContext.local_tool;
    const camera: Camera = canvasContext.local_camera;

    const LEFT_MOUSE_BUTTON = 0;
    const MIDDLE_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 2;

    // Interaction starts with mouse down and ends with (usually) mouse up (or other special cases)
    const currentInteraction = useRef<
        DrawingInteraction | CameraDragInteraction | null
    >(null);

    interface Interaction {
        type: "camera-drag" | "drawing";
    }
    interface CameraDragInteraction extends Interaction {
        type: "camera-drag";
        lastMousePos: Vec2;
    }
    interface DrawingInteraction extends Interaction {
        type: "drawing";
        objectId: string;
        tool: Exclude<Tool, SelectTool>;
        path: Vec2[];
        latestObject?: WorldObject;
    }

    const toolHandleMouseMove: Record<
        ToolType,
        (e: React.MouseEvent<HTMLCanvasElement>) => void
    > = {
        select: () => {
            console.error("Unexpected mouse move with select tool");
        },
        pencil: handleMouseMovePencilDraw,
        eraser: handleMouseMoveEraserDraw,
        line: handleMouseMoveLineDraw,
        rect: handleMouseMoveRectDraw,
        ellipse: handleMouseMoveEllipseDraw,
        text: handleMouseMoveTextDraw,
    };

    // GLOBAL mouseup to fix mouse up outside of canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            currentInteraction.current = null;
        };
        window.addEventListener("touchend", handleWindowMouseUp);
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleWindowMouseUp);
            window.removeEventListener("touchend", handleWindowMouseUp);
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const editingText = getEditingText(); // avoid stale closure
        if (
            e.button === LEFT_MOUSE_BUTTON &&
            tool.type === "select" &&
            editingText
        ) {
            const mouseWorldCoords = screenToWorld(e, camera);
            // If clicked outside the editing object, commit
            const bb = getBoundingBox(editingText.object);
            if (
                !bb ||
                mouseWorldCoords.x < bb.min.x ||
                mouseWorldCoords.x > bb.max.x ||
                mouseWorldCoords.y < bb.min.y ||
                mouseWorldCoords.y > bb.max.y
            ) {
                closeTextEditor();
            }
            // Click inside while editing: could add click-to-reposition cursor here later
            return;
        }
        if (e.button === LEFT_MOUSE_BUTTON && tool.type !== "select") {
            currentInteraction.current = {
                type: "drawing",
                objectId: uuidv4(),
                tool: tool,
                path: [],
            };
            toolHandleMouseMove[currentInteraction.current.tool.type](e); // On first initial mouse down also treat it as a draw (so pressing and quickly releasing still draws a point)
            return;
        }
        if (e.button === RIGHT_MOUSE_BUTTON) {
            const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
            const hoveredObject = findObjectAtCoords(mouseWorldCoords);
            if (hoveredObject) {
                displayContextMenu({
                    object: hoveredObject,
                    screenX: e.clientX,
                    screenY: e.clientY,
                });
            }
        }

        if (
            e.button === LEFT_MOUSE_BUTTON ||
            e.button === MIDDLE_MOUSE_BUTTON
        ) {
            currentInteraction.current = {
                type: "camera-drag",
                lastMousePos: { x: e.clientX, y: e.clientY },
            };
            return;
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            toolHandleMouseMove[currentInteraction.current.tool.type](e);
            return;
        }

        if (currentInteraction.current?.type === "camera-drag") {
            handleMouseMoveDragCamera(e);
            return;
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentInteraction.current?.type === "drawing") {
            const objectToCommit = currentInteraction.current.latestObject;
            if (objectToCommit) {
                if (objectToCommit.type === "text") {
                    openTextEditor(objectToCommit as TextObject);
                } else {
                    commitChanges([objectToCommit], undefined);
                }
            }
        }
        if (currentInteraction.current?.type === "camera-drag") {
            commitCamera();
        }
        currentInteraction.current = null;
    };

    function handleMouseMovePencilDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const pencilTool = currentInteraction.current.tool as PencilTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        const newPath: PathObject = {
            id: currentInteraction.current.objectId,
            type: "path",
            color: pencilTool.color,
            stroke: pencilTool.stroke,
            points: currentInteraction.current.path,
        };
        currentInteraction.current.latestObject = newPath;
        updateObject(newPath);
    }

    function handleMouseMoveEraserDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const eraserTool = currentInteraction.current.tool as EraserTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        currentInteraction.current.path.push(mouseWorldCoords);

        if (eraserTool.eraserMode === "object") {
            const hoveredObject = findObjectAtCoords(mouseWorldCoords);
            if (hoveredObject) {
                removeObject(hoveredObject.id);
                commitChanges(undefined, [hoveredObject.id]);
            }
        } else {
            const newPath: EraserPathObject = {
                id: currentInteraction.current.objectId,
                type: "eraser-path",
                stroke: eraserTool.stroke,
                points: currentInteraction.current.path,
            };
            currentInteraction.current.latestObject = newPath;
            updateObject(newPath);
        }
    }

    function handleMouseMoveLineDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const lineTool = currentInteraction.current.tool as LineTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
        }

        currentInteraction.current.path[1] = mouseWorldCoords;

        const newLine: LineObject = {
            id: currentInteraction.current.objectId,
            type: "line",
            color: lineTool.color,
            stroke: lineTool.stroke,
            point1: currentInteraction.current.path[0],
            point2: currentInteraction.current.path[1],
        };
        currentInteraction.current.latestObject = newLine;
        updateObject(newLine);
    }

    function handleMouseMoveRectDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const rectTool = currentInteraction.current.tool as RectTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!rectTool.hollow) {
                return;
            }
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newRect: RectObject = {
            id: currentInteraction.current.objectId,
            type: "rect",
            color: rectTool.color,
            hollow: rectTool.hollow,
            hollowStroke: rectTool.hollow ? rectTool.hollowStroke : 0,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        };
        currentInteraction.current.latestObject = newRect;
        updateObject(newRect);
    }

    function handleMouseMoveEllipseDraw(
        e: React.MouseEvent<HTMLCanvasElement>
    ) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const ellipseTool = currentInteraction.current.tool as EllipseTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
            // We aren't gonna be able to stroke it, so there's legit nothing to draw if user just clicks and releases without dragging
            // If it's hollow we can at least use the stroke size so we allow that
            if (!ellipseTool.hollow) {
                return;
            }
        }

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newEllipse: EllipseObject = {
            id: currentInteraction.current.objectId,
            type: "ellipse",
            color: ellipseTool.color,
            hollow: ellipseTool.hollow,
            hollowStroke: ellipseTool.hollow ? ellipseTool.hollowStroke : 0,
            position: currentInteraction.current.path[0],
            size: {
                x:
                    currentInteraction.current.path[1].x -
                    currentInteraction.current.path[0].x,
                y:
                    currentInteraction.current.path[1].y -
                    currentInteraction.current.path[0].y,
            },
        };
        currentInteraction.current.latestObject = newEllipse;
        updateObject(newEllipse);
    }

    function handleMouseMoveTextDraw(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "drawing") {
            return;
        }
        const textTool = currentInteraction.current.tool as TextTool;

        const mouseWorldCoords: Vec2 = screenToWorld(e, camera);
        if (currentInteraction.current.path.length === 0) {
            currentInteraction.current.path[0] = mouseWorldCoords;
        }

        // Enforce a minimum box size so a single click still produces a large enough textbox
        const MIN_W = 20;
        const MIN_H = 10;

        currentInteraction.current.path[1] = mouseWorldCoords;
        const newText: TextObject = {
            id: currentInteraction.current.objectId,
            type: "text",
            text: "",
            color: textTool.color,
            bold: textTool.bold,
            italic: textTool.italic,
            fontFamily: textTool.fontFamily,
            fontSize: textTool.fontSize,
            lineHeight: textTool.lineHeight,
            boxPosition: currentInteraction.current.path[0],
            boxSize: {
                x: Math.max(
                    currentInteraction.current.path[1].x -
                        currentInteraction.current.path[0].x,
                    MIN_W
                ),
                y: Math.max(
                    currentInteraction.current.path[1].y -
                        currentInteraction.current.path[0].y,
                    MIN_H
                ),
            },
        };
        currentInteraction.current.latestObject = newText;
        updateObject(newText);
    }

    function handleMouseMoveDragCamera(e: React.MouseEvent<HTMLCanvasElement>) {
        if (currentInteraction.current?.type !== "camera-drag") {
            return;
        }

        const dx =
            (e.clientX - currentInteraction.current.lastMousePos.x) /
            camera.zoom;
        const dy =
            (e.clientY - currentInteraction.current.lastMousePos.y) /
            camera.zoom;

        canvasContext.setLocalCamera((prev) => ({
            ...prev,
            position: {
                x: prev.position.x - dx,
                y: prev.position.y - dy,
            },
        }));

        currentInteraction.current.lastMousePos = {
            x: e.clientX,
            y: e.clientY,
        };
    }

    // // Camera zoom
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom =
            e.deltaY < 0 ? camera.zoom * zoomFactor : camera.zoom / zoomFactor;
        const clampedZoom = Math.max(0.01, Math.min(1000, newZoom));

        const worldX = camera.position.x + mouseX / camera.zoom;
        const worldY = camera.position.y + mouseY / camera.zoom;

        canvasContext.setLocalCamera({
            ...camera,
            zoom: clampedZoom,
            position: {
                x: worldX - mouseX / clampedZoom,
                y: worldY - mouseY / clampedZoom,
            },
        });
        commitCamera();
    };

    // Right click on canvas
    function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
        e.preventDefault();
    }

    function findObjectAtCoords(coords: Vec2): WorldObject | null {
        for (const obj of canvasContext
            .getCurrentBoard()
            .objects.concat(canvasContext.local_unsavedObjects)
            .reverse()) {
            // reverse so topmost-rendered object is selected
            const bb = getBoundingBox(obj);
            if (!bb) continue;
            if (
                coords.x >= bb.min.x &&
                coords.x <= bb.max.x &&
                coords.y >= bb.min.y &&
                coords.y <= bb.max.y
            ) {
                return obj;
            }
        }
        return null;
    }

    function getBoundingBox(obj: WorldObject): { min: Vec2; max: Vec2 } | null {
        switch (obj.type) {
            case "path":
            case "eraser-path": {
                if (obj.points.length === 0) return null;
                const xs = obj.points.map((p) => p.x);
                const ys = obj.points.map((p) => p.y);
                const pad = (obj.stroke ?? 0) / 2;
                return {
                    min: { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad },
                    max: { x: Math.max(...xs) + pad, y: Math.max(...ys) + pad },
                };
            }
            case "line": {
                const pad = (obj.stroke ?? 0) / 2;
                return {
                    min: {
                        x: Math.min(obj.point1.x, obj.point2.x) - pad,
                        y: Math.min(obj.point1.y, obj.point2.y) - pad,
                    },
                    max: {
                        x: Math.max(obj.point1.x, obj.point2.x) + pad,
                        y: Math.max(obj.point1.y, obj.point2.y) + pad,
                    },
                };
            }
            case "rect":
            case "ellipse": {
                const x0 = Math.min(
                    obj.position.x,
                    obj.position.x + obj.size.x
                );
                const y0 = Math.min(
                    obj.position.y,
                    obj.position.y + obj.size.y
                );
                return {
                    min: { x: x0, y: y0 },
                    max: {
                        x: x0 + Math.abs(obj.size.x),
                        y: y0 + Math.abs(obj.size.y),
                    },
                };
            }
            case "text": {
                const x0 = Math.min(
                    obj.boxPosition.x,
                    obj.boxPosition.x + obj.boxSize.x
                );
                const y0 = Math.min(
                    obj.boxPosition.y,
                    obj.boxPosition.y + obj.boxSize.y
                );
                return {
                    min: { x: x0, y: y0 },
                    max: {
                        x: x0 + Math.abs(obj.boxSize.x),
                        y: y0 + Math.abs(obj.boxSize.y),
                    },
                };
            }
            default:
                return null;
        }
    }

    // ---------------------------------- Mobile support: ----------------------------------------

    function touchToMouseEvent(
        e: React.TouchEvent<HTMLCanvasElement>,
        button = 0
    ): React.MouseEvent<HTMLCanvasElement> {
        const touch = e.touches[0] ?? e.changedTouches[0];
        return {
            ...e,
            button,
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: e.target,
            preventDefault: () => e.preventDefault(),
        } as unknown as React.MouseEvent<HTMLCanvasElement>;
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            handleMouseDown(touchToMouseEvent(e, 0));
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        // Custom implementation for zoom pinch with two fingers
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const dist = Math.hypot(dx, dy);

            if (lastPinchDistance.current !== null) {
                const scale = dist / lastPinchDistance.current;
                // Midpoint between the two fingers (in screen space)
                const midX = (touch1.clientX + touch2.clientX) / 2;
                const midY = (touch1.clientY + touch2.clientY) / 2;
                const rect = (
                    e.target as HTMLCanvasElement
                ).getBoundingClientRect();
                const canvasMidX = midX - rect.left;
                const canvasMidY = midY - rect.top;

                canvasContext.setLocalCamera((prev) => {
                    const newZoom = Math.max(
                        0.01,
                        Math.min(100, prev.zoom * scale)
                    );
                    const worldX = prev.position.x + canvasMidX / prev.zoom;
                    const worldY = prev.position.y + canvasMidY / prev.zoom;
                    return {
                        ...prev,
                        zoom: newZoom,
                        position: {
                            x: worldX - canvasMidX / newZoom,
                            y: worldY - canvasMidY / newZoom,
                        },
                    };
                });
            }
            lastPinchDistance.current = dist;
        } else {
            lastPinchDistance.current = null;
            if (e.touches.length === 1) {
                handleMouseMove(touchToMouseEvent(e));
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        commitCamera();
        handleMouseUp(touchToMouseEvent(e));
    };

    const lastPinchDistance = useRef<number | null>(null);

    // ---------------------------------- ^Mobile support^ ----------------------------------------

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
        handleContextMenu,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}

export default CanvasInteractive;
