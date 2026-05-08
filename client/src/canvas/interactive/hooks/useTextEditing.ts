import { useEffect, useRef, useState } from "react";
import { TextObject, Vec2, WorldObject } from "../../../types/canvas";

export function useTextEditing(
    updateOrAddObject: (object: WorldObject) => void,
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void
) {
    const [editingText, setEditingText] = useState<{
        object: TextObject;
        cursorVisible: boolean;
    } | null>(null);
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
        setEditingText({ object, cursorVisible: true });
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

    useEffect(() => {
        if (!editingText) return;

        const handleMouseDown = () => {
            closeTextEditor();
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

            setEditingText({ object: updatedObject, cursorVisible: true });
            updateOrAddObject(updatedObject);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousedown", handleMouseDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleMouseDown);
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
