import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
    const [count, setCount] = useState(0)

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#242424] font-sans text-white antialiased dark:bg-white dark:text-[#213547]">
            <div className="mb-8 flex items-center space-x-6">
                <a
                    href="https://vite.dev"
                    target="_blank"
                    className="transition-filter duration-300 will-change-[filter] hover:drop-shadow-[0_0_2em_#646cffaa] hover:filter"
                >
                    <img src={viteLogo} className="h-24 p-6" alt="Vite logo" />
                </a>
                <a
                    href="https://react.dev"
                    target="_blank"
                    className="transition-filter motion-safe:animate-spin-slow duration-300 will-change-[filter] hover:drop-shadow-[0_0_2em_#61dafbaa] hover:filter"
                >
                    <img
                        src={reactLogo}
                        className="h-24 p-6"
                        alt="React logo"
                    />
                </a>
            </div>

            <h1 className="mb-8 text-[5.2em] leading-[1.1]">Vite + React</h1>

            <div className="space-y-4 rounded-lg bg-[#1a1a1a] p-8 text-center dark:bg-[#f9f9f9]">
                <button
                    onClick={() => setCount((count) => count + 1)}
                    className="focus:outline-auto rounded-lg border border-transparent bg-[#1a1a1a] px-6 py-2 text-lg font-medium hover:border-[#646cff] focus:outline-4 dark:bg-[#f9f9f9]"
                >
                    count is {count}
                </button>
                <p>
                    Edit <code className="font-mono">src/App.jsx</code> and save
                    to test HMR
                </p>
            </div>

            <p className="mt-8 text-gray-400">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    )
}

export default App
