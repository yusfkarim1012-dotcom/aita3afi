import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage, type Message, getCustomServers, DEFAULT_SERVERS, type CustomServer } from "./api";
import { useAppStore } from "./store";
import KeyChipsInput from "./KeyChipsInput";

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
  ChevronUp,
  MessageSquare,
  AArrowUp,
  AArrowDown,
  Sparkles,
  Cloud,
  ArrowLeft,
  Clock3,
  ShieldCheck,
  HeartPulse,
  Power,
  PowerOff,
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

  const [adminCustomServers, setAdminCustomServers] = useState<CustomServer[]>([]);
  const [serverDrKeys, setServerDrKeys] = useState<Record<string, string>>({});
  const [serverRafiqKeys, setServerRafiqKeys] = useState<Record<string, string>>({});
  const [serverDrModel, setServerDrModel] = useState<Record<string, string>>({});
  const [serverRafiqModel, setServerRafiqModel] = useState<Record<string, string>>({});
  const [fetchingModelsMap, setFetchingModelsMap] = useState<Record<string, boolean>>({});

  const [adminServersOrder, setAdminServersOrder] = useState<string[]>([]);
  const [adminServersDisabled, setAdminServersDisabled] = useState<Set<string>>(new Set());
  const [adminPuterModel, setAdminPuterModel] = useState("");

  // UI forms states for Add/Edit server
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerIcon, setNewServerIcon] = useState("🌐");
  const [newServerUrl, setNewServerUrl] = useState("");

  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editServerName, setEditServerName] = useState("");
  const [editServerIcon, setEditServerIcon] = useState("");
  const [editServerUrl, setEditServerUrl] = useState("");

  const handleAddCustomServer = () => {
    if (!newServerName.trim() || !newServerUrl.trim()) {
      alert("⚠️ يرجى إدخال الاسم وعنوان API URL.");
      return;
    }
    const cleanId = "custom-" + Date.now();
    const newServer: CustomServer = {
      id: cleanId,
      name: newServerName.trim(),
      icon: newServerIcon.trim() || "🌐",
      baseUrl: newServerUrl.trim(),
    };

    setAdminCustomServers(prev => [...prev, newServer]);
    setAdminServersOrder(prev => [...prev, cleanId]);

    setServerDrKeys(prev => ({ ...prev, [cleanId]: "" }));
    setServerRafiqKeys(prev => ({ ...prev, [cleanId]: "" }));
    setServerDrModel(prev => ({ ...prev, [cleanId]: "gemini-2.5-flash" }));
    setServerRafiqModel(prev => ({ ...prev, [cleanId]: "gemini-2.5-flash" }));

    setNewServerName("");
    setNewServerIcon("🌐");
    setNewServerUrl("");
    setShowAddServerForm(false);
  };

  const handleStartEditServer = (srv: CustomServer) => {
    setEditingServerId(srv.id);
    setEditServerName(srv.name);
    setEditServerIcon(srv.icon);
    setEditServerUrl(srv.baseUrl);
  };

  const handleUpdateCustomServer = () => {
    if (!editingServerId) return;
    if (!editServerName.trim() || !editServerUrl.trim()) {
      alert("⚠️ يرجى إدخال الاسم وعنوان API URL.");
      return;
    }

    setAdminCustomServers(prev => prev.map(s => {
      if (s.id === editingServerId) {
        return {
          ...s,
          name: editServerName.trim(),
          icon: editServerIcon.trim() || "🌐",
          baseUrl: editServerUrl.trim(),
        };
      }
      return s;
    }));

    setEditingServerId(null);
  };

  const handleDeleteCustomServer = (serverId: string) => {
    if (confirm("⚠️ ئایا دڵنیای لە سڕینەوەی ئەم سێرڤەرە؟")) {
      setAdminCustomServers(prev => prev.filter(s => s.id !== serverId));
      setAdminServersOrder(prev => prev.filter(id => id !== serverId));
      setAdminServersDisabled(prev => {
        const next = new Set(prev);
        next.delete(serverId);
        return next;
      });
    }
  };

  // Server reorder helpers
  const moveServerUp = (index: number) => {
    if (index <= 0) return;
    setAdminServersOrder(prev => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };
  const moveServerDown = (index: number) => {
    setAdminServersOrder(prev => {
      if (index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };
  const toggleServerDisabled = (serverId: string) => {
    setAdminServersDisabled(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) next.delete(serverId);
      else next.add(serverId);
      return next;
    });
  };

  const fetchLatestModels = async (serverId: string, baseUrl: string, persona: 'doctor' | 'rafiq') => {
    const keysText = (persona === 'doctor' ? serverDrKeys[serverId] : serverRafiqKeys[serverId]) || "";
    const keys = keysText.split('\n').map(k => k.trim()).filter(k => k !== "");
    let defaultKey = '';
    if (serverId === 'bluesminds') defaultKey = "VFnpPZlpu0iFyQkJtHF7HNfjjmn5FXJd9K2BV";
    else if (serverId === 'manus') defaultKey = persona === 'doctor' ? "sk-hLwMhHmK84UppzziebKMn5" : "sk-VUgfFKWUMeimyDihMFBJVj";
    const primaryKey = keys[0] || defaultKey;

    if (!primaryKey) { alert("⚠️ لا يوجد مفتاح API لاختباره."); return; }

    const loadingKey = `${serverId}-${persona}`;
    setFetchingModelsMap(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const { fetchModels } = await import('./api');
      const models = await fetchModels(baseUrl, primaryKey);
      if (models.length > 0) {
        if (persona === 'doctor') {
          const currentModel = serverDrModel[serverId] || "";
          if (!models.includes(currentModel)) {
            setServerDrModel(prev => ({ ...prev, [serverId]: models[0] }));
          }
        } else {
          const currentModel = serverRafiqModel[serverId] || "";
          if (!models.includes(currentModel)) {
            setServerRafiqModel(prev => ({ ...prev, [serverId]: models[0] }));
          }
        }
        alert("🚀 تم جلب الموديلات بنجاح!");
      } else {
        alert("⚠️ لم يتم العثور على موديلات.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`❌ فشل جلب الموديلات: ${e.message || e}`);
    } finally {
      setFetchingModelsMap(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const testApiKey = async (baseUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { fetchModels } = await import('./api');
      const models = await fetchModels(baseUrl, apiKey);
      if (models && models.length > 0) {
        return { success: true, message: `کلیلەکە چالاکە و کاردەکات! مۆدێلە بەردەستەکان: ${models.slice(0, 3).join(', ')}` };
      }
      return { success: true, message: "کليلەکە پەیوەست بوو بەڵام مۆدێلی نەگەڕاندەوە." };
    } catch (e: any) {
      console.error(e);
      return { success: false, message: `ئەم کلیلە کارناکات یان هەڵەیە. هەڵە: ${e.message || e}` };
    }
  };

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

      const currentServers = getCustomServers();
      setAdminCustomServers(currentServers);

      const drKeysMap: Record<string, string> = {};
      const rafiqKeysMap: Record<string, string> = {};
      const drModelMap: Record<string, string> = {};
      const rafiqModelMap: Record<string, string> = {};

      const loadKeys = (primary: string, fallback: string, defaultVal: string): string => {
        try {
          const saved = localStorage.getItem(primary);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed.join('\n');
          }
        } catch {}
        return localStorage.getItem(fallback) || defaultVal;
      };

      currentServers.forEach(srv => {
        let drKeysKey = `admin_${srv.id}_doctor_api_keys`;
        let rafiqKeysKey = `admin_${srv.id}_rafiq_api_keys`;
        let drModelKey = `admin_${srv.id}_doctor_model`;
        let rafiqModelKey = `admin_${srv.id}_rafiq_model`;

        if (srv.id === "manus") {
          drKeysKey = "admin_doctor_api_keys";
          rafiqKeysKey = "admin_rafiq_api_keys";
          drModelKey = "admin_doctor_model";
          rafiqModelKey = "admin_rafiq_model";
        } else if (srv.id === "bluesminds") {
          drKeysKey = "admin_bluesminds_doctor_keys";
          rafiqKeysKey = "admin_bluesminds_rafiq_keys";
          drModelKey = "admin_bluesminds_doctor_model";
          rafiqModelKey = "admin_bluesminds_rafiq_model";
        } else if (srv.id === "keysfan") {
          drKeysKey = "admin_keysfan_doctor_keys";
          rafiqKeysKey = "admin_keysfan_rafiq_keys";
          drModelKey = "admin_keysfan_doctor_model";
          rafiqModelKey = "admin_keysfan_rafiq_model";
        }

        let defaultKey = "";
        if (srv.id === "bluesminds") defaultKey = "VFnpPZlpu0iFyQkJtHF7HNfjjmn5FXJd9K2BV";
        else if (srv.id === "manus") defaultKey = "sk-hLwMhHmK84UppzziebKMn5";

        let defaultRafiqKey = defaultKey;
        if (srv.id === "manus") defaultRafiqKey = "sk-VUgfFKWUMeimyDihMFBJVj";

        drKeysMap[srv.id] = loadKeys(drKeysKey, `admin_${srv.id}_doctor_api_key`, defaultKey);
        rafiqKeysMap[srv.id] = loadKeys(rafiqKeysKey, `admin_${srv.id}_rafiq_api_key`, defaultRafiqKey);

        const drModel = localStorage.getItem(drModelKey) || "gemini-2.5-flash";
        const rafiqModel = localStorage.getItem(rafiqModelKey) || "gemini-2.5-flash";

        drModelMap[srv.id] = drModel;
        rafiqModelMap[srv.id] = rafiqModel;

      });

      setServerDrKeys(drKeysMap);
      setServerRafiqKeys(rafiqKeysMap);
      setServerDrModel(drModelMap);
      setServerRafiqModel(rafiqModelMap);

      const puterModel = localStorage.getItem("admin_puter_model") || "gemini-3-flash-preview";
      setAdminPuterModel(puterModel);

      const allIds = currentServers.map(s => s.id);
      let order: string[] = [...allIds];
      try {
        const orderSaved = localStorage.getItem("admin_servers_order");
        if (orderSaved) {
          const parsed = JSON.parse(orderSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((s: string) => allIds.includes(s));
            const missing = allIds.filter(s => !valid.includes(s));
            order = [...valid, ...missing];
          }
        }
      } catch {}
      setAdminServersOrder(order);

      let disabled: string[] = [];
      try {
        const disabledSaved = localStorage.getItem("admin_servers_disabled");
        if (disabledSaved) {
          const parsed = JSON.parse(disabledSaved);
          if (Array.isArray(parsed)) {
            disabled = parsed.filter((s: string) => allIds.includes(s));
          }
        }
      } catch {}
      setAdminServersDisabled(new Set(disabled));
    } else {
      setAdminError("رمز المرور غير صحيح! حاول مرة أخرى.");
    }
  };

  const handleSaveAdminSettings = async () => {
    localStorage.setItem("admin_custom_servers", JSON.stringify(adminCustomServers));

    adminCustomServers.forEach(srv => {
      let drKeysKey = `admin_${srv.id}_doctor_api_keys`;
      let rafiqKeysKey = `admin_${srv.id}_rafiq_api_keys`;
      let drModelKey = `admin_${srv.id}_doctor_model`;
      let rafiqModelKey = `admin_${srv.id}_rafiq_model`;

      if (srv.id === "manus") {
        drKeysKey = "admin_doctor_api_keys";
        rafiqKeysKey = "admin_rafiq_api_keys";
        drModelKey = "admin_doctor_model";
        rafiqModelKey = "admin_rafiq_model";
      } else if (srv.id === "bluesminds") {
        drKeysKey = "admin_bluesminds_doctor_keys";
        rafiqKeysKey = "admin_bluesminds_rafiq_keys";
        drModelKey = "admin_bluesminds_doctor_model";
        rafiqModelKey = "admin_bluesminds_rafiq_model";
      } else if (srv.id === "keysfan") {
        drKeysKey = "admin_keysfan_doctor_keys";
        rafiqKeysKey = "admin_keysfan_rafiq_keys";
        drModelKey = "admin_keysfan_doctor_model";
        rafiqModelKey = "admin_keysfan_rafiq_model";
      }

      const drKeys = (serverDrKeys[srv.id] || "").split('\n').map(k => k.trim()).filter(k => k !== "");
      const rafiqKeys = (serverRafiqKeys[srv.id] || "").split('\n').map(k => k.trim()).filter(k => k !== "");

      localStorage.setItem(drKeysKey, JSON.stringify(drKeys));
      localStorage.setItem(rafiqKeysKey, JSON.stringify(rafiqKeys));
      localStorage.setItem(`admin_${srv.id}_doctor_api_key`, drKeys[0] || "");
      localStorage.setItem(`admin_${srv.id}_rafiq_api_key`, rafiqKeys[0] || "");
      localStorage.setItem(drModelKey, (serverDrModel[srv.id] || "").trim());
      localStorage.setItem(rafiqModelKey, (serverRafiqModel[srv.id] || "").trim());
    });

    localStorage.setItem("admin_puter_model", adminPuterModel.trim());
    localStorage.setItem("admin_servers_order", JSON.stringify(adminServersOrder));
    localStorage.setItem("admin_servers_disabled", JSON.stringify([...adminServersDisabled]));

    alert("تم حفظ الإعدادات محلياً! جاري المزامنة السحابية لتحديثها لكافة زوار الموقع...");

    try {
      const config: { key: string, value: string }[] = [
        { key: "custom_servers", value: JSON.stringify(adminCustomServers) },
        { key: "puter_model", value: adminPuterModel.trim() },
        { key: "servers_order", value: JSON.stringify(adminServersOrder) },
        { key: "servers_disabled", value: JSON.stringify([...adminServersDisabled]) },
      ];

      adminCustomServers.forEach(srv => {
        let drKeysKey = `${srv.id}_doctor_api_keys`;
        let rafiqKeysKey = `${srv.id}_rafiq_api_keys`;
        let drModelKey = `${srv.id}_doctor_model`;
        let rafiqModelKey = `${srv.id}_rafiq_model`;

        if (srv.id === "manus") {
          drKeysKey = "doctor_api_keys";
          rafiqKeysKey = "rafiq_api_keys";
          drModelKey = "doctor_model";
          rafiqModelKey = "rafiq_model";
        } else if (srv.id === "bluesminds") {
          drKeysKey = "bluesminds_doctor_keys";
          rafiqKeysKey = "bluesminds_rafiq_keys";
          drModelKey = "bluesminds_doctor_model";
          rafiqModelKey = "bluesminds_rafiq_model";
        } else if (srv.id === "keysfan") {
          drKeysKey = "keysfan_doctor_keys";
          rafiqKeysKey = "keysfan_rafiq_keys";
          drModelKey = "keysfan_doctor_model";
          rafiqModelKey = "keysfan_rafiq_model";
        }

        const drKeys = (serverDrKeys[srv.id] || "").split('\n').map(k => k.trim()).filter(k => k !== "");
        const rafiqKeys = (serverRafiqKeys[srv.id] || "").split('\n').map(k => k.trim()).filter(k => k !== "");

        config.push(
          { key: drKeysKey, value: JSON.stringify(drKeys) },
          { key: rafiqKeysKey, value: JSON.stringify(rafiqKeys) },
          { key: `${srv.id}_doctor_key`, value: drKeys[0] || "" },
          { key: `${srv.id}_rafiq_key`, value: rafiqKeys[0] || "" },
          { key: drModelKey, value: (serverDrModel[srv.id] || "").trim() },
          { key: rafiqModelKey, value: (serverRafiqModel[srv.id] || "").trim() }
        );
      });

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
    const allLocalKeys = [
      "admin_custom_servers",
      "admin_puter_model",
      "admin_servers_order", "admin_servers_disabled",
      "admin_server_disabled", "admin_server_priority",
    ];

    adminCustomServers.forEach(srv => {
      allLocalKeys.push(
        `admin_${srv.id}_doctor_api_keys`,
        `admin_${srv.id}_rafiq_api_keys`,
        `admin_${srv.id}_doctor_api_key`,
        `admin_${srv.id}_rafiq_api_key`,
        `admin_${srv.id}_doctor_model`,
        `admin_${srv.id}_rafiq_model`,
        "admin_doctor_api_key", "admin_rafiq_api_key",
        "admin_doctor_api_keys", "admin_rafiq_api_keys",
        "admin_doctor_model", "admin_rafiq_model",
        "admin_bluesminds_doctor_key", "admin_bluesminds_rafiq_key",
        "admin_bluesminds_doctor_keys", "admin_bluesminds_rafiq_keys",
        "admin_bluesminds_doctor_model", "admin_bluesminds_rafiq_model",
        "admin_keysfan_doctor_key", "admin_keysfan_rafiq_key",
        "admin_keysfan_doctor_keys", "admin_keysfan_rafiq_keys",
        "admin_keysfan_doctor_model", "admin_keysfan_rafiq_model"
      );
    });

    for (const k of allLocalKeys) localStorage.removeItem(k);
    
    alert("تمت إعادة التعيين محلياً! جاري إزالة الإعدادات من السحابة لتعود لوضعها الافتراضي لكافة زوار الموقع...");
    
    try {
      const remoteKeys = [
        "custom_servers",
        "puter_model",
        "servers_order", "servers_disabled",
        "doctor_api_key", "rafiq_api_key", "doctor_api_keys", "rafiq_api_keys",
        "doctor_model", "rafiq_model",
        "bluesminds_doctor_key", "bluesminds_rafiq_key",
        "bluesminds_doctor_keys", "bluesminds_rafiq_keys",
        "bluesminds_doctor_model", "bluesminds_rafiq_model",
        "keysfan_doctor_key", "keysfan_rafiq_key",
        "keysfan_doctor_keys", "keysfan_rafiq_keys",
        "keysfan_doctor_model", "keysfan_rafiq_model",
      ];
      for (const k of remoteKeys) {
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
        const srvRes = await fetch(`/api/kv/custom_servers`, { signal: AbortSignal.timeout(6000) });
        let activeServers = DEFAULT_SERVERS;
        if (srvRes.ok) {
          const enc = await srvRes.text();
          if (enc && enc.trim() !== "") {
            const dec = decodeVal(enc);
            localStorage.setItem("admin_custom_servers", dec);
            try {
              activeServers = JSON.parse(dec);
            } catch {}
          }
        }

        const keys = [
          { local: "admin_puter_model", remote: "puter_model" },
          { local: "admin_servers_order", remote: "servers_order" },
          { local: "admin_servers_disabled", remote: "servers_disabled" },
        ];

        activeServers.forEach(srv => {
          let drKeysKey = `admin_${srv.id}_doctor_api_keys`;
          let rafiqKeysKey = `admin_${srv.id}_rafiq_api_keys`;
          let drModelKey = `admin_${srv.id}_doctor_model`;
          let rafiqModelKey = `admin_${srv.id}_rafiq_model`;

          let rDrKeysKey = `${srv.id}_doctor_api_keys`;
          let rRafiqKeysKey = `${srv.id}_rafiq_api_keys`;
          let rDrModelKey = `${srv.id}_doctor_model`;
          let rRafiqModelKey = `${srv.id}_rafiq_model`;

          if (srv.id === "manus") {
            drKeysKey = "admin_doctor_api_keys";
            rafiqKeysKey = "admin_rafiq_api_keys";
            drModelKey = "admin_doctor_model";
            rafiqModelKey = "admin_rafiq_model";

            rDrKeysKey = "doctor_api_keys";
            rRafiqKeysKey = "rafiq_api_keys";
            rDrModelKey = "doctor_model";
            rRafiqModelKey = "rafiq_model";
          } else if (srv.id === "bluesminds") {
            drKeysKey = "admin_bluesminds_doctor_keys";
            rafiqKeysKey = "admin_bluesminds_rafiq_keys";
            drModelKey = "admin_bluesminds_doctor_model";
            rafiqModelKey = "admin_bluesminds_rafiq_model";

            rDrKeysKey = "bluesminds_doctor_keys";
            rRafiqKeysKey = "bluesminds_rafiq_keys";
            rDrModelKey = "bluesminds_doctor_model";
            rRafiqModelKey = "bluesminds_rafiq_model";
          } else if (srv.id === "keysfan") {
            drKeysKey = "admin_keysfan_doctor_keys";
            rafiqKeysKey = "admin_keysfan_rafiq_keys";
            drModelKey = "admin_keysfan_doctor_model";
            rafiqModelKey = "admin_keysfan_rafiq_model";

            rDrKeysKey = "keysfan_doctor_keys";
            rRafiqKeysKey = "keysfan_rafiq_keys";
            rDrModelKey = "keysfan_doctor_model";
            rRafiqModelKey = "keysfan_rafiq_model";
          }

          keys.push(
            { local: drKeysKey, remote: rDrKeysKey },
            { local: rafiqKeysKey, remote: rRafiqKeysKey },
            { local: drModelKey, remote: rDrModelKey },
            { local: rafiqModelKey, remote: rRafiqModelKey }
          );
        });
        
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
      const { content, serverUsed } = await sendMessage(hist, currentPersona);
      addMessage({ 
        id: "a" + Date.now(), 
        role: "assistant", 
        content, 
        timestamp: new Date(),
        serverUsed
      });
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
        className="w-screen flex items-start justify-center p-4 sm:p-8" 
        dir="rtl" 
        style={{ 
          background: P.bg, 
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          minHeight: '100vh',
          height: 'auto',
          overflowY: 'auto',
          position: 'fixed',
          inset: 0,
          zIndex: 100,
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
            <div className="space-y-6 pt-2">

                            {/* Custom Servers Management Section */}
              <div className="p-4 rounded-2xl border space-y-4" style={{ background: P.bg, borderColor: P.border }}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[14px]" style={{ color: P.accentText, fontFamily: "'Noto Kufi Arabic'" }}>⚙️ زیادکردن و ڕێکخستنی سێرڤەرەکان</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddServerForm(!showAddServerForm)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: P.text, borderColor: P.border, background: P.card }}
                  >
                    <Plus size={12} />
                    <span>سێرڤەری نوێ</span>
                  </button>
                </div>

                {/* Add Server Form */}
                {showAddServerForm && (
                  <div className="p-3 rounded-xl border space-y-3" style={{ background: P.card, borderColor: P.border }}>
                    <h5 className="text-[12px] font-bold" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>➕ زیادکردني سێرڤەري نوێ</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ناو</label>
                        <input
                          type="text"
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          placeholder="Nav..."
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border"
                          style={{ background: P.bg, borderColor: P.border, color: P.text }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ئایکۆن</label>
                        <input
                          type="text"
                          value={newServerIcon}
                          onChange={(e) => setNewServerIcon(e.target.value)}
                          placeholder="🌐"
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border text-center"
                          style={{ background: P.bg, borderColor: P.border, color: P.text }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ناونیشانی API URL</label>
                        <input
                          type="text"
                          value={newServerUrl}
                          onChange={(e) => setNewServerUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border"
                          style={{ background: P.bg, borderColor: P.border, color: P.text, fontFamily: "monospace" }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomServer}
                      className="w-full py-1.5 rounded-lg font-bold text-[11px] text-white cursor-pointer"
                      style={{ background: P.sendBtn, fontFamily: "'Noto Kufi Arabic'" }}
                    >
                      تۆمارکردن
                    </button>
                  </div>
                )}

                {/* Edit Server Form */}
                {editingServerId && (
                  <div className="p-3 rounded-xl border space-y-3" style={{ background: P.card, borderColor: P.border }}>
                    <div className="flex items-center justify-between">
                      <h5 className="text-[12px] font-bold" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>✏️ دەستکاریکردني سێرڤەر</h5>
                      <button type="button" onClick={() => setEditingServerId(null)} className="text-red-500 hover:opacity-85"><X size={14} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ناو</label>
                        <input
                          type="text"
                          value={editServerName}
                          onChange={(e) => setEditServerName(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border"
                          style={{ background: P.bg, borderColor: P.border, color: P.text }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ئایکۆن</label>
                        <input
                          type="text"
                          value={editServerIcon}
                          onChange={(e) => setEditServerIcon(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border text-center"
                          style={{ background: P.bg, borderColor: P.border, color: P.text }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>ناونیشانی API URL</label>
                        <input
                          type="text"
                          value={editServerUrl}
                          onChange={(e) => setEditServerUrl(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none border"
                          style={{ background: P.bg, borderColor: P.border, color: P.text, fontFamily: "monospace" }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateCustomServer}
                      className="w-full py-1.5 rounded-lg font-bold text-[11px] text-white cursor-pointer"
                      style={{ background: P.sendBtn, fontFamily: "'Noto Kufi Arabic'" }}
                    >
                      پاشەکەوتکردنی نوێکاریەکان
                    </button>
                  </div>
                )}
              </div>

              {/* Server Controls Section */}
              <div className="p-4 rounded-2xl border space-y-4" style={{ background: P.bg, borderColor: P.border }}>
                <h4 className="font-bold text-[14px]" style={{ color: P.accentText, fontFamily: "'Noto Kufi Arabic'" }}>🎛️ ڕیزبەندکردن و کۆنتڕۆڵی سێرڤەرەکان</h4>
                <p className="text-[11px]" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>
                  سێرڤەرەکان بەپێی ئەم ڕیزبەندیەی خوارەوە بەکاردێن. دەتوانیت هەر سێرڤەرێک بکوژێنیتەوە (سەرەکۆنترۆڵ) یان شوێنەکەی بگۆڕیت:
                </p>

                <div className="space-y-2.5">
                  {adminServersOrder.map((serverId, idx) => {
                    const srv = adminCustomServers.find(s => s.id === serverId);
                    if (!srv) return null;

                    const isDisabled = adminServersDisabled.has(serverId);

                    return (
                      <div 
                        key={serverId} 
                        className="flex items-center justify-between p-3 rounded-xl border transition-all"
                        style={{ 
                          background: P.card, 
                          borderColor: P.border,
                          opacity: isDisabled ? 0.6 : 1
                        }}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[16px]">{srv.icon}</span>
                            <span className="text-[13px] font-bold truncate" style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}>
                              {srv.name}
                            </span>
                            {isDisabled && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold shrink-0" style={{ fontFamily: "'Noto Kufi Arabic'" }}>
                                کوژاوەتەوە
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] truncate text-left mt-1" style={{ color: P.text2, fontFamily: "monospace" }}>
                            {srv.baseUrl}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Edit / Delete Buttons */}
                          <div className="flex items-center border rounded-lg overflow-hidden mr-1" style={{ borderColor: P.border }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditServer(srv)}
                              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[11px]"
                              style={{ color: P.text, fontFamily: "'Noto Kufi Arabic'" }}
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            {!srv.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomServer(srv.id)}
                                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 border-r cursor-pointer text-[11px]"
                                style={{ color: P.text, borderColor: P.border, fontFamily: "'Noto Kufi Arabic'" }}
                                title="حذف"
                              >
                                🗑️
                              </button>
                            )}
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: P.border }}>
                            <button
                              type="button"
                              onClick={() => moveServerUp(idx)}
                              disabled={idx === 0}
                              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                              style={{ color: P.text }}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveServerDown(idx)}
                              disabled={idx === adminServersOrder.length - 1}
                              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 border-r cursor-pointer"
                              style={{ color: P.text, borderColor: P.border }}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          {/* Toggle Button */}
                          <button
                            type="button"
                            onClick={() => toggleServerDisabled(serverId)}
                            className="p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                            style={{
                              background: isDisabled ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                              color: isDisabled ? "#ef4444" : "#22c55e"
                            }}
                          >
                            {isDisabled ? <PowerOff size={15} /> : <Power size={15} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic sorted API sections */}
              {adminServersOrder.map((serverId) => {
                const srv = adminCustomServers.find(s => s.id === serverId);
                if (!srv) return null;

                const drKeysValue = serverDrKeys[serverId] || "";
                const rafiqKeysValue = serverRafiqKeys[serverId] || "";
                const drModelValue = serverDrModel[serverId] || "";
                const rafiqModelValue = serverRafiqModel[serverId] || "";
                const isLoaderDr = fetchingModelsMap[`${serverId}-doctor`] || false;
                const isLoaderRafiq = fetchingModelsMap[`${serverId}-rafiq`] || false;

                return (
                  <div key={serverId} className="p-4 rounded-2xl border space-y-4" style={{ background: P.bg, borderColor: P.border }}>
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: P.border }}>
                      <h4 className="font-bold text-[14px]" style={{ color: P.accentText, fontFamily: "'Noto Kufi Arabic'" }}>
                        {srv.icon} سێرڤەری {srv.name}
                      </h4>
                      {adminServersDisabled.has(serverId) && (
                        <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full" style={{ fontFamily: "'Noto Kufi Arabic'" }}>کوژاوەتەوە</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Doctor Keys */}
                      <KeyChipsInput
                        value={drKeysValue}
                        onChange={(val) => setServerDrKeys(prev => ({ ...prev, [serverId]: val }))}
                        label={`کلیلەکانی دکتۆر (${srv.name})`}
                        placeholder="مفتاح API جديد..."
                        maxKeys={1000}
                        palette={P}
                        dark={dark}
                        onTestKey={(key) => testApiKey(srv.baseUrl, key)}
                      />
                      {/* Rafiq Keys */}
                      <KeyChipsInput
                        value={rafiqKeysValue}
                        onChange={(val) => setServerRafiqKeys(prev => ({ ...prev, [serverId]: val }))}
                        label={`کلیلەکانی ڕەفیق (${srv.name})`}
                        placeholder="مفتاح API جديد..."
                        maxKeys={1000}
                        palette={P}
                        dark={dark}
                        onTestKey={(key) => testApiKey(srv.baseUrl, key)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Doctor Model */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>مۆدێلی دکتۆر (Doctor Model)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={drModelValue}
                            onChange={(e) => setServerDrModel(prev => ({ ...prev, [serverId]: e.target.value }))}
                            placeholder="gemini-2.5-flash..."
                            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                            style={{ 
                              background: P.card, 
                              border: `1px solid ${P.border}`, 
                              color: P.text,
                              fontFamily: "monospace"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fetchLatestModels(serverId, srv.baseUrl, 'doctor')}
                            disabled={isLoaderDr}
                            className="px-3 rounded-xl text-[11px] font-bold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                            style={{ color: P.text, borderColor: P.border, background: P.card }}
                          >
                            {isLoaderDr ? "جاري..." : "جلب"}
                          </button>
                        </div>
                      </div>
                      {/* Rafiq Model */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>مۆدێلی ڕەفیق (Rafiq Model)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={rafiqModelValue}
                            onChange={(e) => setServerRafiqModel(prev => ({ ...prev, [serverId]: e.target.value }))}
                            placeholder="gemini-2.5-flash..."
                            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium outline-none transition-all"
                            style={{ 
                              background: P.card, 
                              border: `1px solid ${P.border}`, 
                              color: P.text,
                              fontFamily: "monospace"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fetchLatestModels(serverId, srv.baseUrl, 'rafiq')}
                            disabled={isLoaderRafiq}
                            className="px-3 rounded-xl text-[11px] font-bold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                            style={{ color: P.text, borderColor: P.border, background: P.card }}
                          >
                            {isLoaderRafiq ? "جاري..." : "جلب"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}\n\n              {/* Puter Fallback */}
              <div className="space-y-1.5 pt-2 mt-2 border-t" style={{ borderColor: P.border }}>
                <label className="text-[12px] font-bold block" style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}>موديل خادم الطوارئ (Puter Fallback)</label>
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
                <p className="text-[10px]" style={{ color: P.text2 }}>یەکەم و دووەم گەر کار نەکەن، ئەمە بەکاردێت وەک سێرڤەری یەدەگی فریاکەوتن.</p>
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
                    <BotMsg 
                      content={msg.content} 
                      t={fmtTime(msg.timestamp)} 
                      dark={dark} 
                      fSize={fSize} 
                      P={P} 
                      botName={botName} 
                      isDoctor={currentPersona === "doctor"} 
                      isPuterAuthPrompt={msg.isPuterAuthPrompt}
                      serverUsed={msg.serverUsed}
                    />
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
  serverUsed?: "first" | "second" | "third";
}

function BotMsg({ content, t, dark, fSize, P, botName, isDoctor, isPuterAuthPrompt, serverUsed }: MsgProps) {
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
            {serverUsed && (
              <div 
                className="pt-2 mt-2 border-t text-[9px] font-normal flex items-center justify-end gap-1.5 opacity-60"
                style={{ 
                  borderColor: P.border,
                  color: serverUsed === "first" 
                    ? "#22c55e" 
                    : serverUsed === "second" 
                    ? "#eab308" 
                    : "#ef4444" 
                }}
              >
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ 
                  background: serverUsed === "first" 
                    ? "#22c55e" 
                    : serverUsed === "second" 
                    ? "#eab308" 
                    : "#ef4444" 
                }} />
                <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>
                  {serverUsed === "first" 
                    ? "تمت الإجابة بواسطة: الخادم الأول (الرئيسي)" 
                    : serverUsed === "second" 
                    ? "تمت الإجابة بواسطة: الخادم الثاني (الاحتياطي)" 
                    : "تمت الإجابة بواسطة: الخادم الثالث (الطوارئ)"}
                </span>
              </div>
            )}
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
