import { Loader2, XCircle } from "lucide-react";

interface SaveErrorBannerProps {
    error: string;
    retryCooldownSecondsOrStatus: number | "retrying";
}

export default function SaveErrorBanner({
    error,
    retryCooldownSecondsOrStatus,
}: SaveErrorBannerProps) {
    return (
        <div className="animate-in fade-in slide-in-from-top-2 pointer-events-none fixed top-6 left-1/2 z-100 -translate-x-1/2">
            <div
                className="flex flex-col gap-1 rounded-xl px-5 py-3 text-sm font-medium shadow-xl"
                style={{
                    backgroundColor: "var(--error)",
                    color: "var(--error-foreground)",
                }}
            >
                <div className="flex items-center gap-3">
                    {retryCooldownSecondsOrStatus === "retrying" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                    <span>{error}</span>
                </div>

                {typeof retryCooldownSecondsOrStatus === "number" && (
                    <span
                        className="ml-7 text-xs opacity-80"
                        style={{ color: "var(--error-foreground)" }}
                    >
                        Retrying in {retryCooldownSecondsOrStatus}s
                    </span>
                )}

                {retryCooldownSecondsOrStatus === "retrying" && (
                    <span
                        className="ml-7 text-xs opacity-80"
                        style={{ color: "var(--error-foreground)" }}
                    >
                        Retrying...
                    </span>
                )}
            </div>
        </div>
    );
}
