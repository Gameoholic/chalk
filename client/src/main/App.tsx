import CanvasLoader from "../CanvasLoader.tsx";

interface AppProps {
    theme: "light" | "dark";
    setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}

export default function App({ theme, setTheme }: AppProps) {
    return <CanvasLoader theme={theme} setTheme={setTheme} />;
}
