import { useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { createUser } from "../../api/users";
import { WavyText } from "../../components/WavyText";

interface Props {
    onLogin: () => void;
    onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password || !displayName) {
            setError("Email, password and display name are required.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            console.log("Attempting to create user");
            await createUser(email, password, displayName);
            console.log("Successfully created user");
            onClose();
        } catch {
            console.error("Failed to create user.");
            setError("Couldn't create account.");
        }
        setIsSubmitting(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-account-modal text-account-modal-foreground flex h-7/12 w-1/2 flex-col gap-4 rounded-2xl p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="text-account-modal-secondary cursor-pointer self-end rounded-md hover:brightness-125"
                >
                    <X size={25} />
                </button>

                <h2 className="inline-flex text-3xl font-semibold">
                    Create a
                    <WavyText text="free" className="ml-2 text-pink-400" />
                    account
                </h2>

                {/* Email input */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    disabled={isSubmitting}
                    className="border-account-modal-secondary bg-account-modal text-account-modal-foreground w-full rounded-xl border px-3 py-2 focus:outline-none"
                />

                {/* Display name input */}
                <input
                    type="text"
                    placeholder="Display name (can change later)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.trim())}
                    disabled={isSubmitting}
                    className="border-account-modal-secondary bg-account-modal text-account-modal-foreground w-full rounded-xl border px-3 py-2 focus:outline-none"
                />

                {/* Password input with hide/show toggle */}
                <div className="relative w-full">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="border-account-modal-secondary bg-account-modal text-account-modal-foreground w-full rounded-xl border px-3 py-2 pr-10 focus:outline-none" // Added pr-10 for space
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-account-modal-secondary absolute top-1/2 right-3 -translate-y-1/2 hover:text-white"
                    >
                        {showPassword ? (
                            <EyeOff size={20} />
                        ) : (
                            <Eye size={20} />
                        )}
                    </button>
                </div>

                {/* Confirm password input with hide/show toggle */}
                <div className="relative w-full">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="border-account-modal-secondary bg-account-modal text-account-modal-foreground w-full rounded-xl border px-3 py-2 pr-10 focus:outline-none" // Added pr-10 for space
                    />
                    <button
                        type="button"
                        onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="text-account-modal-secondary absolute top-1/2 right-3 -translate-y-1/2 hover:text-white"
                    >
                        {showConfirmPassword ? (
                            <EyeOff size={20} />
                        ) : (
                            <Eye size={20} />
                        )}
                    </button>
                </div>

                {/* Create account button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-account-modal-accent text-account-modal-foreground relative flex cursor-pointer items-center justify-center rounded-2xl py-2 font-medium transition hover:brightness-110 disabled:cursor-default disabled:opacity-50"
                >
                    <div className="relative flex items-center justify-center">
                        <span>
                            {isSubmitting
                                ? "Creating account..."
                                : "Create account"}
                        </span>

                        {isSubmitting && (
                            <Loader2
                                size={16}
                                className="absolute left-full ml-2 animate-spin"
                            />
                        )}
                    </div>
                </button>

                {/* Error message */}
                {error && <p className="text-destructive text-sm">{error}</p>}

                {/* Bottom actions */}
                <div className="text-account-modal-secondary text-md mt-auto flex justify-between">
                    <button
                        onClick={onLogin}
                        disabled={isSubmitting}
                        className="cursor-pointer hover:brightness-110"
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}
