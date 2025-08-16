import * as React from "react";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
      {children}
    </kbd>
  );
}
