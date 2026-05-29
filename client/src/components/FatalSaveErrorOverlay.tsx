import { AlertTriangle } from "lucide-react";

export default function FatalErrorOverlay() {
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
            <div
                className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl p-10 text-center shadow-2xl"
                style={{ backgroundColor: "#1a1a1a", color: "#f5f5f5" }}
            >
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#3a1a1a" }}
                >
                    <AlertTriangle size={28} style={{ color: "#ff6b6b" }} />
                </div>

                <div className="flex flex-col gap-2">
                    <h1
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: "#f5f5f5" }}
                    >
                        Something went wrong
                    </h1>
                    <p className="text-sm" style={{ color: "#a0a0a0" }}>
                        A fatal error occurred while saving your work.
                        <br />
                        Please refresh the page to continue.
                    </p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="w-full rounded-2xl py-3 text-base font-semibold shadow transition active:scale-95"
                    style={{ backgroundColor: "#ff8ca5", color: "#1a1a1a", cursor: "pointer" }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#ffa4b8")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#ff8ca5")
                    }
                >
                    Refresh page
                </button>
            </div>
        </div>
    );
}
