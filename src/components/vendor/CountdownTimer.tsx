"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  deadline: Date | string;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({ deadline, onExpire, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const targetDate = typeof deadline === "string" ? new Date(deadline) : deadline;
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft <= 60; // Last minute
  const isCritical = timeLeft <= 30; // Last 30 seconds

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold tabular-nums",
        isCritical 
          ? "bg-red-100 text-red-700 animate-pulse" 
          : isUrgent 
            ? "bg-orange-100 text-orange-700"
            : "bg-yellow-100 text-yellow-700",
        className
      )}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-ping opacity-75" />
      <span>
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
