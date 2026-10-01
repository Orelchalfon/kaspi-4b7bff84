import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/password-input";
import { PageHeader } from "@/components/page-header";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
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
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <PageHeader
        title="הוספת ילד"
        description="צרו חשבון לילד כדי שיוכל להתחבר ולבצע משימות"
        back={{ to: "/parent/children", label: "חזרה לילדים" }}
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">שם הילד</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="יוסי"
                required
                autoComplete="off"
                className="h-11"
              />
            </div>
            {/* The picker labels its own two radio groups ("בחרו דמות" / "צבע"). */}
            <AvatarPicker
              iconKey={iconKey}
              colorKey={colorKey}
              onChange={(i, c) => {
                setIconKey(i);
                setColorKey(c);
              }}
            />
            <div className="flex flex-col gap-2">
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
                aria-describedby="birthdate-hint"
                className="h-11"
              />
              <p id="birthdate-hint" className="text-xs text-muted-foreground">
                לפי הגיל נתאים את רמת החידונים
              </p>
            </div>
            <div className="flex flex-col gap-2">
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
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">סיסמה לילד</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="לפחות 6 תווים"
                minLength={6}
                describedBy="password-hint"
              />
              <p id="password-hint" className="text-xs text-muted-foreground">
                הילד ישתמש בפרטים אלה להתחברות
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" size="touch" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" aria-hidden />}
                {loading ? "יוצר..." : "צור חשבון ילד"}
              </Button>
              <Button asChild variant="ghost" size="touch" className="w-full">
                <Link to="/parent/children">ביטול</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
