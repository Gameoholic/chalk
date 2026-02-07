import { useEffect, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

const MAX_NAME_LENGTH = 32;

export default function ManageThisBoardModal({
    name,
    createdOn,
    onRename,
    onClose,
}: {
    name: string;
    createdOn: string | Date;
    onRename: (newName: string) => Promise<void>;
    onClose: () => void;
}) {
    const [draftName, setDraftName] = useState(name);
    const [displayName, setDisplayName] = useState(name);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep draftName and displayName in sync with prop when it changes
    useEffect(() => {
        const trimmed = name.slice(0, MAX_NAME_LENGTH);
        setDraftName(trimmed);
        setDisplayName(trimmed);
    }, [name]);

    // Close modal on ESC
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const handleSave = async () => {
        const trimmed = draftName.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed || trimmed === displayName) {
            setIsEditing(false);
            return;
        }

        try {
            setIsSaving(true);
            setError(null);

            console.log("Renaming board.");
            await onRename(trimmed);

            // Immediately update displayed name
            setDisplayName(trimmed);

            setIsEditing(false);
        } catch {
            console.log("Failed to rename board.");
            setError("Failed to rename board.");
        } finally {
            setIsSaving(false);
        }
    };

    const formattedDate = new Date(createdOn).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
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

                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400">
                        Board name
                    </label>

                    <div className="flex h-10 items-center gap-2">
                        {isEditing ? (
                            <>
                                <input
                                    value={draftName}
                                    maxLength={MAX_NAME_LENGTH}
                                    disabled={isSaving}
                                    autoFocus
                                    onChange={(e) =>
                                        setDraftName(
                                            e.target.value.slice(
                                                0,
                                                MAX_NAME_LENGTH
                                            )
                                        )
                                    }
                                    className="h-10 flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
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
                                        setDraftName(displayName);
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving}
                                    className="h-10 rounded-xl px-3 text-sm text-gray-300 hover:bg-neutral-800 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 truncate text-sm">
                                    {displayName}
                                </span>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    disabled={isSaving}
                                    className="h-10 rounded-full px-3 text-xs font-medium text-blue-400 hover:bg-blue-400/10 disabled:opacity-40"
                                >
                                    Edit
                                </button>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-red-400">{error}</div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-400">
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
