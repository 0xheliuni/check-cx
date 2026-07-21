"use client"

import * as React from "react"
import {Laptop, Moon, Sun} from "lucide-react"
import {useTheme} from "next-themes"
import {Button} from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="h-6 w-6 border-foreground/40 bg-background/60 sm:h-7 sm:w-7">
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
      }}
      className="nier-invert-hover h-6 w-6 border-foreground/40 bg-background/60 sm:h-7 sm:w-7"
    >
      <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {theme === 'system' && (
        <Laptop className="absolute h-2 w-2 translate-y-1.5 translate-x-1.5 opacity-50" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
