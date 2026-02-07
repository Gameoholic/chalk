import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface Props {
    onLogin: (email: string, password: string) => Promise<void>;
    onForgotPassword: () => void;
    onCreateAccount: () => void;
}

export default function LoginModal({
    onLogin,
    onForgotPassword,
    onCreateAccount,
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
        } catch {
            setError("Invalid email or password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full max-w-md transform space-y-6 rounded-2xl bg-neutral-900 p-6 text-white shadow-2xl transition-all duration-300">
            <button className="absolute top-3 right-3 rounded-full p-2 text-gray-400 hover:bg-neutral-800 hover:text-white">
                <X size={18} />
            </button>

            <h2 className="text-lg font-semibold">Log in</h2>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-400">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        disabled={isSubmitting}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-400">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        disabled={isSubmitting}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                {error && <div className="text-sm text-red-400">{error}</div>}
            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
            >
                {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    "Log in"
                )}
            </button>

            <div className="flex items-center justify-between text-sm">
                <button
                    onClick={onForgotPassword}
                    className="text-gray-400 hover:text-white"
                >
                    Forgot password?
                </button>
                <button
                    onClick={onCreateAccount}
                    className="font-medium text-blue-400 hover:text-blue-300"
                >
                    Create account
                </button>
            </div>
        </div>
    );
}
