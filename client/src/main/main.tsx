import "./index.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeContextProvider } from "../types/context/ThemeContext";
import { ShowDebugInfoContextProvider } from "../types/context/ShowDebugInfoContext";

import "../env";
import { AntiAliasingContextProvider } from "../types/context/AntiAliasingContext";
import { FirstTimeVisitorContextProvider } from "../types/context/FirstTimeVisitorContext";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

function Root() {
    // Get localStorage saved theme
    const savedTheme = localStorage.getItem("theme");
    const theme =
        savedTheme === "dark" || savedTheme === "light" ? savedTheme : "dark"; // Default to dark mode

    const savedShowDebugInfo = localStorage.getItem("show-debug-info");
    const showDebugInfo = savedShowDebugInfo === "true"; // Default to false

    const savedAntiAliasing = localStorage.getItem("anti-aliasing");
    const showAntiAliasing = savedAntiAliasing === "true"; // Default to false

    // If the key has never been set, this is a first-time visitor
    const savedFirstTimeVisitor = localStorage.getItem("first-time-visitor") as
        | "welcome"
        | "tour"
        | "false"
        | null;
    const isFirstTimeVisitor =
        savedFirstTimeVisitor === null ? "welcome" : savedFirstTimeVisitor;

    return (
        <FirstTimeVisitorContextProvider defaultValue={isFirstTimeVisitor}>
            <AntiAliasingContextProvider defaultValue={showAntiAliasing}>
                <ShowDebugInfoContextProvider defaultValue={showDebugInfo}>
                    <ThemeContextProvider defaultTheme={theme}>
                        <App />
                    </ThemeContextProvider>
                </ShowDebugInfoContextProvider>
            </AntiAliasingContextProvider>
        </FirstTimeVisitorContextProvider>
    );
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <Root />
    </StrictMode>
);
