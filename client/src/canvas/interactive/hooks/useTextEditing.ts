import React, { useContext, useEffect, useRef, useState } from "react";
import { TextObject, WorldObject } from "../../../types/canvas";
import { measureTextBox } from "../utils/canvasTextBoxMeasurement";
import { CanvasContext } from "../../../types/context/CanvasContext";
import {
    computeLines,
    getCursorLineAndOffset,
} from "../../renderer/utils/computeTextLayout";
import { screenToWorld } from "../utils/canvasCoords";

interface UseTextEditingProps {
    // null if not currently editing a text object
    editingTextObject: TextObject | null;
    // world position of the click that entered editing mode; null = place cursor at end
    entryWorldPos: { x: number; y: number } | null;
    updateOrAddObject: (object: WorldObject) => void;
    removeObject: (objectId: string) => void;
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    deselectAllObjects: () => void;
}

function makeCtxForObject(
    obj: TextObject
): { ctx: CanvasRenderingContext2D; maxWidth: number } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = [
        obj.italic ? "italic" : "",
        obj.bold ? "bold" : "",
        `${obj.fontSize}px`,
        obj.fontFamily,
    ]
        .filter(Boolean)
        .join(" ");
    return { ctx, maxWidth: obj.boxSize.x - 8 };
}

// Converts a world-space click position to the nearest character index
function hitTestTextIndex(
    obj: TextObject,
    worldX: number,
    worldY: number
): number {
    const { ctx, maxWidth } = makeCtxForObject(obj);
    const lines = computeLines(obj.text, ctx, maxWidth);
    if (lines.length === 0) return 0;

    const lineHeightPx = obj.fontSize * obj.lineHeight;
    const relX = worldX - obj.boxPosition.x - 4;
    const relY = worldY - obj.boxPosition.y - 4;

    const lineIndex = Math.max(
        0,
        Math.min(lines.length - 1, Math.floor(relY / lineHeightPx))
    );
    const line = lines[lineIndex];

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= line.text.length; i++) {
        const dist = Math.abs(
            ctx.measureText(line.text.slice(0, i)).width - relX
        );
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    }
    return line.startIndex + best;
}

// Moves a cursor to the same visual column on the line above or below (arrow up/down)
function moveCursorByLine(
    obj: TextObject,
    cursorIdx: number,
    direction: "up" | "down"
): number {
    const { ctx, maxWidth } = makeCtxForObject(obj);
    const lines = computeLines(obj.text, ctx, maxWidth);
    if (lines.length <= 1)
        return direction === "up" ? 0 : obj.text.length;

    const { lineIndex, offsetInLine } = getCursorLineAndOffset(
        lines,
        cursorIdx
    );
    const cursorPixelX = ctx.measureText(
        lines[lineIndex].text.slice(0, offsetInLine)
    ).width;

    const targetLineIndex =
        direction === "up"
            ? Math.max(0, lineIndex - 1)
            : Math.min(lines.length - 1, lineIndex + 1);

    if (targetLineIndex === lineIndex) {
        return direction === "up" ? 0 : obj.text.length;
    }

    const targetLine = lines[targetLineIndex];
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= targetLine.text.length; i++) {
        const dist = Math.abs(
            ctx.measureText(targetLine.text.slice(0, i)).width - cursorPixelX
        );
        if (dist < bestDist) {
            bestDist = dist;
            best = i;
        }
    }
    return targetLine.startIndex + best;
}

