import { createContext, useState } from "react";

interface AntiAliasingContextType {
    value: boolean;
    setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AntiAliasingContext = createContext<AntiAliasingContextType>(
    null!
);

export function AntiAliasingContextProvider({
    children,
    defaultValue,
}: {
    children: React.ReactNode;
    defaultValue: boolean;
}) {
    const [value, setValue] = useState<boolean>(defaultValue);

    return (
        <AntiAliasingContext.Provider value={{ value, setValue }}>
            {children}
        </AntiAliasingContext.Provider>
    );
}
