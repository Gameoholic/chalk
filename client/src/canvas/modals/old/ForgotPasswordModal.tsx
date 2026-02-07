import { useState } from "react";
import { ArrowLeft, X, Loader2 } from "lucide-react";

interface Props {
    onBack: () => void;
    onSubmit: (email: string) => Promise<void>;
}

export default function ForgotPasswordModal({ onBack, onSubmit }: Props) {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!email) {
            setError("Email is required.");
            return;
        }
        try {
            setIsSubmitting(true);
            setError(null);
            await onSubmit(email.trim());
            setSuccess(true);
        } catch {
            setError("Failed to send reset email.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative w-full max-w-md transform space-y-6 rounded-2xl bg-neutral-900 p-6 text-white shadow-2xl transition-all duration-300">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <h2 className="text-lg font-semibold">Reset password</h2>

            {success ? (
                <div className="text-sm text-green-400">
                    Check your email for reset instructions.
                </div>
            ) : (
                <>
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
                    {error && (
                        <div className="text-sm text-red-400">{error}</div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            "Send reset email"
                        )}
                    </button>
                </>
            )}
        </div>
    );
}
