import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

function Root() {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        // Get localStorage saved theme
        const saved = localStorage.getItem("theme");
        if (saved === "dark" || saved === "light") return saved;
        // Default to light mode
        return "light";
    });

    // Apply theme to <body> whenever it changes
    useEffect(() => {
        document.body.classList.remove("light", "dark");
        document.body.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    return <App theme={theme} setTheme={setTheme} />;
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <Root />
    </StrictMode>
);
