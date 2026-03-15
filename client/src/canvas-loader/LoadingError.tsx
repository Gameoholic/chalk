import React from "react";
import { logout } from "../api/auth"; // Adjust this path based on your folder structure

interface LoadingErrorProps {
    title: string;
    message: string;
}

export default function LoadingError({ title, message }: LoadingErrorProps) {
    const handleRefresh = () => {
        window.location.reload();
    };

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/";
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[6px]">
                <div className="group relative">
                    {/* Brand Glow */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#ff8ca5] to-[#ffa4b8] opacity-50 blur-2xl transition duration-1000 group-hover:opacity-80" />

                    {/* Main Container */}
                    <div className="relative flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center shadow-2xl">
                        {/* Error Icon */}
                        <div
                            className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border"
                            style={{
                                backgroundColor: "#ff8ca51a",
                                borderColor: "#ff8ca533",
                                color: "#ff8ca5",
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="h-7 w-7"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                            {title}
                        </h2>

                        <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-zinc-400">
                            {message}
                        </p>

                        {/* Action Buttons Container */}
                        <div className="mt-10 flex w-full flex-col gap-3">
                            {/* Primary Action: Refresh */}
                            <button
                                onClick={handleRefresh}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-base font-semibold shadow-lg transition active:scale-95"
                                style={{
                                    backgroundColor: "#ff8ca5",
                                    color: "#1a1a1a",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#ffa4b8")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#ff8ca5")
                                }
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    className="h-4 w-4"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                    />
                                </svg>
                                Refresh
                            </button>

                            {/* Secondary Action: Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full rounded-2xl border py-3 text-base font-medium transition active:scale-95"
                                style={{
                                    borderColor: "#ff8ca5",
                                    backgroundColor: "transparent",
                                    color: "#ffa4b8",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#ff8ca520")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                }
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
