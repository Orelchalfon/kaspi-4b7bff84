ns: לחזק את האבטחה בלי להחליף ספק auth — Supabase Auth כבר עושה bcrypt על סיסמאות ולא חושף אותן.

## רקע קצר (חשוב להבהיר)

לפני שצוללים — שתי נקודות לתיקון תפיסה:

1. **סיסמאות כבר מגובבות (hashed).** Supabase Auth (Lovable Cloud) שומר סיסמאות עם bcrypt בטבלה פנימית `auth.users.encrypted_password`. הקוד שלנו אף פעם לא נוגע בסיסמה הגולמית — `supabase.auth.signUp` שולח אותה דרך TLS לשרת והוא מבצע את ה-hash. אין צורך (וגם לא בריא) לעשות hash בצד הלקוח.
2. **Clerk לא נתמך טוב ב-Lovable preview** (`@clerk/tanstack-react-start/server` מפנה ל-localhost ושובר את ה-handshake). אנחנו נשארים עם Lovable Cloud Auth — זה הפתרון הסטנדרטי, מאובטח, ועובד מצוין.

לפי ההחלטה שלך, נתמקד ב-**חיזוקי אבטחה ותיקוני RLS + אימות מייל**.

## מה ייעשה

### 1. הפעלת אימות מייל (Email verification)
- כיבוי `auto-confirm` בהגדרות ה-auth — משתמש חדש לא יוכל להיכנס עד שילחץ על קישור במייל.
- הקפאת תהליך ההרשמה ב-`signup.tsx`: אחרי `signUp` נציג מסך "שלחנו לך מייל אימות" במקום להוביל ישר ל-dashboard.
- הוספת מסך/route `/auth/callback` שמטפל בקישור החזרה מהמייל ומפנה לפי תפקיד.
- הפעלת **HIBP (Have I Been Pwned)** — חוסם סיסמאות שדלפו בעבר.

> שים לב: יצירת **חשבון ילד** ע"י הורה תמשיך להיות auto-confirmed (אנחנו יוצרים אותם דרך service-role admin client) — להורה אין צורך לאמת מייל בשביל הילד שלו.

### 2. תיקוני RLS שחסרים בסכמה
תוספת policies לטבלאות שכרגע "נעולות" לחלוטין מבחינת כתיבה/עדכון, ולכן השרת לא יכול לעשות פעולות לגיטימיות בלי לעקוף RLS:

| טבלה | חוסר נוכחי | מה נוסיף |
|------|-----------|----------|
| `households` | אין UPDATE/DELETE policy | UPDATE לבעלי תפקיד parent באותו household בלבד |
| `child_profiles` | אין UPDATE policy | UPDATE לפרטי ילד (display_name) — parent בלבד |
| `tasks` | יש UPDATE רק להורים, אין DELETE | DELETE להורים בתוך ה-household |
| `transactions` | אין INSERT policy בכלל | משאירים סגור — רק RPC `approve_task` (SECURITY DEFINER) כותב, וזה הנכון |
| `user_roles` | אין UPDATE/DELETE | DELETE להורה (להסיר ילד מהמשפחה), בלי יכולת לשנות role של עצמך |

### 3. הקשחות נוספות
- **Storage `task-proofs`**: ודא שה-policies מאפשרות SELECT רק לחברי ה-household של המשימה (ולא לכל מאומת).
- **`approve_task` RPC**: כבר בודק parent + household — נוסיף בדיקה מפורשת שה-`proof_image_path` קיים לפני אישור (אסור לאשר משימה ללא הוכחה).
- **Session security**: על דפי login/signup נוודא `autocomplete` תקין (כבר קיים), ונוסיף `rel="noopener"` לקישורים חיצוניים אם יהיו.
- **Logging**: הסרת `console.error` שמדפיס מידע רגיש מ-`signup.tsx` ושאר נתיבי auth.
- **לוגיקת signup race**: כיום אם `signUp` מצליח אבל יצירת ה-household נכשלת, נשאר משתמש "יתום" ב-auth ללא role. נטפל ע"י ניסיון cleanup או העברת כל הזרימה ל-server function אטומי (`createServerFn`) שמשתמש ב-admin client ועושה rollback ב-try/catch.

### 4. מה **לא** נשנה ולמה
- **לא** מעבירים ל-Clerk (לא תואם ל-Lovable preview).
- **לא** עושים hash בצד הלקוח (סיסמאות כבר מגובבות בשרת — hash בלקוח רק שובר את אבטחת ה-bcrypt של Supabase).
- **לא** משנים את הסכמה הבסיסית של הטבלאות.

## פרטים טכניים

### קבצים שייערכו
- `src/routes/signup.tsx` — flow חדש: אחרי signup מציגים מסך "אמת את המייל". מעבר ל-server function אטומי ליצירת household+role.
- `src/server/signup-parent.ts` (חדש) — `createServerFn` שמבצע signup + יצירת household + role בעסקה אחת עם rollback.
- `src/routes/auth.callback.tsx` (חדש) — מטפל ב-`?type=signup` מהמייל ומפנה לפי תפקיד.
- `src/routes/login.tsx` — הודעת שגיאה ייעודית כש-`email_not_confirmed`.

### מיגרציית SQL (תקציר)
```sql
-- households
CREATE POLICY "Parents can update own household" ON households FOR UPDATE
  USING (id = get_user_household_id(auth.uid()) AND has_role(auth.uid(),'parent'));

-- child_profiles  
CREATE POLICY "Parents can update children" ON child_profiles FOR UPDATE
  USING (household_id = get_user_household_id(auth.uid()) AND has_role(auth.uid(),'parent'));

-- tasks: add DELETE for parents
CREATE POLICY "Parents can delete tasks" ON tasks FOR DELETE
  USING (household_id = get_user_household_id(auth.uid()) AND has_role(auth.uid(),'parent'));

-- user_roles: parents can remove children (not themselves)
CREATE POLICY "Parents can remove children" ON user_roles FOR DELETE
  USING (
    household_id = get_user_household_id(auth.uid())
    AND has_role(auth.uid(),'parent')
    AND user_id != auth.uid()
    AND role = 'child'
  );

-- approve_task: enforce proof_image_path required
-- (תוספת בתוך ה-RPC הקיים)
```

### הגדרות Auth
- כיבוי auto-confirm.
- הפעלת HIBP password protection.
- הגדרת site URL ו-redirect URLs לכלול את `/auth/callback`.

## בדיקות אחרי
1. הרשמת הורה חדש → מקבל מייל → לא יכול להתחבר עד שמאמת → אחרי קליק במייל מועבר ל-dashboard.
2. ניסיון להירשם עם סיסמה דלופה (`Password123!`) → נחסם ע"י HIBP.
3. ילד מנסה להגיש משימה ללא תמונה → נדחה.
4. הורה מנסה לעדכן household של משפחה אחרת → נדחה ע"י RLS.
5. סריקת אבטחה (security scan) — אפס error-level findings.
