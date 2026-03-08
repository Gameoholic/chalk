import { createContext, useState } from "react";
import { BoardData, ChalkData, UserData } from "./data";
import { WorldObject } from "./canvas";

interface ThemeContextType {
    theme: "light" | "dark";
    updateTheme: (theme: "light" | "dark") => void;
}

export const ThemeContext = createContext<ThemeContextType>(null!);

export function ThemeContextProvider({
    children,
    defaultTheme,
}: {
    children: React.ReactNode;
    defaultTheme: "light" | "dark";
}) {
    const [theme, setTheme] = useState<"light" | "dark">(defaultTheme);

    function updateTheme(newTheme: "light" | "dark") {
        setTheme(newTheme);
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                updateTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}
