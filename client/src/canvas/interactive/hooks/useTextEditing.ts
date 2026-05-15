import { useEffect, useRef, useState } from "react";
import { TextObject, Vec2, WorldObject } from "../../../types/canvas";

interface UseTextEditingProps {
    // null if not currently editing a text object
    editingTextObject: TextObject | null;
    updateOrAddObject: (object: WorldObject) => void;
    commitChanges: (
        updatedObjects?: WorldObject[],
        deletedObjectIds?: string[]
    ) => void;
    deselectAllObjects: () => void;
}

export function useTextEditing({
    editingTextObject,
    updateOrAddObject,
    commitChanges,
    deselectAllObjects,
}: UseTextEditingProps) {
    const [cursorVisible, setCursorVisible] = useState(true);
    const cursorBlinkIntervalRef = useRef<number | undefined>(undefined);

    // Latest-ref so the keydown listener always reads the freshest object
    const editingTextObjectRef = useRef<TextObject | null>(editingTextObject);
    useEffect(() => {
        editingTextObjectRef.current = editingTextObject;
    });

    // When text editing ends, commit the object
    const previousEditingTextObjectRef = useRef<TextObject | null>(null);
    useEffect(() => {
        const prev = previousEditingTextObjectRef.current;
        if (prev && prev.id !== editingTextObject?.id) {
            commitChanges([prev], undefined);
        }
        previousEditingTextObjectRef.current = editingTextObject;
    }, [editingTextObject]);

    // Cursor blink
    useEffect(() => {
        if (!editingTextObject) {
            clearInterval(cursorBlinkIntervalRef.current);
            return;
        }
        setCursorVisible(true);
        cursorBlinkIntervalRef.current = window.setInterval(() => {
            setCursorVisible((v) => !v);
        }, 500);
        return () => clearInterval(cursorBlinkIntervalRef.current);
    }, [editingTextObject?.id]);

    // Keyboard input
    useEffect(() => {
        if (!editingTextObject) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Reset blink so cursor stays visible right after a keypress
            clearInterval(cursorBlinkIntervalRef.current);
            setCursorVisible(true);
            cursorBlinkIntervalRef.current = window.setInterval(() => {
                setCursorVisible((v) => !v);
            }, 500);

            const current = editingTextObjectRef.current;
            if (!current) return;
            const text = current.text;
            const cursorIndex = current.text.length;

            if (e.key === "Escape") {
                deselectAllObjects();
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

            updateOrAddObject(updatedObject);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editingTextObject?.id]);

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

        return {
            x: Math.max(requiredW, obj.boxSize.x),
            y: Math.max(requiredH, obj.boxSize.y),
        };
    }

    return {
        cursorVisible,
    };
}
