import { useState } from "react";
import { BoardData } from "../../types/canvas";
import { XCircle, CheckCircle } from "lucide-react";

function ManageBoardModal({
    board,
    onClose,
    onRename,
}: {
    board: BoardData;
    onClose: () => void;
    onRename: (newName: string) => Promise<void>;
}) {
    const [newName, setNewName] = useState(board.name);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRename = async () => {
        if (!newName.trim()) {
            setError("Board name cannot be empty");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onRename(newName.trim());
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || "Failed to rename board");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-xl bg-neutral-900 p-5 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                        Manage Board
                    </h2>
                    <button onClick={onClose} className="text-white">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Current Name */}
                <p className="mb-2 text-sm text-gray-300">Current Name:</p>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-md border border-gray-600 bg-neutral-800 p-2 text-white focus:border-blue-400 focus:outline-none"
                />

                {/* Error / Success */}
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                {success && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-green-400">
                        <CheckCircle size={16} /> Renamed successfully!
                    </p>
                )}

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRename}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Rename"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ManageBoardModal;
