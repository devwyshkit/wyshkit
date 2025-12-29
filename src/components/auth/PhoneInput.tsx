"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Phone input component for Indian phone numbers (+91)
 * Swiggy Dec 2025 pattern: Simple, clean phone input
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  autoFocus = false,
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Format phone number (allow +, digits, max 15 for E.164)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^\d+]/g, "").slice(0, 15);
    onChange(input);
  };

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-background transition-colors",
          error
            ? "border-destructive"
            : focused
            ? "border-primary ring-2 ring-primary/20"
            : "border-input",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {!value.startsWith("+") && (
          <span className="px-3 text-sm text-muted-foreground">+91</span>
        )}
        <Input
          ref={inputRef}
          type="tel"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder="Enter your phone number"
          disabled={disabled}
          className={cn(
            "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-3",
            !value.startsWith("+") ? "pl-0" : "pl-3"
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        We'll send you a verification code
      </p>
    </div>
  );
}




