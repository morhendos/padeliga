import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        teal:
          "bg-padeliga-teal text-white shadow-md hover:bg-padeliga-teal/90 transition-all duration-300",
        orange:
          "bg-padeliga-orange text-white shadow-md hover:bg-padeliga-orange/90 transition-all duration-300",
        purple:
          "bg-padeliga-purple text-white shadow-md hover:bg-padeliga-purple/90 transition-all duration-300",
        green:
          "bg-padeliga-green text-white shadow-md hover:bg-padeliga-green/90 transition-all duration-300",
        red:
          "bg-padeliga-red text-white shadow-md hover:bg-padeliga-red/90 transition-all duration-300",
        cta: 
          "bg-padeliga-orange text-white shadow-md hover:bg-padeliga-orange/90 transition-all duration-300 font-bold",
        golden:
          "bg-[#DAA520] hover:bg-[#FFD700] text-[#1A1F2C] shadow-sm transition-all duration-300",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent/10 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        xl: "h-12 px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }