import { useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";

interface Props {
    onLogin: (email: string, password: string) => Promise<void>;
    onForgotPassword: () => void;
    onCreateAccount: () => void;
    onClose: () => void;
}

export default function LoginModal({
    onLogin,
    onForgotPassword,
    onCreateAccount,
    onClose,
}: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onLogin(email.trim(), password);
        } catch {
            setError("Invalid email or password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="bg-account-modal text-account-modal-foreground flex h-1/2 w-1/2 flex-col gap-4 rounded-2xl p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="text-account-modal-secondary hover:bg-account-modal-secondary/20 self-end rounded-md p-1 hover:brightness-125"
                >
                    <X size={20} />
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

                {/* Error message */}
                {error && <p className="text-destructive text-sm">{error}</p>}

                {/* Login button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-account-modal-accent text-account-modal-foreground cursor-pointer rounded-2xl py-2 font-medium transition hover:brightness-110 disabled:opacity-50"
                >
                    {isSubmitting && (
                        <Loader2 size={16} className="animate-spin" />
                    )}
                    Log in
                </button>

                {/* Bottom actions */}
                <div className="text-account-modal-secondary mt-auto flex justify-between text-sm">
                    <button
                        onClick={onForgotPassword}
                        disabled={isSubmitting}
                        className="cursor-pointer hover:brightness-110"
                    >
                        Forgot password?
                    </button>
                    <button
                        onClick={onCreateAccount}
                        disabled={isSubmitting}
                        className="cursor-pointer hover:brightness-110"
                    >
                        Create account
                    </button>
                </div>
            </div>
        </div>
    );
}
