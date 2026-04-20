import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "bottom";
  width?: string;
}

export function FinanceDrawer({ open, onOpenChange, title, description, children, side = "right", width = "sm:max-w-xl" }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={`${width} overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
