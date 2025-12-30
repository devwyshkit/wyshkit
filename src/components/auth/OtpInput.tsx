"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (otp: string) => void;
  onResend: () => void;
  error?: string;
  disabled?: boolean;
  resendCooldown?: number; // seconds
}

/**
 * OTP input component (6 digits)
 * Swiggy Dec 2025 pattern: SMS autofill, manual submit, resend with cooldown
 * No auto-submit - user must click verify button (removes anti-pattern)
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  onResend,
  error,
  disabled = false,
  resendCooldown = 60,
}: OtpInputProps) {
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(input);
  };

  const handleResend = () => {
    if (cooldown === 0) {
      setCooldown(resendCooldown);
      onResend();
    }
  };

  // SMS autofill is handled by browser via autocomplete="one-time-code"
  // User must click "Verify & Sign In" button to submit (no auto-submit anti-pattern)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="Enter 6-digit code"
          disabled={disabled}
          maxLength={6}
          autoComplete="one-time-code"
          className={cn(
            "text-center text-2xl tracking-widest font-semibold h-14",
            error && "border-destructive"
          )}
          autoFocus
        />
        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">Didn't receive the code?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={cooldown > 0 || disabled}
          className="h-auto p-0 text-primary font-medium"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
        </Button>
      </div>
    </div>
  );
}




