import { useContext, useEffect } from "react";
import CanvasLoader from "../CanvasLoader.tsx";
import { ThemeContext } from "../types/context/ThemeContext.tsx";
import { ShowDebugInfoContext } from "../types/context/ShowDebugInfoContext";
import { AntiAliasingContext } from "../types/context/AntiAliasingContext";

export default function App() {
    const themeContext = useContext(ThemeContext);
    const showDebugInfoContext = useContext(ShowDebugInfoContext);
    const antiAliasingContext = useContext(AntiAliasingContext);

    useEffect(() => {
        // Apply theme to <body> whenever it changes
        document.body.classList.remove("light", "dark");
        document.body.classList.add(themeContext.theme);
        localStorage.setItem("theme", themeContext.theme);
    }, [themeContext.theme]);

    useEffect(() => {
        localStorage.setItem(
            "show-debug-info",
            showDebugInfoContext.value + ""
        );
    }, [showDebugInfoContext.value]);

    useEffect(() => {
        localStorage.setItem("anti-aliasing", antiAliasingContext.value + "");
    }, [antiAliasingContext.value]);

    return <CanvasLoader />;
}
