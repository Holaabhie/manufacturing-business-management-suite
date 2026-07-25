"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[1000]",
        className
      )}
      style={{
        background: "var(--overlay-backdrop)",
        backdropFilter: "var(--overlay-backdrop-blur)",
        WebkitBackdropFilter: "var(--overlay-backdrop-blur)",
      }}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  fullScreen = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  fullScreen?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          fullScreen
            ? [
                "fixed inset-0 z-[1001] flex flex-col overflow-hidden",
                "p-0 outline-none",
                "data-[state=open]:animate-[sheetSlideUp_0.28s_ease] data-[state=closed]:animate-[sheetSlideDown_0.22s_ease_forwards]",
              ]
            : [
                /* ── Mobile: bottom sheet ── */
                "fixed bottom-0 left-1/2 z-[1001]",
                "w-full max-w-[480px]",
                "max-h-[88dvh] flex flex-col",
                "rounded-t-[32px] rounded-b-none",
                "p-0 outline-none",
                "data-[state=open]:animate-[sheetSlideUp_0.28s_ease] data-[state=closed]:animate-[sheetSlideDown_0.22s_ease_forwards]",
                /* ── Desktop md+: centered dialog ── */
                "md:top-1/2 md:bottom-auto",
                "md:max-h-[85dvh]",
                "md:rounded-[24px]",
                "md:data-[state=open]:animate-[dialogScaleIn_0.22s_ease] md:data-[state=closed]:animate-[dialogScaleOut_0.18s_ease_forwards]",
              ],
          className
        )}
        style={
          fullScreen
            ? {
                background: 'var(--overlay-sheet-bg)',
                color: 'var(--overlay-text-primary)',
              }
            : {
                transform: 'translateX(-50%)',
                background: 'var(--overlay-sheet-bg)',
                color: 'var(--overlay-text-primary)',
                border: '1px solid var(--overlay-border)',
                borderBottom: 'none',
                boxShadow: 'var(--overlay-shadow)',
              }
        }
        {...props}
      >
        {/* Drag handle — only for bottom sheet variant (hidden on md+) */}
        {!fullScreen && (
          <div className="flex justify-center pt-4 pb-2 md:hidden">
            <div
              style={{
                width: 48,
                height: 5,
                borderRadius: 999,
                background: 'var(--overlay-handle)',
              }}
            />
          </div>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
