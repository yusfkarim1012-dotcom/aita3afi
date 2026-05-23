import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage, type Message } from "./api";
import { useAppStore } from "./store";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BotAvatar from "./BotAvatar";
import {
  Send,
  Plus,
  Menu,
  X,
  Trash2,
  Sun,
  Moon,
  ChevronDown,
  MessageSquare,
  AArrowUp,
  AArrowDown,
  Sparkles,
  Cloud,
  ArrowLeft,
  Clock3,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";

function encodeVal(val: string): string {
  try {
    return btoa(unescape(encodeURIComponent(val)));
  } catch {
    return val;
  }
}

function decodeVal(val: string): string {
  try {
    return decodeURIComponent(escape(atob(val)));
  } catch {
    return val;
  }
}

const SUGGESTIONS = [
  { text: "كيف أبدأ رحلة التعافي؟", emoji: "🌱", sub: "خطوات عملية للبداية" },
  { text: "أحس بضعف وش أسوي؟", emoji: "💪", sub: "دعم نفسي فوري" },
  { text: "كيف أبتعد عن المثيرات؟", emoji: "🛡️", sub: "استراتيجيات الحماية" },
  { text: "أبي نصيحة تحفزني", emoji: "⭐", sub: "تحفيز وتشجيع" },
];

export default function App() {
  const {
    conversations, activeConversation, activeConvId, theme, fontSize,
    sidebarOpen, setTheme, setFontSize, setSidebarOpen, addMessage,
    newConversation, selectConversation, deleteConversation, switchPersona,
    currentUser, lastSynced, authLoading, login, signup, logout
  } = useAppStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScroll, setShowScroll] = useState(false);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Routing State for /admin
  const [currentPage, setCurrentPage] = useState<"chat" | "admin">("chat");

  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname.replace(/\/$/, ""); // Strip trailing slash
      if (path === "/admin") {
        setCurrentPage("admin");
      } else {
        setCurrentPage("chat");
      }
    };
    
    handleRouting();
    window.addEventListener("popstate", handleRouting);
    return () => window.removeEventListener("popstate", handleRouting);
  }, []);

  // User Authentication States
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [userAuthError, setUserAuthError] = useState("");
  const [userAuthSuccess, setUserAuthSuccess] = useState("");

  // Admin Panel States
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [adminDrKeys, setAdminDrKeys] = useState<string[]>(() => Array(10).fill(""));
  const [adminRafiqKeys, setAdminRafiqKeys] = useState<string[]>(() => Array(10).fill(""));
  const [adminDrModel, setAdminDrModel] = useState("");
  const [adminRafiqModel, setAdminRafiqModel] = useState("");
  const [adminPuterModel, setAdminPuterModel] = useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserAuthError("");
    setUserAuthSuccess("");

    if (!authUsername.trim() || !authPassword.trim()) {
      setUserAuthError("يرجى ملء جميع الحقول!");
      return;
    }

    if (authTab === "login") {
      const res = await login(authUsername, authPassword);
      if (res.success) {
        setUserAuthSuccess("تم تسجيل الدخول بنجاح! جاري مزامنة بياناتك...");
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setAuthUsername("");
          setAuthPassword("");
          setUserAuthSuccess("");
        }, 1500);
      } else {
        setUserAuthError(res.error || "خطأ في تسجيل الدخول!");
      }
    } else {
      const res = await signup(authUsername, authPassword);
      if (res.success) {
        setUserAuthSuccess("تم إنشاء حسابك وتفعيله بنجاح! جاري مزامنة بياناتك...");
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setAuthUsername("");
          setAuthPassword("");
          setUserAuthSuccess("");
        }, 1500);
      } else {
        setUserAuthError(res.error || "خطأ في إنشاء الحساب!");
      }
    }
  };



  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "12345678rk") {
      setIsAdminAuthorized(true);
      setAdminError("");
      
      const drSaved = localStorage.getItem("admin_doctor_api_keys");
      const rafiqSaved = localStorage.getItem("admin_rafiq_api_keys");
      
      let drKeysList: string[] = Array(10).fill("");
      let rafiqKeysList: string[] = Array(10).fill("");
      
      try {
        if (drSaved) {
          const parsed = JSON.parse(drSaved);
          if (Array.isArray(parsed)) {
            drKeysList = [...parsed, ...Array(10).fill("")].slice(0, 10);
          }
        } else {
          // fallback to single key
          const single = localStorage.getItem("admin_doctor_api_key") || "sk-hLwMhHmK84UppzziebKMn5";
          drKeysList = [single, ...Array(9).fill("")];
        }
      } catch {}

      try {
        if (rafiqSaved) {
          const parsed = JSON.parse(rafiqSaved);
          if (Array.isArray(parsed)) {
            rafiqKeysList = [...parsed, ...Array(10).fill("")].slice(0, 10);
          }
        } else {
          // fallback to single key
          const single = localStorage.getItem("admin_rafiq_api_key") || "sk-VUgfFKWUMeimyDihMFBJVj";
          rafiqKeysList = [single, ...Array(9).fill("")];
        }
      } catch {}
      
      setAdminDrKeys(drKeysList);
      setAdminRafiqKeys(rafiqKeysList);
      
      const drModel = localStorage.getItem("admin_doctor_model") || "gemini-2.5-flash";
      const rafiqModel = localStorage.getItem("admin_rafiq_model") || "gemini-2.5-flash";
      const puterModel = localStorage.getItem("admin_puter_model") || "gemini-3-flash-preview";
      
      setAdminDrModel(drModel);
      setAdminRafiqModel(rafiqModel);
      setAdminPuterModel(puterModel);
    } else {
      setAdminError("رمز المرور غير صحيح! حاول مرة أخرى.");
    }
  };

  const handleSaveAdminSettings = async () => {
    const cleanedDrKeys = adminDrKeys.map(k => k.trim()).filter(k => k !== "");
    const cleanedRafiqKeys = adminRafiqKeys.map(k => k.trim()).filter(k => k !== "");

    if (cleanedDrKeys.length === 0) cleanedDrKeys.push("");
    if (cleanedRafiqKeys.length === 0) cleanedRafiqKeys.push("");

    localStorage.setItem("admin_doctor_api_keys", JSON.stringify(cleanedDrKeys));
    localStorage.setItem("admin_rafiq_api_keys", JSON.stringify(cleanedRafiqKeys));
    localStorage.setItem("admin_doctor_api_key", cleanedDrKeys[0] || "");
    localStorage.setItem("admin_rafiq_api_key", cleanedRafiqKeys[0] || "");
    localStorage.setItem("admin_doctor_model", adminDrModel.trim());
    localStorage.setItem("admin_rafiq_model", adminRafiqModel.trim());
    localStorage.setItem("admin_puter_model", adminPuterModel.trim());
    
    alert("تم حفظ الإعدادات محلياً! جاري المزامنة السحابية لتحديثها لكافة زوار الموقع...");
    
    try {
      const config = [
        { key: "doctor_api_keys", value: JSON.stringify(cleanedDrKeys) },
        { key: "rafiq_api_keys", value: JSON.stringify(cleanedRafiqKeys) },
        { key: "doctor_api_key", value: cleanedDrKeys[0] || "" },
        { key: "rafiq_api_key", value: cleanedRafiqKeys[0] || "" },
        { key: "doctor_model", value: adminDrModel.trim() },
        { key: "rafiq_model", value: adminRafiqModel.trim() },
        { key: "puter_model", value: adminPuterModel.trim() },
      ];

      for (const item of config) {
        await fetch(`/api/kv/${item.key}`, {
          method: "POST",
          body: encodeVal(item.value),
        });
      }
      alert("🚀 تم تحديث الإعدادات عالمياً لجميع زوار الموقع بنجاح!");
    } catch (e) {
      console.error("Cloud upload failed:", e);
      alert("❌ تم الحفظ محلياً بنجاح، لكن فشل التحديث السحابي لجميع الزوار. تحقق من اتصالك بالإنترنت.");
    }
  };

  const handleResetAdminSettings = async () => {
    localStorage.removeItem("admin_doctor_api_key");
    localStorage.removeItem("admin_rafiq_api_key");
    localStorage.removeItem("admin_doctor_api_keys");
    localStorage.removeItem("admin_rafiq_api_keys");
    localStorage.removeItem("admin_doctor_model");
    localStorage.removeItem("admin_rafiq_model");
    localStorage.removeItem("admin_puter_model");
    
    alert("تمت إعادة التعيين محلياً! جاري إزالة الإعدادات من السحابة لتعود لوضعها الافتراضي لكافة زوار الموقع...");
    
    try {
      const keys = [
        "doctor_api_key", 
        "rafiq_api_key", 
        "doctor_api_keys", 
        "rafiq_api_keys", 
        "doctor_model", 
        "rafiq_model", 
        "puter_model"
      ];
      for (const k of keys) {
        await fetch(`/api/kv/${k}`, {
          method: "POST",
          body: "",
        });
      }
      alert("🚀 تم إرجاع الإعدادات للوضع الافتراضي لجميع زوار الموقع بنجاح!");
    } catch (e) {
      console.error("Cloud reset failed:", e);
      alert("❌ تم التصفير محلياً بنجاح، لكن فشل تحديث السحابة للزوار.");
    }
  };

  // Background Cloud Database Synchronizer
  useEffect(() => {
    const syncGlobalConfig = async () => {
      try {
        const keys = [
          { local: "admin_doctor_api_key", remote: "doctor_api_key" },
          { local: "admin_rafiq_api_key", remote: "rafiq_api_key" },
          { local: "admin_doctor_api_keys", remote: "doctor_api_keys" },
          { local: "admin_rafiq_api_keys", remote: "rafiq_api_keys" },
          { local: "admin_doctor_model", remote: "doctor_model" },
          { local: "admin_rafiq_model", remote: "rafiq_model" },
          { local: "admin_puter_model", remote: "puter_model" },
        ];
        
        for (const k of keys) {
          const res = await fetch(`/api/kv/${k.remote}`, { signal: AbortSignal.timeout(6000) });
          if (res.ok) {
            const enc = await res.text();
            if (enc && enc.trim() !== "") {
              const dec = decodeVal(enc);
              localStorage.setItem(k.local, dec);
            }
          }
        }
      } catch (e) {
        console.warn("Global cloud config sync failed, using local/cached values:", e);
      }
    };
    
    syncGlobalConfig();
  }, []);
  
  const currentPersona = activeConversation?.persona || "doctor";
  const botName = currentPersona === "doctor" ? "دكتور التعافي" : "رفيق التعافي";

  const chatRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);

  const dark = theme === "night";
  const fSize = fontSize === "small" ? 14 : fontSize === "large" ? 19 : 16;

  const scroll = useCallback((smooth = true) => {
    const lastMsg = activeConversation?.messages[activeConversation?.messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsgRef.current) {
      lastMsgRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
        block: "start"
      });
    } else {
      endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }
  }, [activeConversation?.messages]);

  useEffect(() => { scroll(); }, [activeConversation?.messages.length, scroll]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const fn = () => setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
    el.addEventListener("scroll", fn);
    return () => el.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
  }, [input]);

  const send = async (text?: string) => {
    const t = text || input.trim();
    if (!t || loading) return;
    addMessage({ id: "u" + Date.now(), role: "user", content: t, timestamp: new Date() });
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);
    try {
      const hist: Message[] = [
        ...activeConversation.messages.filter(m => !m.id.startsWith("welcome")).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: t },
      ];
      const res = await sendMessage(hist, currentPersona);
      addMessage({ id: "a" + Date.now(), role: "assistant", content: res, timestamp: new Date() });
    } catch (err: any) {
      if (err.message === "PUTER_AUTH_REQUIRED") {
        addMessage({ 
          id: "a" + Date.now(), 
          role: "assistant", 
          content: "عذراً، توقف الخادم الأساسي للذكاء الاصطناعي عن العمل بسبب الضغط أو نفاذ الرصيد.\n\nلحسن الحظ، قمنا بتفعيل **خادم الطوارئ المجاني**! يرجى الضغط على الزر أدناه لإنشاء حساب مجاني (أو تسجيل الدخول) للاستمرار في التحدث.", 
          timestamp: new Date(),
          isPuterAuthPrompt: true 
        });
      } else {
        addMessage({ id: "a" + Date.now(), role: "assistant", content: "عذرا صارت مشكلة تقنية جرب مرة ثانية", timestamp: new Date() });
      }
    } finally { setLoading(false); }
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const onlyWelcome = activeConversation.messages.length === 1 && activeConversation.messages[0].id.startsWith("welcome");
  const fmtTime = (d: Date) => new Date(d).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  // ─── Theme palette ───
  const P = {
    bg: dark ? "#09090b" : "#f8f9fc",
    sidebar: dark ? "#0f0f12" : "#ffffff",
    header: dark ? "rgba(9,9,11,0.9)" : "rgba(248,249,252,0.92)",
    card: dark ? "#141418" : "#ffffff",
    border: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
    text: dark ? "#e4e4e7" : "#18181b",
    text2: dark ? "#71717a" : "#a1a1aa",
    text3: dark ? "#3f3f46" : "#d4d4d8",
    accent: "#6366f1",
    accentLight: dark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
    accentText: dark ? "#a5b4fc" : "#4f46e5",
    userBubble: dark ? "linear-gradient(135deg, #312e81, #1e1b4b)" : "linear-gradient(135deg, #4f46e5, #4338ca)",
    botBubble: dark ? "#18181b" : "#ffffff",
    botBubbleBorder: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    botBubbleShadow: dark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
    sendBtn: "linear-gradient(135deg, #6366f1, #4f46e5)",
    sendBtnHover: "linear-gradient(135deg, #818cf8, #6366f1)",
  };

  if (currentPage === "admin") {
    return (
      <div 
        className="min-h-screen w-screen overflow-y-auto flex items-center justify-center p-4 sm:p-8" 
        dir="rtl" 
        style={{ 
          background: P.bg, 
          fontFamily: "'IBM Plex Sans Arabic', sans-serif" 
        }}
      >
        <div 
          className="w-full max-w-2xl rounded-3xl p-5 sm:p-8 my-auto space-y-6 anim-scale-up"
          style={{ 
            background: P.card, 
            border: `1px solid ${P.border}`,
            boxShadow: dark ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)"
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                <ShieldCheck size={20} color="#ef4444" />
              </div>
              <div>
                <h3 className="font-extrabold text-[16px]" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>لوحة تحكم المدير</h3>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: P.text2 }}>تعديل مفاتيح الـ API ونوع مۆدێل لجميع المستخدمين</p>
              </div>
            </div>
            <button 
              onClick={() => { 
                window.history.pushState({}, "", "/"); 
                setCurrentPage("chat"); 
              }}
              className="px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{ color: P.accentText, background: P.accentLight, fontFamily: "'Noto Kufi Arabic'" }}
            >
              <ArrowLeft size={14} className="rotate-180" />
              الرجوع للدردشة
            </button>
          </div>

          {/* Password Page */}
          {!isAdminAuthorized ? (
            <form onSubmit={handleAuthorize} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>رمز مرور المدير (Password)</label>
                <input 
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="أدخل رمز المرور..."
                  className="w-full px-4 py-3 rounded-2xl text-[14px] font-medium outline-none transition-all"
                  style={{ 
                    background: P.bg,
                    border: `1px solid ${P.border}`,
                    color: P.text,
                    fontFamily: "monospace"
                  }}
                  autoFocus
                />
              </div>
              
              {adminError && (
                <p className="text-[11px] font-semibold text-red-500" style={{ fontFamily: "'Noto Kufi Arabic'" }}>
                  ⚠️ {adminError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-[13px] text-white transition-all cursor-pointer hover:opacity-90 active:scale-98"
                style={{ background: P.sendBtn, fontFamily: "'Noto Kufi Arabic'" }}
              >
                دخول لوحة التحكم
              </button>
            </form>
          ) : (
            /* Settings Page */
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Doctor Keys */}
                <div className="space-y-2.5">
                  <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>مفاتيح API لدكتور التعافي (١ إلى ١٠)</label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {adminDrKeys.map((key, index) => (
                      <input 
                        key={index}
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const next = [...adminDrKeys];
                          next[index] = e.target.value;
                          setAdminDrKeys(next);
                        }}
                        placeholder={`المفتاح #${index + 1}`}
                        className="w-full px-4 py-2.5 rounded-xl text-[12px] font-medium outline-none transition-all"
                        style={{ 
                          background: P.bg,
                          border: `1px solid ${P.border}`,
                          color: P.text,
                          fontFamily: "monospace"
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Rafiq Keys */}
                <div className="space-y-2.5">
                  <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>مفاتيح API لرفيق التعافي (١ إلى ١٠)</label>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {adminRafiqKeys.map((key, index) => (
                      <input 
                        key={index}
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const next = [...adminRafiqKeys];
                          next[index] = e.target.value;
                          setAdminRafiqKeys(next);
                        }}
                        placeholder={`المفتاح #${index + 1}`}
                        className="w-full px-4 py-2.5 rounded-xl text-[12px] font-medium outline-none transition-all"
                        style={{ 
                          background: P.bg,
                          border: `1px solid ${P.border}`,
                          color: P.text,
                          fontFamily: "monospace"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Model */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>موديل دكتور التعافي (Doctor Model)</label>
                  <input 
                    type="text"
                    value={adminDrModel}
                    onChange={(e) => setAdminDrModel(e.target.value)}
                    placeholder="gemini-2.5-flash..."
                    className="w-full px-4 py-3 rounded-2xl text-[13px] font-medium outline-none transition-all"
                    style={{ 
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      color: P.text,
                      fontFamily: "monospace"
                    }}
                  />
                </div>

                {/* Rafiq Model */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>موديل رفيق التعافي (Rafiq Model)</label>
                  <input 
                    type="text"
                    value={adminRafiqModel}
                    onChange={(e) => setAdminRafiqModel(e.target.value)}
                    placeholder="gemini-2.5-flash..."
                    className="w-full px-4 py-3 rounded-2xl text-[13px] font-medium outline-none transition-all"
                    style={{ 
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      color: P.text,
                      fontFamily: "monospace"
                    }}
                  />
                </div>

                {/* Puter Model */}
                <div className="space-y-1.5 pt-2 mt-2 border-t" style={{ borderColor: P.border }}>
                  <label className="text-[12px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>موديل خادم الطوارئ (Puter Fallback)</label>
                  <input 
                    type="text"
                    value={adminPuterModel}
                    onChange={(e) => setAdminPuterModel(e.target.value)}
                    placeholder="gemini-3-flash-preview..."
                    className="w-full px-4 py-3 rounded-2xl text-[13px] font-medium outline-none transition-all"
                    style={{ 
                      background: P.bg,
                      border: `1px solid ${P.border}`,
                      color: P.text,
                      fontFamily: "monospace"
                    }}
                  />
                  <p className="text-[10px]" style={{ color: P.text2 }}>يتم استخدامه تلقائياً كخادم احتياطي مجاني في حال توقف الخادم الأساسي.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-4">
                <button
                  onClick={handleSaveAdminSettings}
                  className="flex-1 py-3 rounded-2xl font-bold text-[13px] text-white transition-all cursor-pointer hover:opacity-90 active:scale-98"
                  style={{ background: P.sendBtn, fontFamily: "'Noto Kufi Arabic'" }}
                >
                  حفظ التغييرات ونشرها عالمياً
                </button>
                <button
                  onClick={handleResetAdminSettings}
                  className="px-6 py-3 rounded-2xl font-bold text-[13px] transition-all cursor-pointer hover:bg-red-500/10 active:scale-98"
                  style={{ 
                    background: dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
                    border: "1px solid rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    fontFamily: "'Noto Kufi Arabic'" 
                  }}
                >
                  إرجاع الافتراضي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex overflow-hidden" dir="rtl" style={{ background: P.bg, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`fixed lg:relative z-50 top-0 right-0 h-full w-[290px] flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
        style={{ background: P.sidebar, borderLeft: `1px solid ${P.border}` }}
      >
        {/* Top */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: P.accentLight }}>
              <HeartPulse size={18} style={{ color: P.accentText }} />
            </div>
            <span className="font-bold text-[15px]" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>المحادثات</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95" style={{ color: P.text2, background: P.accentLight }}>
            <X size={16} />
          </button>
        </div>

        {/* New chat */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => newConversation(currentPersona)}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl font-bold text-[14px] cursor-pointer transition-all active:scale-[0.97] hover:shadow-lg"
            style={{ background: P.sendBtn, color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.25)" }}
          >
            <Plus size={18} strokeWidth={2.5} />
            محادثة جديدة
          </button>
        </div>

        {/* User Account Storage Card */}
        {!currentUser ? (
          <div className="px-4 py-2">
            <div 
              className="p-3.5 rounded-2xl border space-y-2 transition-all"
              style={{ 
                background: dark ? "rgba(99,102,241,0.03)" : "rgba(99,102,241,0.01)",
                borderColor: P.border
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500 animate-pulse" />
                <span className="text-[11px] font-bold" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>حفظ المحادثات سحابياً</span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: P.text2, fontFamily: "'IBM Plex Sans Arabic'" }}>
                تسجيل الحساب اختياري ومطلوب فقط إذا كنت ترغب بحفظ جلساتك سحابياً والوصول إليها من أي جهاز آخر في أي وقت.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-2 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer hover:opacity-90 flex items-center justify-center gap-1.5"
                style={{ background: P.accentLight, color: P.accentText, fontFamily: "'Noto Kufi Arabic'" }}
              >
                إنشاء حساب / تسجيل الدخول
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2">
            <div 
              className="p-3.5 rounded-2xl border space-y-2 transition-all"
              style={{ 
                background: dark ? "rgba(34,197,94,0.03)" : "rgba(34,197,94,0.01)",
                borderColor: dark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-ping" />
                  <span className="text-[11.5px] font-bold truncate" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>
                    {currentUser.username}
                  </span>
                </div>
                <span className="text-[9px] font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full" style={{ fontFamily: "'Noto Kufi Arabic'" }}>
                  متزامن سحابياً
                </span>
              </div>
              {lastSynced && (
                <div className="flex justify-between items-center text-[9px]" style={{ color: P.text2 }}>
                  <span style={{ fontFamily: "'Noto Kufi Arabic'" }}>آخر مزامنة:</span>
                  <span className="font-semibold" style={{ fontFamily: "monospace" }}>{lastSynced}</span>
                </div>
              )}
              <button
                onClick={logout}
                className="w-full py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer hover:bg-red-500/10 flex items-center justify-center gap-1.5"
                style={{ 
                  background: "transparent", 
                  border: `1px solid ${dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)"}`, 
                  color: "#ef4444", 
                  fontFamily: "'Noto Kufi Arabic'" 
                }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 pt-1 space-y-1">
          {[...conversations].filter(c => (c.persona || "doctor") === currentPersona).reverse().map((c) => {
            const active = c.id === activeConvId;
            return (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className="group flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all"
                style={{
                  background: active ? P.accentLight : "transparent",
                  color: active ? P.text : P.text2,
                }}
              >
                <MessageSquare size={16} style={{ opacity: active ? 0.9 : 0.4, color: active ? P.accentText : undefined }} />
                <span className="flex-1 truncate text-[13px] font-medium">{c.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90"
                  style={{ color: "#ef4444", background: dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 space-y-3" style={{ borderTop: `1px solid ${P.border}` }}>
          {/* Theme */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: P.text2 }}>المظهر</span>
            <button
              onClick={() => setTheme(dark ? "day" : "night")}
              className="w-[56px] h-[30px] rounded-full relative cursor-pointer transition-all"
              style={{ background: dark ? "#1e1e24" : "#e5e7eb", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}
            >
              <div
                className="absolute top-[3px] w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  right: dark ? "3px" : "calc(100% - 27px)",
                  background: dark ? P.accent : "#fff",
                  boxShadow: dark ? "0 2px 8px rgba(99,102,241,0.3)" : "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                {dark ? <Moon size={12} color="#fff" /> : <Sun size={12} color="#f59e0b" />}
              </div>
            </button>
          </div>
          {/* Font */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: P.text2 }}>حجم الخط</span>
            <div className="flex items-center gap-0.5 rounded-xl overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
              <button
                onClick={() => setFontSize(fontSize === "large" ? "medium" : fontSize === "medium" ? "small" : "small")}
                className="w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-90"
                style={{ color: P.text2, background: fontSize === "small" ? P.accentLight : "transparent" }}
              >
                <AArrowDown size={14} />
              </button>
              <div className="w-8 h-8 flex items-center justify-center text-[11px] font-bold" style={{ color: P.accentText }}>
                {fontSize === "small" ? "ص" : fontSize === "large" ? "ك" : "م"}
              </div>
              <button
                onClick={() => setFontSize(fontSize === "small" ? "medium" : fontSize === "medium" ? "large" : "large")}
                className="w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-90"
                style={{ color: P.text2, background: fontSize === "large" ? P.accentLight : "transparent" }}
              >
                <AArrowUp size={14} />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Header */}
        <header className="z-20 flex items-center justify-between px-3 sm:px-4 lg:px-7 py-3 backdrop-blur-xl" style={{ background: P.header, borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 flex-shrink-0"
              style={{ color: P.text2, background: P.accentLight }}
            >
              <Menu size={18} />
            </button>
            <BotAvatar size={40} isDoctor={currentPersona === "doctor"} />
            <div className="hidden sm:block min-w-0">
              <h1 className="font-extrabold text-[15px] sm:text-[17px] leading-tight flex items-center gap-2 truncate" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>
                {botName}
                <Sparkles size={14} color="#f59e0b" className="flex-shrink-0" />
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.4)" }} />
                <span className="text-[11px] sm:text-[12px] font-medium" style={{ color: P.text2 }}>متصل الآن</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center p-0.5 sm:p-1 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
               <button
                  onClick={() => switchPersona("doctor")}
                  className={`px-2 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[12px] font-bold transition-all ${currentPersona === "doctor" ? "shadow-sm scale-105" : "opacity-60 hover:opacity-100"}`}
                  style={{ 
                     background: currentPersona === "doctor" ? P.accentLight : "transparent",
                     color: currentPersona === "doctor" ? P.accentText : P.text2,
                     fontFamily: "'Noto Kufi Arabic'"
                  }}
               >
                  دكتور
               </button>
               <button
                  onClick={() => switchPersona("rafiq")}
                  className={`px-2 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[12px] font-bold transition-all ${currentPersona === "rafiq" ? "shadow-sm scale-105" : "opacity-60 hover:opacity-100"}`}
                  style={{ 
                     background: currentPersona === "rafiq" ? P.accentLight : "transparent",
                     color: currentPersona === "rafiq" ? P.accentText : P.text2,
                     fontFamily: "'Noto Kufi Arabic'"
                  }}
               >
                  رفيق
               </button>
            </div>
            <button
              onClick={() => newConversation(currentPersona)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 flex-shrink-0"
              style={{ color: P.text2, background: P.accentLight }}
              title="محادثة جديدة"
            >
              <Plus size={16} />
            </button>
          </div>
        </header>

        {/* Chat */}
        <div ref={chatRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin relative">
          <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-12 py-8 space-y-7">

            {/* Date pill */}
            <div className="flex justify-center anim-fade-in">
              <span className="text-[11px] font-semibold px-4 py-1.5 rounded-full" style={{ background: P.accentLight, color: P.accentText }}>
                {new Date(activeConversation.createdAt).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            {activeConversation.messages.map((msg, i) => {
              const isLast = i === activeConversation.messages.length - 1;
              return (
                <div 
                  key={msg.id} 
                  ref={isLast ? lastMsgRef : undefined}
                  className="anim-slide-up" 
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.2)}s` }}
                >
                  {msg.role === "assistant" ? (
                    <BotMsg content={msg.content} t={fmtTime(msg.timestamp)} dark={dark} fSize={fSize} P={P} botName={botName} isDoctor={currentPersona === "doctor"} isPuterAuthPrompt={msg.isPuterAuthPrompt} />
                  ) : (
                    <UserMsg content={msg.content} t={fmtTime(msg.timestamp)} dark={dark} fSize={fSize} P={P} />
                  )}
                </div>
              );
            })}

            {/* Typing */}
            {loading && (
              <div className="anim-slide-up flex items-start gap-3">
                <BotAvatar size={36} isDoctor={currentPersona === "doctor"} />
                <div className="rounded-2xl rounded-br-sm px-5 py-4" style={{ background: P.botBubble, border: `1px solid ${P.botBubbleBorder}`, boxShadow: P.botBubbleShadow }}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full dot-anim" style={{ background: P.accent }} />
                      <span className="w-2 h-2 rounded-full dot-anim" style={{ background: P.accent }} />
                      <span className="w-2 h-2 rounded-full dot-anim" style={{ background: P.accent }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>
                      {botName} يكتب...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {onlyWelcome && !loading && (
              <div className="anim-fade-in pt-4" style={{ animationDelay: "0.3s" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s.text)}
                      className="group flex items-center gap-4 p-4 rounded-2xl text-right cursor-pointer transition-all active:scale-[0.97] hover:scale-[1.01] hover:shadow-lg"
                      style={{
                        background: P.card,
                        border: `1px solid ${P.border}`,
                        boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl transition-transform group-hover:scale-110" style={{ background: P.accentLight }}>
                        {s.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold truncate" style={{ color: P.text }}>{s.text}</div>
                        <div className="text-[11px] font-medium mt-0.5" style={{ color: P.text2 }}>{s.sub}</div>
                      </div>
                      <ArrowLeft size={16} style={{ color: P.text3 }} className="flex-shrink-0 transition-transform group-hover:-translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} className="h-1" />
          </div>
        </div>

        {/* Scroll btn */}
        {showScroll && (
          <button
            onClick={() => scroll()}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-110"
            style={{ background: P.accent, color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
          >
            <ChevronDown size={20} />
          </button>
        )}

        {/* Input */}
        <div className="z-20 px-3 sm:px-6 lg:px-12 py-4 backdrop-blur-xl" style={{ background: P.header, borderTop: `1px solid ${P.border}` }}>
          <div className="w-full max-w-[1400px] mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl p-2 transition-all"
              style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: dark ? "none" : "0 2px 10px rgba(0,0,0,0.04)" }}
            >
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="اكتب رسالتك هنا..."
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent border-none px-4 py-3 leading-relaxed disabled:opacity-40 placeholder:font-medium"
                style={{ color: P.text, fontSize: fSize, fontFamily: "'IBM Plex Sans Arabic'" }}
                dir="rtl"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer active:scale-90 disabled:opacity-15 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ background: (!input.trim() || loading) ? (dark ? "#1e1e24" : "#e5e7eb") : P.sendBtn, color: "#fff", boxShadow: (!input.trim() || loading) ? "none" : "0 4px 14px rgba(99,102,241,0.3)" }}
              >
                <Send size={18} className="rotate-180" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <ShieldCheck size={12} style={{ color: P.accentText, opacity: 0.5 }} />
              <p className="text-[11px] font-medium" style={{ color: P.text3 }}>
                محادثاتك سرية تماماً • مدعوم بالذكاء الاصطناعي
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ════════ ADMIN MODAL ════════ */}

      {/* ════════ AUTH MODAL ════════ */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md anim-fade-in" dir="rtl">
          <div 
            className="w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-6 anim-scale-up"
            style={{ 
              background: P.card, 
              border: `1px solid ${P.border}`,
              boxShadow: dark ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)"
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <Cloud size={18} color="#6366f1" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[15px]" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>حفظ الجلسات سحابياً</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: P.text2, fontFamily: "'IBM Plex Sans Arabic'" }}>مزامنة محادثاتك بشكل آمن ومشفّر</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setUserAuthError("");
                  setUserAuthSuccess("");
                }} 
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:bg-red-500/10 hover:text-red-500 animate-fade-in" 
                style={{ color: P.text2 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Explanatory banner */}
            <div className="p-3 rounded-2xl text-[11px] leading-relaxed" style={{ background: P.accentLight, color: P.accentText, border: `1px solid ${P.border}` }}>
              💡 <strong>توضيح مهم:</strong> إنشاء الحساب اختياري بالكامل. لا تحتاج إلى حساب لاستخدام التطبيق، ولكنه مطلوب <strong>فقط</strong> إذا كنت ترغب بحفظ جلساتك سحابياً والرجوع إليها في أي وقت ومن أي جهاز.
            </div>

            {/* Tabs */}
            <div className="flex p-1 rounded-xl" style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
              <button
                onClick={() => { setAuthTab("login"); setUserAuthError(""); setUserAuthSuccess(""); }}
                className={`flex-1 py-2 text-[11.5px] font-bold rounded-lg cursor-pointer transition-all ${authTab === "login" ? "shadow-sm" : "opacity-60"}`}
                style={{
                  background: authTab === "login" ? P.card : "transparent",
                  color: P.text,
                  fontFamily: "'Noto Kufi Arabic'"
                }}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setUserAuthError(""); setUserAuthSuccess(""); }}
                className={`flex-1 py-2 text-[11.5px] font-bold rounded-lg cursor-pointer transition-all ${authTab === "signup" ? "shadow-sm" : "opacity-60"}`}
                style={{
                  background: authTab === "signup" ? P.card : "transparent",
                  color: P.text,
                  fontFamily: "'Noto Kufi Arabic'"
                }}
              >
                إنشاء حساب جديد
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {userAuthError && (
                <div className="p-3 rounded-xl text-[11px] font-bold text-red-500 bg-red-500/10 border border-red-500/15" style={{ fontFamily: "'Noto Kufi Arabic'" }}>
                  ⚠️ {userAuthError}
                </div>
              )}

              {userAuthSuccess && (
                <div className="p-3 rounded-xl text-[11px] font-bold text-green-500 bg-green-500/10 border border-green-500/15" style={{ fontFamily: "'Noto Kufi Arabic'" }}>
                  ✓ {userAuthSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>اسم المستخدم (Username)</label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="مثال: ali_99"
                  disabled={authLoading}
                  className="w-full px-4 py-3 rounded-xl border font-semibold text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: P.bg, color: P.text, borderColor: P.border }}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>كلمة المرور (Password)</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={authLoading}
                  className="w-full px-4 py-3 rounded-xl border font-semibold text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: P.bg, color: P.text, borderColor: P.border }}
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-2xl font-bold text-[13px] cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ 
                  background: P.sendBtn, 
                  color: "#fff", 
                  boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
                  fontFamily: "'Noto Kufi Arabic'" 
                }}
              >
                {authLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {authTab === "login" ? "دخول إلى الحساب" : "تفعيل الحساب والنسخ الاحتياطي"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


/* ═══════════════════════════════════ */
/*         MESSAGE COMPONENTS          */
/* ═══════════════════════════════════ */

interface MsgProps {
  content: string;
  t: string;
  dark: boolean;
  fSize: number;
  P: Record<string, string>;
  botName?: string;
  isDoctor?: boolean;
  isPuterAuthPrompt?: boolean;
}

function BotMsg({ content, t, dark, fSize, P, botName, isDoctor, isPuterAuthPrompt }: MsgProps) {
  return (
    <div className="flex items-start gap-3 w-full">
      <BotAvatar size={36} isDoctor={isDoctor} />
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold" style={{ color: P.accentText, fontFamily: "'Noto Kufi Arabic'" }}>
            {botName}
          </span>
          <div className="flex items-center gap-1" style={{ color: P.text3 }}>
            <Clock3 size={10} />
            <span className="text-[10px]">{t}</span>
          </div>
        </div>
        <div
          className={`rounded-2xl rounded-tr-sm px-5 py-5 overflow-hidden ${dark ? "dark-msg" : "light-msg"}`}
          style={{
            background: P.botBubble,
            border: `1px solid ${P.botBubbleBorder}`,
            boxShadow: P.botBubbleShadow,
          }}
        >
          <div
            className="msg-content"
            style={{
              fontSize: fSize,
              color: dark ? "rgba(255,255,255,0.93)" : "rgba(0,0,0,0.82)",
              fontFamily: "'IBM Plex Sans Arabic'",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {isPuterAuthPrompt && (
              <div className="pt-4 mt-4 border-t border-dashed flex justify-center" style={{ borderColor: P.border }}>
                <button
                  onClick={() => window.puter && window.puter.auth.signIn()}
                  className="px-6 py-3 rounded-2xl font-bold text-[13px] text-white transition-all cursor-pointer hover:opacity-90 shadow-lg flex items-center gap-2 animate-bounce"
                  style={{ background: "#6366f1", fontFamily: "'Noto Kufi Arabic'" }}
                >
                  <span>🚀 إنشاء حساب / تسجيل الدخول في خادم الطوارئ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMsg({ content, t, fSize, P }: MsgProps) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: P.sendBtn }}
      >
        <span className="text-white text-[11px] font-extrabold" style={{ fontFamily: "'Noto Kufi Arabic'" }}>أنا</span>
      </div>
      <div className="flex flex-col gap-2 items-end min-w-0" style={{ maxWidth: "90%" }}>
        <div className="flex items-center gap-2 flex-row-reverse">
          <span className="text-[12px] font-extrabold" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>أنت</span>
          <div className="flex items-center gap-1" style={{ color: P.text3 }}>
            <Clock3 size={10} />
            <span className="text-[10px]">{t}</span>
          </div>
        </div>
        <div className="rounded-2xl rounded-tl-sm px-6 py-5" style={{ background: P.userBubble }}>
          <p className="whitespace-pre-wrap leading-relaxed text-white/95" style={{ fontSize: fSize, fontFamily: "'IBM Plex Sans Arabic'" }}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
