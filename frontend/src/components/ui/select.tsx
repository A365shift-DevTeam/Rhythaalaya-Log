import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { JisIcon } from "@/components/JisIcon"

const triggerClasses =
  "flex w-full min-h-11 items-center justify-between gap-2 px-3.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white outline-none transition-colors focus:border-[#3fc073] focus-visible:border-[#3fc073] data-[state=open]:border-[#3fc073] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[#808080] dark:data-[placeholder]:text-[#94a3b8] [&>span]:line-clamp-1 [&>span]:text-left"

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(triggerClasses, className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <JisIcon className="text-[18px] text-current opacity-60 shrink-0">expand_more</JisIcon>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-[90] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0f1a28] text-[#212121] dark:text-white shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 w-[var(--radix-select-trigger-width)]",
          className
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-[#808080]">
          <JisIcon className="text-[16px]">expand_less</JisIcon>
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-[#808080]">
          <JisIcon className="text-[16px]">expand_more</JisIcon>
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-bold text-[#808080] dark:text-[#94a3b8]", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold outline-none",
        "focus:bg-[#f0f0f0] dark:focus:bg-[#1a2a3d] data-[state=checked]:text-[#35a160] dark:data-[state=checked]:text-[#6bd194]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2.5 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <JisIcon className="text-[16px]">check</JisIcon>
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("my-1 h-px bg-[#dbdbdb] dark:bg-[#243244]", className)}
      {...props}
    />
  )
}

export interface SimpleSelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface SimpleSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SimpleSelectOption[]
  id?: string
  name?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * Drop-in replacement for a native `<select>` populated from an options array.
 * Keeps the same `value` / `onValueChange` contract the migrated call sites use.
 */
function SimpleSelect({
  value,
  onValueChange,
  options,
  id,
  name,
  placeholder,
  required,
  disabled,
  className,
  ...props
}: SimpleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} required={required} disabled={disabled} name={name}>
      <SelectTrigger id={id} className={className} aria-label={props["aria-label"]}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SimpleSelect,
}
