"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────────
   Sheet — Mobile-friendly sliding panel
   Uses framer-motion for reliable slide animations on all devices.
   Replaces the tw-animate-css approach which breaks on mobile due to
   @property --tw-animation-fill-mode: none (inherits: false).
   ───────────────────────────────────────────────────────────────────────────── */

// ── Slide animation variants per side ──
const slideVariants = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  top: {
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
}

// ── Position classes per side ──
const positionClasses: Record<string, string> = {
  right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b",
  bottom: "inset-x-0 bottom-0 h-auto border-t",
}

// ── Root: manages open state ──
interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  return <>{children}</>
}

// ── Trigger: opens the sheet ──
function SheetTrigger({
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  return <button onClick={onClick} {...props} />
}

// ── Close: closes the sheet (used inside content) ──
function SheetClose({
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  return <button onClick={onClick} {...props} />
}

// ── Overlay: dark backdrop ──
function SheetOverlay({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      aria-hidden="true"
    />
  )
}

// ── Content: sliding panel ──
interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactNode
}

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  // Access the Sheet context (open/onOpenChange) via React context
  // Since we use a simple prop-drilling approach, we need to get them from the parent
  // The parent (dashboard-header, header) passes them directly
  const variants = slideVariants[side]

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "bg-background fixed z-50 flex flex-col shadow-lg",
        positionClasses[side],
        className
      )}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── Static layout helpers (no animation) ──
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// ── AnimatedSheet: The full animated wrapper ──
// This is the component that consumers should use instead of <Sheet open={...}>
// It provides the AnimatePresence + overlay + close-on-esc + body scroll lock
interface AnimatedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactNode
  className?: string
  /** Show the built-in close (X) button — default true */
  showCloseButton?: boolean
}

function AnimatedSheet({
  open,
  onOpenChange,
  side = "right",
  children,
  className,
  showCloseButton = true,
}: AnimatedSheetProps) {
  // Close handler
  const handleClose = React.useCallback(() => onOpenChange(false), [onOpenChange])

  // ESC key
  React.useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [open, handleClose])

  // Body scroll lock
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const variants = slideVariants[side]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="sheet-panel"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: "tween", duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "bg-background fixed z-50 flex flex-col shadow-lg",
              positionClasses[side],
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {children}

            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                aria-label="Fermer"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  AnimatedSheet,
}
