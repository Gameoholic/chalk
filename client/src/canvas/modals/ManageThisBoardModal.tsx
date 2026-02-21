import { useContext, useEffect, useState } from "react";
import { X, Check, Loader2, Trash2, RotateCcw } from "lucide-react";
import { SessionContext } from "../../types/SessionContext";
import { CanvasContext } from "../../types/CanvasContext";

const MAX_NAME_LENGTH = 50;

export default function ManageThisBoardModal({
    onRename,
    onReset,
    onDelete,
    onClose,
}: {
    onRename: (newName: string) => Promise<void>;
    onReset: () => Promise<void>;
    onDelete: () => Promise<void>;
    onClose: () => void;
}) {
    const canvasContext = useContext(CanvasContext);

    const [draftName, setDraftName] = useState(
        canvasContext.getCurrentBoard().name
    );
    const [name, setName] = useState(canvasContext.getCurrentBoard().name);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false); // New success state
    const [nameError, setNameError] = useState<string | null>(null);
    const [resetError, setResetError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        const trimmed = name.slice(0, MAX_NAME_LENGTH);
        setDraftName(trimmed);
        setName(trimmed);
    }, [name]);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const handleSave = async () => {
        const trimmed = draftName.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed || trimmed === name) {
            setIsEditing(false);
            return;
        }

        try {
            setIsSaving(true);
            setNameError(null);
            await onRename(trimmed);
            setIsEditing(false);
            setName(trimmed); // todo wanna get rid of this
        } catch (err) {
            setNameError("Failed to rename board: " + (err as Error)?.message);
        }
        setIsSaving(false);
    };

    const handleResetConfirmed = async () => {
        try {
            setIsSaving(true);
            setResetError(null);
            await onReset();
            setConfirmingReset(false);
        } catch (err) {
            setResetError("Failed to reset board: " + (err as Error)?.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        try {
            setIsSaving(true);
            setDeleteError(null);
            await onDelete();
            setIsDeleted(true); // Trigger success state
            // We do not set isSaving to false here to keep buttons disabled during reload
        } catch (err) {
            setDeleteError(
                "Failed to delete board: " + (err as Error)?.message
            );
            setIsSaving(false);
        }
    };

    const formattedDate = new Date(
        canvasContext.getCurrentBoard().createdOn
    ).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md space-y-6 rounded-2xl bg-neutral-900 p-6 text-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 rounded-full p-2 text-gray-400 hover:bg-neutral-800 hover:text-white"
                >
                    <X size={18} />
                </button>

                <h2 className="text-lg font-semibold">Manage Board</h2>

                {/* Rename Section */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        Board name
                    </label>

                    <div className="flex h-10 items-center gap-2">
                        {isEditing ? (
                            <>
                                <input
                                    value={draftName}
                                    maxLength={MAX_NAME_LENGTH}
                                    disabled={isSaving || isDeleted}
                                    autoFocus
                                    onChange={(e) =>
                                        setDraftName(e.target.value)
                                    }
                                    className="h-10 flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isDeleted}
                                    className="flex h-10 items-center justify-center rounded-xl bg-blue-600 px-3 disabled:opacity-60"
                                >
                                    {isSaving ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setDraftName(name);
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving || isDeleted}
                                    className="h-10 rounded-xl px-3 text-sm text-gray-300 hover:bg-neutral-800 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 truncate text-sm">
                                    {name}
                                </span>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    disabled={isSaving || isDeleted}
                                    className="h-10 rounded-full px-3 text-xs font-medium text-blue-400 hover:bg-blue-400/10 disabled:opacity-40"
                                >
                                    Edit
                                </button>
                            </>
                        )}
                    </div>
                    {nameError && (
                        <div className="text-sm text-red-400">{nameError}</div>
                    )}
                </div>

                <div className="space-y-4">
                    <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        Danger Zone
                    </label>

                    {/* Reset Section */}
                    <div className="space-y-2">
                        {!confirmingReset ? (
                            <button
                                onClick={() => {
                                    setConfirmingReset(true);
                                    setConfirmingDelete(false);
                                }}
                                disabled={isSaving || isDeleted}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 py-2 text-sm font-medium text-red-400/80 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-60"
                            >
                                <RotateCcw size={14} />
                                Reset Board
                            </button>
                        ) : (
                            <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                                <p className="text-sm text-red-200/90">
                                    Permanently erase this board? This cannot be
                                    undone.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleResetConfirmed}
                                        disabled={isSaving || isDeleted}
                                        className="flex-1 rounded-md bg-red-500 py-2 text-sm font-medium transition-colors hover:bg-red-400 disabled:opacity-60"
                                    >
                                        {isSaving ? (
                                            <Loader2
                                                size={16}
                                                className="mx-auto animate-spin"
                                            />
                                        ) : (
                                            "Yes, Reset"
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setConfirmingReset(false)
                                        }
                                        disabled={isSaving || isDeleted}
                                        className="flex-1 rounded-md bg-neutral-700 py-2 text-sm hover:bg-neutral-600 disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        {resetError && (
                            <div className="text-sm text-red-400">
                                {resetError}
                            </div>
                        )}
                    </div>

                    {/* Delete Section */}
                    <div className="space-y-2">
                        {!confirmingDelete ? (
                            <button
                                onClick={() => {
                                    setConfirmingDelete(true);
                                    setConfirmingReset(false);
                                }}
                                disabled={isSaving || isDeleted}
                                className="group flex w-full items-center justify-center gap-2 rounded-lg border border-red-600/20 bg-red-600/10 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-600 hover:text-white disabled:opacity-60"
                            >
                                <Trash2 size={14} />
                                Delete Board
                            </button>
                        ) : (
                            <div className="space-y-3 rounded-lg border border-red-600/40 bg-red-600/10 p-4">
                                <p className="text-sm font-medium text-red-300">
                                    Permanently delete this board? This cannot
                                    be undone.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDeleteConfirmed}
                                        disabled={isSaving || isDeleted}
                                        className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                                    >
                                        {isSaving && !isDeleted ? (
                                            <Loader2
                                                size={16}
                                                className="mx-auto animate-spin"
                                            />
                                        ) : (
                                            "Yes, Delete Board"
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setConfirmingDelete(false)
                                        }
                                        disabled={isSaving || isDeleted}
                                        className="flex-1 rounded-md bg-neutral-700 py-2 text-sm hover:bg-neutral-600 disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Success Message */}
                        {isDeleted && (
                            <div className="animate-in fade-in slide-in-from-top-1 text-sm font-medium text-green-400">
                                Board deleted!
                            </div>
                        )}
                        {/* Error Message */}
                        {deleteError && (
                            <div className="text-sm text-red-400">
                                {deleteError}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-neutral-800" />

                <div className="space-y-1">
                    <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        Created
                    </label>
                    <span className="text-sm text-gray-300">
                        {formattedDate}
                    </span>
                </div>
            </div>
        </div>
    );
}
