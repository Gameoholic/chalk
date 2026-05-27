import { useEffect, useRef, useState } from "react";

interface InlineNumberInputProps {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    style?: React.CSSProperties;
}

export function InlineNumberInput({
    value,
    min,
    max,
    onChange,
    style,
}: InlineNumberInputProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            inputRef.current?.select();
        }
    }, [editing]);

    function startEditing() {
        setDraft(String(value));
        setEditing(true);
    }

    function commit() {
        const parsed = parseInt(draft, 10);
        if (!isNaN(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)));
        }
        setEditing(false);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            commit();
        } else if (e.key === "Escape") {
            setEditing(false);
        }
    }

    const baseStyle: React.CSSProperties = {
        fontSize: 11,
        color: "var(--card-foreground)",
        minWidth: 24,
        ...style,
    };

    if (editing) {
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={handleKeyDown}
                    style={{
                        width: 36,
                        fontSize: baseStyle.fontSize,
                        color: baseStyle.color,
                        border: "1px solid var(--border)",
                        borderRadius: 3,
                        padding: "0 3px",
                        backgroundColor: "var(--card)",
                        outline: "none",
                    }}
                />
                <span style={{ fontSize: baseStyle.fontSize, color: baseStyle.color }}>px</span>
            </span>
        );
    }

    return (
        <span
            onClick={startEditing}
            title="Click to type a value"
            style={{ ...baseStyle, cursor: "text" }}
        >
            {value}px
        </span>
    );
}
