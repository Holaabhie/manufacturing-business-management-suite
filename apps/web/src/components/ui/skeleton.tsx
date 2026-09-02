import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent animate-pulse [animation-duration:1.8s] [animation-timing-function:cubic-bezier(0.16,1,0.3,1)] rounded-md",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
