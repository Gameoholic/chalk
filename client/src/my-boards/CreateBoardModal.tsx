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
                style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
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
                    className="pointer-events-auto w-80 overflow-hidden rounded-2xl bg-white shadow-2xl"
                    initial={{ opacity: 0, scale: 0.88, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.88, y: 16 }}
                    transition={{ duration: 0.35, ease: [0.52, 0.22, 0, 1] }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Amber accent bar — turns green on success */}
                    <motion.div
                        className="h-1.5 w-full"
                        animate={{
                            backgroundColor: success ? "#22c55e" : "#fbbf24",
                        }}
                        transition={{ duration: 0.4 }}
                    />

                    <div className="flex flex-col gap-5 px-7 pt-6 pb-7">
                        <p className="text-lg font-semibold tracking-tight text-gray-800">
                            New Board
                        </p>

                        {/* Name input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium tracking-widest text-gray-500 uppercase">
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
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 transition-all outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:opacity-50"
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
                                        className="text-xs font-medium text-green-500"
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
                                    scale: isLoading || success ? 1 : 1.03,
                                }}
                                whileTap={{
                                    scale: isLoading || success ? 1 : 0.97,
                                }}
                                onClick={() => {
                                    if (!isLoading && !success) onClose();
                                }}
                                disabled={isLoading || success}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{
                                    scale:
                                        !name.trim() || isLoading || success
                                            ? 1
                                            : 1.03,
                                }}
                                whileTap={{
                                    scale:
                                        !name.trim() || isLoading || success
                                            ? 1
                                            : 0.97,
                                }}
                                onClick={handleCreate}
                                disabled={!name.trim() || isLoading || success}
                                className="flex min-w-[72px] items-center justify-center rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <svg
                                        className="h-4 w-4 animate-spin"
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