export function useTextEditing({
    editingTextObject,
    entryWorldPos,
    updateOrAddObject,
    removeObject,
    commitChanges,
    deselectAllObjects,
}: UseTextEditingProps) {
    const canvasContext = useContext(CanvasContext);
    const camera = canvasContext.local_camera;

    const [cursorIndex, setCursorIndex] = useState(0);
    const cursorIndexRef = useRef(0);

    // null = no selection (cursor only); number = selection anchor position
    const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
    const selectionAnchorRef = useRef<number | null>(null);

    const [cursorVisible, setCursorVisible] = useState(true);
    const cursorBlinkIntervalRef = useRef<number | undefined>(undefined);

    const editingTextObjectRef = useRef<TextObject | null>(editingTextObject);
    useEffect(() => {
        editingTextObjectRef.current = editingTextObject;
    });

    // Keep refs in sync with state
    useEffect(() => {
        cursorIndexRef.current = cursorIndex;
    }, [cursorIndex]);
    useEffect(() => {
        selectionAnchorRef.current = selectionAnchor;
    }, [selectionAnchor]);

    // Reset cursor when switching to a new text object.
    // If a world-space entry position is provided (double-click), place cursor there;
    // otherwise default to end of text (new text box drawn from scratch).
    useEffect(() => {
        if (editingTextObject) {
            const idx = entryWorldPos
                ? hitTestTextIndex(
                      editingTextObject,
                      entryWorldPos.x,
                      entryWorldPos.y
                  )
                : editingTextObject.text.length;
            setCursorIndex(idx);
            cursorIndexRef.current = idx;
            setSelectionAnchor(null);
            selectionAnchorRef.current = null;
        }
    }, [editingTextObject?.id]);

    // Commit when text editing ends
    const previousEditingTextObjectRef = useRef<TextObject | null>(null);
    useEffect(() => {
        const prev = previousEditingTextObjectRef.current;
        if (prev && prev.id !== editingTextObject?.id) {
            if (prev.text.trim().length === 0) {
                removeObject(prev.id);
                commitChanges(undefined, [prev.id]);
            } else {
                commitChanges([prev], undefined);
            }
        }
        previousEditingTextObjectRef.current = editingTextObject;
    }, [editingTextObject]);

    function resetBlink() {
        clearInterval(cursorBlinkIntervalRef.current);
        setCursorVisible(true);
        cursorBlinkIntervalRef.current = window.setInterval(() => {
            setCursorVisible((v) => !v);
        }, 500);
    }

    // Cursor blink
    useEffect(() => {
        if (!editingTextObject) {
            clearInterval(cursorBlinkIntervalRef.current);
            return;
        }
        resetBlink();
        return () => clearInterval(cursorBlinkIntervalRef.current);
    }, [editingTextObject?.id]);

    // Keyboard input
    useEffect(() => {
        if (!editingTextObject) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            resetBlink();

            const current = editingTextObjectRef.current;
            if (!current) return;

            const text = current.text;
            const cursor = cursorIndexRef.current;
            const anchor = selectionAnchorRef.current;
            const hasSelection = anchor !== null && anchor !== cursor;
            const selStart = hasSelection ? Math.min(anchor!, cursor) : cursor;
            const selEnd = hasSelection ? Math.max(anchor!, cursor) : cursor;

            if (e.key === "Escape") {
                deselectAllObjects();
                return;
            }

            // Ctrl/Cmd+A: select all
            if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                e.preventDefault();
                setSelectionAnchor(0);
                selectionAnchorRef.current = 0;
                setCursorIndex(text.length);
                cursorIndexRef.current = text.length;
                return;
            }

            let newText = text;
            let newCursor = cursor;
            let newAnchor = anchor;

            if (e.key === "Backspace") {
                e.preventDefault();
                if (hasSelection) {
                    newText = text.slice(0, selStart) + text.slice(selEnd);
                    newCursor = selStart;
                    newAnchor = null;
                } else if (cursor > 0) {
                    newText =
                        text.slice(0, cursor - 1) + text.slice(cursor);
                    newCursor = cursor - 1;
                } else return;
            } else if (e.key === "Delete") {
                e.preventDefault();
                if (hasSelection) {
                    newText = text.slice(0, selStart) + text.slice(selEnd);
                    newCursor = selStart;
                    newAnchor = null;
                } else if (cursor < text.length) {
                    newText =
                        text.slice(0, cursor) + text.slice(cursor + 1);
                } else return;
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (hasSelection && !e.shiftKey) {
                    newCursor = selStart;
                    newAnchor = null;
                } else if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                    newCursor = Math.max(0, cursor - 1);
                } else {
                    newCursor = Math.max(0, cursor - 1);
                    newAnchor = null;
                }
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                if (hasSelection && !e.shiftKey) {
                    newCursor = selEnd;
                    newAnchor = null;
                } else if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                    newCursor = Math.min(text.length, cursor + 1);
                } else {
                    newCursor = Math.min(text.length, cursor + 1);
                    newAnchor = null;
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const next = moveCursorByLine(current, cursor, "up");
                if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                } else {
                    newAnchor = null;
                }
                newCursor = next;
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = moveCursorByLine(current, cursor, "down");
                if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                } else {
                    newAnchor = null;
                }
                newCursor = next;
            } else if (e.key === "Home") {
                e.preventDefault();
                const { ctx, maxWidth } = makeCtxForObject(current);
                const lines = computeLines(text, ctx, maxWidth);
                const { lineIndex } = getCursorLineAndOffset(lines, cursor);
                const next = lines[lineIndex].startIndex;
                if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                } else {
                    newAnchor = null;
                }
                newCursor = next;
            } else if (e.key === "End") {
                e.preventDefault();
                const { ctx, maxWidth } = makeCtxForObject(current);
                const lines = computeLines(text, ctx, maxWidth);
                const { lineIndex } = getCursorLineAndOffset(lines, cursor);
                const line = lines[lineIndex];
                const next = line.startIndex + line.text.length;
                if (e.shiftKey) {
                    if (newAnchor === null) newAnchor = cursor;
                } else {
                    newAnchor = null;
                }
                newCursor = next;
            } else if (e.key === "Enter") {
                newText =
                    text.slice(0, selStart) + "\n" + text.slice(selEnd);
                newCursor = selStart + 1;
                newAnchor = null;
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                newText = text.slice(0, selStart) + e.key + text.slice(selEnd);
                newCursor = selStart + 1;
                newAnchor = null;
            } else {
                return;
            }

            setCursorIndex(newCursor);
            cursorIndexRef.current = newCursor;
            setSelectionAnchor(newAnchor);
            selectionAnchorRef.current = newAnchor;

            if (newText !== text) {
                updateOrAddObject({
                    ...current,
                    text: newText,
                    boxSize: measureTextBox(newText, current),
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editingTextObject?.id]);

    // Called by useMouseEvents when the user clicks inside the editing text box
    function handleTextMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        const obj = editingTextObjectRef.current;
        if (!obj) return;
        const worldPos = screenToWorld(e, camera);
        const idx = hitTestTextIndex(obj, worldPos.x, worldPos.y);
        if (e.shiftKey) {
            if (selectionAnchorRef.current === null) {
                setSelectionAnchor(cursorIndexRef.current);
                selectionAnchorRef.current = cursorIndexRef.current;
            }
        } else {
            setSelectionAnchor(idx);
            selectionAnchorRef.current = idx;
        }
        setCursorIndex(idx);
        cursorIndexRef.current = idx;
        resetBlink();
    }

    // Called by useMouseEvents while the user drags inside the editing text box
    function handleTextMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        const obj = editingTextObjectRef.current;
        if (!obj) return;
        const worldPos = screenToWorld(e, camera);
        const idx = hitTestTextIndex(obj, worldPos.x, worldPos.y);
        setCursorIndex(idx);
        cursorIndexRef.current = idx;
        resetBlink();
    }

    return {
        cursorVisible,
        cursorIndex,
        selectionAnchor,
        handleTextMouseDown,
        handleTextMouseMove,
    };
}
