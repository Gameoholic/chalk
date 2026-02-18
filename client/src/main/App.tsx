import { useContext, useEffect } from "react";
import CanvasLoader from "../CanvasLoader.tsx";
import { ThemeContext } from "../types/ThemeContext";

interface AppProps {
    theme: "light" | "dark";
    setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}

export default function App() {
    const themeContext = useContext(ThemeContext);
    // Apply theme to <body> whenever it changes
    useEffect(() => {
        document.body.classList.remove("light", "dark");
        document.body.classList.add(themeContext.theme);
        localStorage.setItem("theme", themeContext.theme);
    }, [themeContext.theme]);

    return <CanvasLoader />;
}
