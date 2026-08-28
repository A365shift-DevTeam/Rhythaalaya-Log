import * as React from "react"

import { cn } from "@/lib/utils"
import { JisIcon } from "@/components/JisIcon"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">

/**
 * Password field with a show/hide toggle. Spreads every other input prop
 * (name, value, onChange, required, minLength, placeholder, id, autoComplete…)
 * so it drops in wherever a bare `<input type="password">` was used.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#9e9e9e] transition-colors hover:bg-[#f0f0f0] hover:text-[#3fc073] dark:hover:bg-[#172435] dark:hover:text-[#b3e6c7]"
      >
        <JisIcon className="text-[18px]">{visible ? "visibility_off" : "visibility"}</JisIcon>
      </button>
    </div>
  )
}
