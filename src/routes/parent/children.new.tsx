import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createChild } from "@/server/create-child";
import { useAuth } from "@/hooks/use-auth";
import { AvatarPicker } from "@/components/avatar-picker";
import { DEFAULT_COLOR_KEY, DEFAULT_ICON_KEY, serializeAvatar } from "@/lib/avatars";

export const Route = createFileRoute("/parent/children/new")({
  component: NewChild,
});

function NewChild() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [iconKey, setIconKey] = useState(DEFAULT_ICON_KEY);
  const [colorKey, setColorKey] = useState(DEFAULT_COLOR_KEY);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!session?.access_token) {
        throw new Error("לא מחובר");
      }
      await createChild({
        data: {
          email,
          password,
          displayName,
          birthdate,
          avatar: serializeAvatar(iconKey, colorKey),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      toast.success(`הילד ${displayName} נוסף בהצלחה`);
      navigate({ to: "/parent/children" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת ילד");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>הוספת ילד</CardTitle>
          <CardDescription>צרו חשבון לילד כדי שיוכל להתחבר ולבצע משימות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">שם הילד</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="יוסי"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>דמות</Label>
              <AvatarPicker
                iconKey={iconKey}
                colorKey={colorKey}
                onChange={(i, c) => {
                  setIconKey(i);
                  setColorKey(c);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">תאריך לידה</Label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                min="2000-01-01"
                max={new Date().toISOString().slice(0, 10)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">לפי הגיל נתאים את רמת החידונים</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל לילד</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="child@example.com"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה לילד</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  required
                  minLength={6}
                  dir="ltr"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">הילד ישתמש בפרטים אלה להתחברות</p>
            </div>
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "יוצר..." : "צור חשבון ילד"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
