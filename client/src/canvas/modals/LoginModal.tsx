import { useState } from "react";
import { X, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { login } from "../../api/auth";

interface Props {
    onForgotPassword: () => void;
    onCreateAccount: () => void;
    onClose: () => void;
}

export default function LoginModal({
    onForgotPassword,
    onCreateAccount,
    onClose,
}: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [hasLoggedIn, setHasLoggedIn] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            console.log("Attempting to log in");
            await login(email, password);
            console.log("Successfully logged in");
            setHasLoggedIn(true);

            // Slight delay so user sees success message
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch {
            console.error("Failed to log in.");
            setError("Couldn't log in.");
        }
        setIsSubmitting(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-account-modal text-account-modal-foreground flex h-7/12 w-1/2 flex-col gap-4 rounded-2xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="text-account-modal-secondary cursor-pointer self-end rounded-md transition hover:brightness-125"
                >
                    <X size={25} />
                </button>

                <h2 className="text-3xl font-semibold">
                    Log in to your account
                </h2>

                {/* Email input */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || hasLoggedIn}
                    className="border-account-modal-secondary bg-account-modal text-account-modal-foreground focus:ring-account-modal-accent w-full rounded-xl border px-3 py-2 transition focus:ring-2 focus:outline-none"
                />

                {/* Password input */}
                <div className="relative w-full">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting || hasLoggedIn}
                        className="border-account-modal-secondary bg-account-modal text-account-modal-foreground focus:ring-account-modal-accent w-full rounded-xl border px-3 py-2 pr-10 transition focus:ring-2 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-account-modal-secondary absolute top-1/2 right-3 -translate-y-1/2 transition hover:text-white"
                        disabled={isSubmitting || hasLoggedIn}
                    >
                        {showPassword ? (
                            <EyeOff size={20} />
                        ) : (
                            <Eye size={20} />
                        )}
                    </button>
                </div>

                {/* Login button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || hasLoggedIn}
                    className="bg-account-modal-accent text-account-modal-foreground relative flex cursor-pointer items-center justify-center rounded-2xl py-2 font-medium transition hover:brightness-110 disabled:cursor-default disabled:opacity-50"
                >
                    <div className="relative flex items-center justify-center">
                        <span>
                            {isSubmitting
                                ? "Logging in..."
                                : hasLoggedIn
                                  ? "Logged in!"
                                  : "Log in"}
                        </span>

                        {isSubmitting && (
                            <Loader2
                                size={16}
                                className="absolute left-full ml-2 animate-spin"
                            />
                        )}
                    </div>
                </button>

                {/* Success message */}
                {hasLoggedIn && (
                    <p className="animate-fade-in text-success text-sm font-medium">
                        Logged in!
                    </p>
                )}

                {/* Error message */}
                {error && (
                    <p className="text-error text-sm font-medium">{error}</p>
                )}

                {/* Bottom actions */}
                <div className="text-account-modal-secondary text-md mt-auto flex justify-between">
                    <button
                        onClick={onCreateAccount}
                        disabled={isSubmitting || hasLoggedIn}
                        className="cursor-pointer transition hover:brightness-110"
                    >
                        Create account
                    </button>
                    <button
                        onClick={onForgotPassword}
                        disabled={isSubmitting || hasLoggedIn}
                        className="cursor-pointer transition hover:brightness-110"
                    >
                        Forgot password?
                    </button>
                </div>
            </div>
        </div>
    );
}
