import { createContext, useState } from "react";

interface ShowDebugInfoContextType {
    value: boolean;
    setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ShowDebugInfoContext = createContext<ShowDebugInfoContextType>(
    null!
);

export function ShowDebugInfoContextProvider({
    children,
    defaultValue,
}: {
    children: React.ReactNode;
    defaultValue: boolean;
}) {
    const [value, setValue] = useState<boolean>(defaultValue);

    return (
        <ShowDebugInfoContext.Provider
            value={{
                value,
                setValue,
            }}
        >
            {children}
        </ShowDebugInfoContext.Provider>
    );
}
