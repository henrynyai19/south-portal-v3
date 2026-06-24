import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground shadow-[0_12px_35px_-18px_var(--primary)] backdrop-blur hover:bg-primary hover:shadow-[0_18px_45px_-20px_var(--primary)]",
        destructive: "bg-destructive/90 text-destructive-foreground shadow-sm backdrop-blur hover:bg-destructive",
        outline:
          "border border-white/40 bg-white/25 shadow-sm backdrop-blur-xl hover:bg-white/40 hover:text-accent-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        secondary: "border border-white/35 bg-secondary/70 text-secondary-foreground shadow-sm backdrop-blur-xl hover:bg-secondary/90 dark:border-white/10",
        ghost: "hover:bg-white/35 hover:text-accent-foreground dark:hover:bg-white/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
