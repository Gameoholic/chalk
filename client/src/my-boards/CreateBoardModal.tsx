import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createBoard } from "../api/boards";

interface CreateBoardModalProps {
    onClose: () => void;
    onCreated: (name: string) => void;
}

export default function CreateBoardModal({
    onClose,
    onCreated,
}: CreateBoardModalProps) {
    const [name, setName] = useState("New Board");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus and select on mount
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 120);
    }, []);

    // Close on Escape, confirm on Enter
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLoading && !success) onClose();
            if (e.key === "Enter") handleCreate();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [name, isLoading, success]);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed || isLoading || success) return;

        setIsLoading(true);
        setError(null);

        try {
            await createBoard(trimmed);

            onCreated(trimmed);
            setSuccess(true);

            setTimeout(() => {
                window.location.reload();
            }, 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed.");
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 z-200"
                style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                    if (!isLoading && !success) onClose();
                }}
            />

            {/* Modal */}
            <div className="pointer-events-none fixed inset-0 z-250 flex items-center justify-center">
                <motion.div
                    className="pointer-events-auto w-80 overflow-hidden rounded-xl shadow-xl"
                    style={{ backgroundColor: "var(--card)" }}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.52, 0.22, 0, 1] }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-4 p-5">
                        <p
                            className="text-sm font-medium"
                            style={{ color: "var(--card-foreground)" }}
                        >
                            New Board
                        </p>

                        {/* Name input */}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs tracking-widest uppercase"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Name
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError(null);
                                }}
                                disabled={isLoading || success}
                                className="w-full rounded-lg px-3 py-2 text-sm transition-all outline-none disabled:opacity-50"
                                style={{
                                    backgroundColor: "var(--accent)",
                                    color: "var(--card-foreground)",
                                    border: "1px solid transparent",
                                }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor =
                                        "var(--muted-foreground)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "transparent")
                                }
                                placeholder="Board name"
                                maxLength={64}
                            />

                            {/* Error / Success feedback */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.p
                                        key="error"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="text-xs text-red-500"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                                {success && (
                                    <motion.p
                                        key="success"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="text-xs text-green-500"
                                    >
                                        Created board!
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                            <motion.button
                                whileHover={{
                                    scale: isLoading || success ? 1 : 1.02,
                                }}
                                whileTap={{
                                    scale: isLoading || success ? 1 : 0.98,
                                }}
                                onClick={() => {
                                    if (!isLoading && !success) onClose();
                                }}
                                disabled={isLoading || success}
                                className="rounded-lg px-3 py-1.5 text-xs transition-colors disabled:opacity-40"
                                style={{
                                    color: "var(--muted-foreground)",
                                    backgroundColor: "transparent",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "var(--accent)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                }
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{
                                    scale:
                                        !name.trim() || isLoading || success
                                            ? 1
                                            : 1.02,
                                }}
                                whileTap={{
                                    scale:
                                        !name.trim() || isLoading || success
                                            ? 1
                                            : 0.98,
                                }}
                                onClick={handleCreate}
                                disabled={!name.trim() || isLoading || success}
                                className="flex min-w-[60px] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                                style={{
                                    backgroundColor: "var(--card-foreground)",
                                    color: "var(--card)",
                                }}
                            >
                                {isLoading ? (
                                    <svg
                                        className="h-3.5 w-3.5 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        />
                                    </svg>
                                ) : (
                                    "Create"
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );
}
