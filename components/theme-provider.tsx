"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "system",
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null
    const systemTheme = enableSystem ? getSystemTheme() : null
    const initialTheme = storedTheme || systemTheme || defaultTheme

    setTheme(initialTheme)
  }, [defaultTheme, enableSystem])

  useEffect(() => {
    if (attribute === "class") {
      document.documentElement.classList.remove("light", "dark")
      if (theme === "system") {
        const systemTheme = getSystemTheme()
        document.documentElement.classList.add(systemTheme)
      } else if (theme) {
        document.documentElement.classList.add(theme)
      }
    } else {
      document.documentElement.setAttribute(attribute, theme)
    }
    if (theme !== "system") {
      localStorage.setItem("theme", theme)
    }
  }, [theme, attribute])

  const getSystemTheme = (): Theme => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
