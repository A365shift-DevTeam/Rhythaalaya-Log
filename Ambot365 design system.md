# 🎨 Ambot365

> This document outlines the core design tokens and visual language for the project. Use these guidelines to ensure consistency across the application.

## 1. Colors

The color system is defined by scales from 50 (lightest) to 950 (darkest), alongside semantic colors for specific intents.

### Primary

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f4fbf7` | `--color-primary-50` |
| 100 | `#e9f7ee` | `--color-primary-100` |
| 200 | `#cbecd8` | `--color-primary-200` |
| 300 | `#b3e6c7` | `--color-primary-300` |
| 400 | `#6bd194` | `--color-primary-400` |
| 500 | `#3fc073` | `--color-primary-500` |
| 600 | `#35a160` | `--color-primary-600` |
| 700 | `#2b824e` | `--color-primary-700` |
| 800 | `#21643c` | `--color-primary-800` |
| 900 | `#1d492f` | `--color-primary-900` |
| 950 | `#132f1e` | `--color-primary-950` |

### Secondary

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f6f9f5` | `--color-secondary-50` |
| 100 | `#edf4eb` | `--color-secondary-100` |
| 200 | `#d4e5d1` | `--color-secondary-200` |
| 300 | `#b4d5af` | `--color-secondary-300` |
| 400 | `#88be7e` | `--color-secondary-400` |
| 500 | `#65a859` | `--color-secondary-500` |
| 600 | `#548d4a` | `--color-secondary-600` |
| 700 | `#44723c` | `--color-secondary-700` |
| 800 | `#34572e` | `--color-secondary-800` |
| 900 | `#2a4125` | `--color-secondary-900` |
| 950 | `#1b2a18` | `--color-secondary-950` |

### Accent

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#f3f9fb` | `--color-accent-50` |
| 100 | `#e8f3f8` | `--color-accent-100` |
| 200 | `#c9e3ee` | `--color-accent-200` |
| 300 | `#9fd1e5` | `--color-accent-300` |
| 400 | `#64b7d8` | `--color-accent-400` |
| 500 | `#379fc8` | `--color-accent-500` |
| 600 | `#308baf` | `--color-accent-600` |
| 700 | `#256c88` | `--color-accent-700` |
| 800 | `#1d5368` | `--color-accent-800` |
| 900 | `#1a3e4c` | `--color-accent-900` |
| 950 | `#112831` | `--color-accent-950` |

### Neutral

| Shade | Hex | Token Variable |
|-------|-----|----------------|
| 50 | `#ffffff` | `--color-neutral-50` |
| 100 | `#f0f0f0` | `--color-neutral-100` |
| 200 | `#dbdbdb` | `--color-neutral-200` |
| 300 | `#c2c2c2` | `--color-neutral-300` |
| 400 | `#9e9e9e` | `--color-neutral-400` |
| 500 | `#808080` | `--color-neutral-500` |
| 600 | `#6b6b6b` | `--color-neutral-600` |
| 700 | `#575757` | `--color-neutral-700` |
| 800 | `#424242` | `--color-neutral-800` |
| 900 | `#333333` | `--color-neutral-900` |
| 950 | `#212121` | `--color-neutral-950` |

### Semantic Intents

| Intent | Hex | Token Variable |
|--------|-----|----------------|
| Success | `#22c55e` | `--color-success` |
| Warning | `#f59e0b` | `--color-warning` |
| Error   | `#ef4444` | `--color-error` |

## 2. Typography

### Font Families

- **Sans (Body):** `Poppins, ui-sans-serif, system-ui, sans-serif`
- **Display (Headings):** `Poppins`
- **Mono (Code):** `ui-monospace`

### Font Sizes

| Scale | Value | Token Variable |
|-------|-------|----------------|
| xs | `0.563rem` | `--font-size-xs` |
| sm | `0.688rem` | `--font-size-sm` |
| base | `0.906rem` | `--font-size-base` |
| lg | `1rem` | `--font-size-lg` |
| xl | `1.25rem` | `--font-size-xl` |
| 2xl | `1.5rem` | `--font-size-2xl` |
| 3xl | `2.25rem` | `--font-size-3xl` |
| 4xl | `3.75rem` | `--font-size-4xl` |

### Font Weights

| Name | Weight | Token Variable |
|------|--------|----------------|
| light | `300` | `--font-weight-light` |
| normal | `400` | `--font-weight-normal` |
| medium | `500` | `--font-weight-medium` |
| semibold | `600` | `--font-weight-semibold` |
| bold | `700` | `--font-weight-bold` |
| black | `900` | `--font-weight-black` |

## 3. Spacing & Sizing

| Scale | Value | Token Variable |
|-------|-------|----------------|
| 0 | `0` | `--spacing-0` |
| 1 | `0.125rem` | `--spacing-1` |
| 2 | `0.375rem` | `--spacing-2` |
| 3 | `0.625rem` | `--spacing-3` |
| 4 | `1rem` | `--spacing-4` |
| 5 | `1.25rem` | `--spacing-5` |
| 6 | `1.5rem` | `--spacing-6` |
| 8 | `2rem` | `--spacing-8` |

## 4. Borders & Shadows

### Border Radius

| Name | Value | Token Variable |
|------|-------|----------------|
| none | `0` | `--radius-none` |
| sm | `0.5rem` | `--radius-sm` |
| md | `0.75rem` | `--radius-md` |
| lg | `1rem` | `--radius-lg` |
| xl | `1.5rem` | `--radius-xl` |
| 2xl | `1rem` | `--radius-2xl` |
| full | `9999px` | `--radius-full` |

### Shadows

| Name | Value | Token Variable |
|------|-------|----------------|
| sm | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px` | `--shadow-sm` |
| md | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px` | `--shadow-md` |
| lg | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.636901 -0.0702946 -0.0302529 / 0.25) 0px 10px 15px -3px, oklab(0.636901 -0.0702946 -0.0302529 / 0.25) 0px 4px 6px -4px` | `--shadow-lg` |
| xl | `rgba(255, 255, 255, 0.9) 0px 1px 0px 0px inset` | `--shadow-xl` |
