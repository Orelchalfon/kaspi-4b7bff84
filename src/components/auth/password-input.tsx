import { useState, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  minLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}

/** Password field with a 44px show/hide toggle. Value lives only in React state. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
  invalid,
  describedBy,
  minLength,
  inputRef,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={minLength}
        dir="ltr"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-11 pe-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
        aria-pressed={visible}
        className="absolute end-0 top-0 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
