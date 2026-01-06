import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-foreground/20 transition-[height,background-color] duration-200 group-hover:h-1.5 group-hover:bg-foreground/25">
      <SliderPrimitive.Range className="absolute h-full bg-foreground/60 group-hover:bg-foreground/80" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-foreground ring-offset-background transition-[opacity,transform,box-shadow] duration-200 opacity-0 group-hover:opacity-100 hover:scale-125 hover:shadow-[0_0_12px_rgba(255,255,255,0.6)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-110 active:shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
