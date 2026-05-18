# 🌿 تطبيق التعافي الذكي (Ta3afi AI Recovery Assistant)

<div align="center">
  <img src="public/images/bot-avatar.png" alt="Ta3afi AI Logo" width="120" height="120" />
  <h3>مساعدك الشخصي الذكي للتعافي والدعم النفسي</h3>
  <p>مدعوم بالذكاء الاصطناعي ومصمم بخصوصية تامة وتشفير كامل</p>
</div>

---

## ✨ المميزات الرئيسية (Key Features)

- 🎭 **شخصيتان ذكيتان للدعم (Dual AI Personas):**
  - 🩺 **دكتور التعافي:** يقدم استشارات علمية، طبية، وخطوات عملية مدروسة للتعافي.
  - 🤝 **رفيق التعافي:** يقدم دعماً نفسياً، تشجيعاً، وأخوة صادقة كصديق مقرب في رحلتك.
- 🔒 **خصوصية وتشفير تام (Zero-Knowledge Privacy):**
  - يتم تشفير كافة المحادثات محلياً داخل متصفحك باستخدام خوارزميات **AES-256-GCM** القوية.
  - كلمات المرور يتم تشفيرها محلياً عبر **SHA-256** ولا يتم إرسالها كنص صريح أبداً.
- ☁️ **مزامنة سحابية لامركزية (Cloudflare Edge Sync):**
  - تخزين سحابي آمن وسريع للغاية مدعوم بقواعد بيانات **Cloudflare KV**.
  - إمكانية الوصول لمحادثاتك من أي جهاز وفي أي وقت بمجرد تسجيل الدخول.
- 🎨 **واجهة مستخدم عصرية ومريحة (Premium UI/UX):**
  - تصميم زجاجي أنيق (Glassmorphism) مع دعم كامل للوضع الليلي والنهاري (Dark/Light Mode).
  - إمكانية تخصيص حجم الخط ليتناسب مع القراءة المريحة.
  - تطبيق صفحة واحدة سريع جداً (SPA) متوافق مع كافة الشاشات والجوالات.
- 🛠️ **لوحة تحكم إدارية محمية (Admin Dashboard):**
  - مسار إداري مخصص (`/admin`) محمي برمز مرور لتعديل مفاتيح الـ API ونماذج الذكاء الاصطناعي (AI Models) لجميع المستخدمين بضغطة زر.

---

## 🚀 التقنيات المستخدمة (Tech Stack)

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS / Custom Rich CSS.
- **Backend & Storage:** Cloudflare Pages Functions (`/api/kv`), Cloudflare KV Database.
- **AI Integration:** Google Gemini (2.5 Flash / Pro) API.
- **Security:** Web Crypto API (AES-GCM, SHA-256).

---

## 📦 التثبيت والتشغيل المحلي (Local Development)

1. **تثبيت الحزم (Install Dependencies):**
   ```bash
   npm install
   ```

2. **تشغيل خادم التطوير (Run Dev Server):**
   ```bash
   npm run dev
   ```

3. **بناء المشروع للإنتاج (Build for Production):**
   ```bash
   npm run build
   ```

---

## 🛡️ الأمان والسرية (Security & Confidentiality)
تم بناء هذا المشروع مع وضع سرية المستخدم في المقام الأول. لا يمكن لأي شخص (حتى مديري الخوادم) قراءة محتوى المحادثات نظراً لتشفيرها بكلمة مرور المستخدم الخاصة قبل إرسالها إلى السحابة.

---
<div align="center">
  <p>صُنع بحب من أجل دعم كل من يسعى لحياة أفضل وأكثر نقاءً 🤍</p>
</div>
