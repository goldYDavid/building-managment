# ועד בית דיגיטלי (PWA)

אפליקציה קלה לניהול בניין לוועד בית, מותאמת להרצה ב-**GitHub Pages** ולשדרוג עתידי להפצה ב-**Google Play** (באמצעות Trusted Web Activity).

## מה יש באפליקציה כרגע

- ניהול דיירים (שם, דירה, טלפון)
- ניהול חיובי ועד (סכום, תאריך יעד, סימון כשולם)
- פתיחת/סגירת קריאות שירות לפי עדיפות
- פרסום הודעות ועד
- KPI מרכזיים: מספר דיירים, קריאות פתוחות, חוב פתוח, כמות הודעות
- שמירת נתונים מקומית ב-`localStorage`
- תמיכה ב-PWA (Manifest + Service Worker + Install prompt)

## פלואו עבודה לוועד בית

1. **קליטת דיירים**
   - מוסיפים כל דייר + מספר דירה.
2. **פתיחת מחזור גבייה חודשי**
   - יוצרים חיובים לכל הדירות ומנטרים חוב פתוח.
3. **טיפול בתקלות**
   - פותחים קריאות עם עדיפות ומסמנים סגירה בסיום.
4. **תקשורת עם הדיירים**
   - מפרסמים הודעות ועדכונים שוטפים.
5. **מעקב ניהולי**
   - ניהול לפי KPI על המסך הראשי.

## הרצה מקומית

```bash
python -m http.server 8080
# ואז לפתוח http://localhost:8080
```

## פריסה ל-GitHub Pages

הקובץ `.github/workflows/deploy-pages.yml` מגדיר פריסה אוטומטית כאשר עושים push לענף `main`, וכולל `enablement: true` כדי להפעיל Pages גם בריצה הראשונה.

שלבים ב-GitHub:
1. נכנסים ל-**Settings → Pages**
2. בוחרים **Build and deployment: GitHub Actions**
3. עושים push לענף `main`
4. האתר יעלה אוטומטית.

אם מתקבלת שגיאת `Get Pages site failed`, בדקו שהריפו ציבורי או שיש הרשאות מתאימות, ואז הריצו שוב את ה-workflow (הקובץ כבר כולל הפעלה אוטומטית של Pages).

## הכנה ל-Google Play (שלב הבא)

האפליקציה כבר בנויה כ-PWA. כדי לפרסם ב-Google Play עם מעטפת Android:

1. ודאו שהאתר חי ב-HTTPS (GitHub Pages כן).
2. החליפו את אייקוני ה-SVG לאייקוני PNG סופיים לחנות (192/512 + maskable).
3. התקינו Bubblewrap:
   ```bash
   npm i -g @bubblewrap/cli
   ```
4. צרו פרויקט Android:
   ```bash
   bubblewrap init --manifest https://<username>.github.io/<repo>/manifest.webmanifest
   bubblewrap build
   ```
5. חתמו קובץ AAB והגישו ל-Play Console.


## התאמה ל-PR ללא קבצים בינאריים

כדי למנוע שגיאות כמו `Binary files are not supported` בתהליכי PR מסוימים, האייקונים בפרויקט נשמרים בפורמט SVG (טקסטואלי) ולא כקבצי PNG בינאריים.

> לפני העלאה ל-Google Play מומלץ להפיק מה-SVG אייקוני PNG סופיים לפי דרישות החנות.

## הערות ארכיטקטורה (לשלב מתקדם)

כדי לעבור ממוצר MVP למוצר ייצור:
- Backend (לדוגמה Firebase/Supabase) עם הרשאות משתמשים
- Role-based access (ועד, דייר, ספק)
- סליקה מאובטחת (לא לשמור פרטי אשראי באפליקציה)
- ניטור, לוגים וגיבוי נתונים
- i18n מלא (עברית/אנגלית/רוסית)

## מקורות למחקר שבוצע

- Vite docs – Static deploy (GitHub Pages workflow): https://vite.dev/guide/static-deploy.html
- Chrome Developers – Trusted Web Activity Quick Start (Bubblewrap): https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
