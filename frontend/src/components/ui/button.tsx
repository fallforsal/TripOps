import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn/ui source component: https://ui.shadcn.com/docs/components/button
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
  { variants: { variant: {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-muted',
  } }, defaultVariants: { variant: 'default' } },
)
type Props = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
function Button({ className, variant, asChild = false, ...props }: Props) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />
}
export { Button }
