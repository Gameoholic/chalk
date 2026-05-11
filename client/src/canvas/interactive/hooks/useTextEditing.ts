import { useContext, useEffect, useRef, useState } from "react";
import { TextObject, Vec2, WorldObject } from "../../../types/canvas";
import { screenToWorld } from "../utils/canvasCoords";
import { CanvasContext } from "../../../types/context/CanvasContext";

interface UseTextEditingProps {
    updateOrAddObject: (object: WorldObject) => void;
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    getCurrentTextObject: () => TextObject | null;
}

export function useTextEditing({
    updateOrAddObject,
    commitChanges,
    getCurrentTextObject,
}: UseTextEditingProps) {
    const canvasContext = useContext(CanvasContext);

    const getCurrentTextObjectRef = useRef(getCurrentTextObject);
    useEffect(() => {
        getCurrentTextObjectRef.current = getCurrentTextObject;
    });

    const [editingText, setEditingText] = useState<{
        objectId: string;
        cursorVisible: boolean;
    } | null>(null);
    // textbox state is separate to editingText, since it can be triggered via a drawingInteraction before the text editor itself opens
    const [drawingTextBoxObjectId, setDrawingTextBoxObjectId] = useState<
        string | null
    >(null);
    const cursorBlinkIntervalRef = useRef<number | undefined>(undefined);

    function openTextEditor(object: TextObject) {
        clearInterval(cursorBlinkIntervalRef.current);
        cursorBlinkIntervalRef.current = window.setInterval(() => {
            setEditingText((prev) =>
                prev ? { ...prev, cursorVisible: !prev.cursorVisible } : prev
            );
        }, 500);
        setEditingText({ objectId: object.id, cursorVisible: true });
        setDrawingTextBoxObjectId(object.id);
    }

    function closeTextEditor() {
        clearInterval(cursorBlinkIntervalRef.current);
        const current = getCurrentTextObjectRef.current(); // stale closure fix
        if (editingText && current) {
            updateOrAddObject(current);
            commitChanges([current], undefined);
        }
        setEditingText(null);
        setDrawingTextBoxObjectId(null);
    }

    useEffect(() => {
        return () => {
            clearInterval(cursorBlinkIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (!editingText) return;

        const handleMouseDown = (e: MouseEvent) => {
            const mouseWorld = screenToWorld(
                e as any,
                canvasContext.local_camera
            );
            const current = getCurrentTextObjectRef.current(); // fix stale colsure problem by using an explicit getter
            if (!current) return;
            const { boxPosition, boxSize } = current;

            const insideBox =
                mouseWorld.x >= boxPosition.x &&
                mouseWorld.x <= boxPosition.x + boxSize.x &&
                mouseWorld.y >= boxPosition.y &&
                mouseWorld.y <= boxPosition.y + boxSize.y;

            if (!insideBox) {
                closeTextEditor();
            }
        };

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
                prev ? { ...prev, cursorVisible: true } : prev
            );

            const current = getCurrentTextObjectRef.current(); // stale closure fix
            if (!current) return;
            const text = current.text;
            const cursorIndex = current.text.length;

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
                newText =
                    text.slice(0, cursorIndex) +
                    e.key +
                    text.slice(cursorIndex);
                newCursorIndex = cursorIndex + 1;
            } else {
                return;
            }

            const updatedObject = {
                ...current,
                text: newText,
                boxSize: measureTextBox(newText, current),
            };

            setEditingText({ objectId: current.id, cursorVisible: true });
            updateOrAddObject(updatedObject);
        };

        window.addEventListener("keydown", handleKeyDown);

        // Delay the mousedown event, because when clicking to select object this function is called,
        // and then mouse up and then this fires, so the text editor opens and then closes immediately.
        const timeoutId = window.setTimeout(() => {
            window.addEventListener("mousedown", handleMouseDown);
        }, 0);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleMouseDown);
            window.clearTimeout(timeoutId);
        };
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

    return {
        editingText,
        drawingTextBoxObjectId,
        setDrawingTextBoxObjectId,
        openTextEditor,
        closeTextEditor,
        measureTextBox,
    };
}
