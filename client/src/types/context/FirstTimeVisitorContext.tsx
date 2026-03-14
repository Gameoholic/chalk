import { createContext, useState } from "react";

interface FirstTimeVisitorContextType {
    value: boolean;
    setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FirstTimeVisitorContext =
    createContext<FirstTimeVisitorContextType>(null!);

export function FirstTimeVisitorContextProvider({
    children,
    defaultValue,
}: {
    children: React.ReactNode;
    defaultValue: boolean;
}) {
    const [value, setValue] = useState<boolean>(defaultValue);

    return (
        <FirstTimeVisitorContext.Provider value={{ value, setValue }}>
            {children}
        </FirstTimeVisitorContext.Provider>
    );
}
