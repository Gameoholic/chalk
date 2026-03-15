import { createContext, useState } from "react";

interface FirstTimeVisitorContextType {
    value: "welcome" | "tour" | "false";
    setValue: React.Dispatch<
        React.SetStateAction<"welcome" | "tour" | "false">
    >;
}

export const FirstTimeVisitorContext =
    createContext<FirstTimeVisitorContextType>(null!);

export function FirstTimeVisitorContextProvider({
    children,
    defaultValue,
}: {
    children: React.ReactNode;
    defaultValue: "welcome" | "tour" | "false";
}) {
    const [value, setValue] = useState<"welcome" | "tour" | "false">(
        defaultValue
    );

    return (
        <FirstTimeVisitorContext.Provider value={{ value, setValue }}>
            {children}
        </FirstTimeVisitorContext.Provider>
    );
}
