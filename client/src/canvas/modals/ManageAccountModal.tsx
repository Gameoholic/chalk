import { useContext, useEffect, useState } from "react";
import { X, Check, Loader2, LogOut } from "lucide-react";
import { UserData } from "../../types/data";
import { SessionContext } from "../../types/SessionContext";

const MAX_NAME_LENGTH = 50;

export default function ManageAccountModal({
    onUpdateDisplayName,
    onLogout,
    onClose,
}: {
    onUpdateDisplayName: (newName: string) => Promise<void>;
    onLogout: () => Promise<void>;
    onClose: () => void;
}) {
    const sessionContext = useContext(SessionContext);

    const [draftName, setDraftName] = useState(
        sessionContext.userData.displayName
    );
    const [displayName, setDisplayName] = useState(
        sessionContext.userData.displayName
    );
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const [loggedOut, setLoggedOut] = useState(false);

    useEffect(() => {
        const trimmed = sessionContext.userData.displayName.slice(
            0,
            MAX_NAME_LENGTH
        );
        setDraftName(trimmed);
        setDisplayName(trimmed);
    }, [sessionContext.userData.displayName]);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const handleSaveName = async () => {
        const trimmed = draftName.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed || trimmed === displayName) {
            setIsEditing(false);
            return;
        }

        try {
            setIsSaving(true);
            setNameError(null);
            await onUpdateDisplayName(trimmed);
            setIsEditing(false);
        } catch (err) {
            setNameError("Failed to update name: " + (err as Error)?.message);
        }
        setIsSaving(false);
    };

    const handleLogoutConfirmed = async () => {
        try {
            setIsSaving(true);
            setLogoutError(null);
            await onLogout();
            setLoggedOut(true);
        } catch (err) {
            setLogoutError("Failed to log out: " + (err as Error)?.message);
            setIsSaving(false);
        }
    };

    const formattedDate = new Date(
        sessionContext.userData.createdOn
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

                <h2 className="text-lg font-semibold">Manage Account</h2>

                {/* Account Details Section */}
                <div className="space-y-4">
                    {/* Display Name (Editable) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                            Display Name
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
                                            setDraftName(e.target.value)
                                        }
                                        className="h-10 flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSaveName}
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
                        {nameError && (
                            <div className="text-sm text-red-400">
                                {nameError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Log out button */}
                <div className="space-y-2">
                    {!confirmingLogout ? (
                        <button
                            onClick={() => setConfirmingLogout(true)}
                            disabled={isSaving}
                            className="group flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-neutral-700 hover:text-white disabled:opacity-60"
                        >
                            <LogOut size={14} />
                            Log Out
                        </button>
                    ) : (
                        <div className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
                            <p className="text-sm font-medium text-gray-300">
                                Are you sure you want to log out?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleLogoutConfirmed}
                                    disabled={isSaving}
                                    className="flex-1 rounded-md bg-neutral-600 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-500 disabled:opacity-60"
                                >
                                    {isSaving ? (
                                        <Loader2
                                            size={16}
                                            className="mx-auto animate-spin"
                                        />
                                    ) : (
                                        "Yes, Log Out"
                                    )}
                                </button>
                                <button
                                    onClick={() => setConfirmingLogout(false)}
                                    disabled={isSaving}
                                    className="flex-1 rounded-md bg-neutral-900 py-2 text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                    {loggedOut && (
                        <div className="text-sm font-medium text-green-400">
                            Logged out!
                        </div>
                    )}
                    {logoutError && (
                        <div className="text-sm text-red-400">
                            {logoutError}
                        </div>
                    )}
                </div>

                <div className="border-t border-neutral-800" />

                {/* Account Data */}
                <div className="space-y-1">
                    {/* Email */}
                    <div className="space-y-1 pt-2">
                        <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                            Email
                        </label>
                        <span className="block text-sm text-gray-300">
                            {sessionContext.userData.email}
                        </span>
                    </div>

                    {/* Id */}
                    <div className="space-y-1 pt-2">
                        <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                            User ID
                        </label>
                        <span className="block text-sm text-gray-300">
                            {sessionContext.userData.id}
                        </span>
                    </div>

                    {/* Account created */}
                    <div className="space-y-1 pt-2">
                        <label className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                            Account Created
                        </label>
                        <span className="block text-sm text-gray-300">
                            {formattedDate}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
