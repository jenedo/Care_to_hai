import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let variantClass = "bg-gray-100 text-gray-800";
  
  if (["verified", "completed", "active", "resolved", "confirmed", "success"].includes(normalized)) {
    variantClass = "bg-emerald-100 text-emerald-800";
  } else if (["pending", "in progress", "warning"].includes(normalized)) {
    variantClass = "bg-amber-100 text-amber-800";
  } else if (["suspended", "cancelled", "failed", "no-show", "high", "locked"].includes(normalized)) {
    variantClass = "bg-red-100 text-red-800";
  } else if (["disputed", "escalated"].includes(normalized)) {
    variantClass = "bg-orange-100 text-orange-800";
  } else if (["open"].includes(normalized)) {
    variantClass = "bg-blue-100 text-blue-800";
  }

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", variantClass, className)}>
      {status}
    </span>
  );
}
