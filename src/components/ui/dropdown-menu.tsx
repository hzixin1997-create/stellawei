import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void } | null>(null)

const useDropdownMenu = () => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error("useDropdownMenu must be used within DropdownMenu")
  return context
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ asChild, children, ...props }, ref) => {
    const { open, setOpen } = useDropdownMenu()
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: () => setOpen(!open),
      } as any)
    }
    
    return (
      <button
        ref={ref}
        {...props}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }>(
  ({ className, align = "center", ...props }, ref) => {
    const { open } = useDropdownMenu()
    
    if (!open) return null
    
    const alignClass = {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    }[align]
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md mt-1",
          alignClass,
          className
        )}
        {...props}
      />
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}