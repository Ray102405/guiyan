"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { ThemeMode } from "@/lib/types"

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark")

  useEffect(() => {
    const saved = localStorage.getItem("guiyan-theme") as ThemeMode | null
    if (saved === "light" || saved === "dark") {
      setThemeState(saved)
      applyThemeClass(saved)
    } else {
      applyThemeClass("dark")
    }
  }, [])

  function applyThemeClass(t: ThemeMode) {
    document.documentElement.classList.toggle("dark", t === "dark")
    document.documentElement.classList.toggle("light", t === "light")
  }

  const setTheme = (t: ThemeMode) => {
    setThemeState(t)
    localStorage.setItem("guiyan-theme", t)
    applyThemeClass(t)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
