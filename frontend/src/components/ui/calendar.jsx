import * as React from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { DayPicker } from "react-day-picker";

import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { es } from "date-fns/locale";
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      fixedWeeks
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit w-380px]",

        months:
          "flex flex-col sm:flex-row gap-4",

        month:
          "space-y-4",

        caption:
          "flex justify-between items-center px-2 pt-1 relative",

        caption_label:
          "text-sm font-medium",

        nav:
          "flex items-center gap-1",

        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),

        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),

        month_grid:
          "w-full border-collapse",

        weekdays:
          "flex",

        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",

        week:
          "flex w-full mt-2",

        day:
          cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),

        day_button:
          "h-9 w-9",

        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",

        today:
          "bg-accent text-accent-foreground",

        outside:
          "text-muted-foreground opacity-50",

        disabled:
          "text-muted-foreground opacity-50",

        hidden:
          "invisible",

        range_start:
          "range-start",

        range_end:
          "range-end",

        range_middle:
          "bg-accent text-accent-foreground",

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) =>
          orientation === "left" ? (
            <ChevronLeft
              className={cn("h-4 w-4", className)}
            />
          ) : (
            <ChevronRight
              className={cn("h-4 w-4", className)}
            />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };