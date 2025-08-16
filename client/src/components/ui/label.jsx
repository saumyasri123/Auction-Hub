import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

// simple cn helper
const cn = (...classes) => classes.filter(Boolean).join(" ")

const labelBase =
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelBase, className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
