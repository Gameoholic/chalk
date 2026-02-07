import { useState } from "react";
import { X, Loader2 } from "lucide-react";

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

    const handleSubmit = async () => {
        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onLogin(email.trim(), password);
        } catch (err) {
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
                className="text-card-foreground bg-card flex w-full max-w-sm flex-col gap-4 rounded-lg p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="self-end text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-semibold">Log in</h2>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="border-border bg-background text-foreground w-full rounded-[var(--radius)] border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-border bg-background text-foreground w-full rounded-[var(--radius)] border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                    {isSubmitting && (
                        <Loader2 size={16} className="animate-spin" />
                    )}
                    Log in
                </button>

                <div className="flex justify-between text-sm text-gray-400">
                    <button onClick={onForgotPassword} disabled={isSubmitting}>
                        Forgot password?
                    </button>
                    <button onClick={onCreateAccount} disabled={isSubmitting}>
                        Create account
                    </button>
                </div>
            </div>
        </div>
    );
}
