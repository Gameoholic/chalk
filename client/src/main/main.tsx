import "./index.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeContextProvider } from "../types/context/ThemeContext";
import { ShowDebugInfoContextProvider } from "../types/context/ShowDebugInfoContext";

import "../env";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

function Root() {
    // Get localStorage saved theme
    const savedTheme = localStorage.getItem("theme");
    const theme =
        savedTheme === "dark" || savedTheme === "light" ? savedTheme : "dark"; // Default to dark mode

    const savedShowDebugInfo = localStorage.getItem("show-debug-info");
    const showDebugInfo = savedShowDebugInfo === "true"; // Default to false

    return (
        <ShowDebugInfoContextProvider defaultValue={showDebugInfo}>
            <ThemeContextProvider defaultTheme={theme}>
                <App />
            </ThemeContextProvider>
        </ShowDebugInfoContextProvider>
    );
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <Root />
    </StrictMode>
);
