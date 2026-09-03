import { useEffect, useState } from "react"

interface Props {
  preferred: "system" | "light" | "dark"
}

const STORAGE_KEY = "blog-theme"

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export default function ThemeToggle({ preferred }: Props) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    let initial = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null
    if (!initial) {
      initial = preferred === "dark"
        ? "dark"
        : preferred === "light"
          ? "light"
          : systemPrefersDark() ? "dark" : "light"
    }
    applyTheme(initial)
    setDark(initial === "dark")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const next = !dark ? "dark" : "light"
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    setDark(next === "dark")
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换到亮色" : "切换到暗色"}
      title={dark ? "切换到亮色" : "切换到暗色"}
      className="p-1.5 text-[15px] leading-none text-muted-foreground hover:text-foreground transition-colors"
    >
      {dark ? "☀" : "☾"}
    </button>
  )
}
