import * as React from "react"
import { Toaster as SonnerToaster } from "sonner"

/**
 * App toaster. Mounted once near the root of the tree. Tracks the `.dark`
 * class on <html> (the app's dark-mode signal) rather than prefers-color-scheme.
 */
export function Toaster() {
  const [theme, setTheme] = React.useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  )

  React.useEffect(() => {
    const root = document.documentElement
    const sync = () =>
      setTheme(root.classList.contains("dark") ? "dark" : "light")
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <SonnerToaster
      theme={theme}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !font-sans !text-sm !font-semibold !shadow-2xl",
        },
      }}
    />
  )
}
