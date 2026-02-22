import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeContextProvider } from "../types/ThemeContext";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

function Root() {
    // Get localStorage saved theme
    const saved = localStorage.getItem("theme");
    const theme = saved === "dark" || saved === "light" ? saved : "dark"; // Default to dark mode

    return (
        <ThemeContextProvider defaultTheme={theme}>
            <App />
        </ThemeContextProvider>
    );
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <Root />
    </StrictMode>
);
