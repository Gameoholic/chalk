import { useContext, useEffect } from "react";
import CanvasLoader from "../CanvasLoader.tsx";
import { ThemeContext } from "../types/context/ThemeContext.tsx";
import { ShowDebugInfoContext } from "../types/context/ShowDebugInfoContext";

export default function App() {
    const themeContext = useContext(ThemeContext);
    const showDebugInfoContext = useContext(ShowDebugInfoContext);
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

    return <CanvasLoader />;
}
