import { useState, useCallback, useEffect } from "react";
import type { ChatMessage, Conversation, Theme, FontSize } from "./types";
import { sha256, encryptData, decryptData } from "./crypto";

export interface UserSession {
  username: string;
  secretKey: string;
}

const STORAGE_KEY = "dr_conversations";
const THEME_KEY = "dr_theme";
const FONT_KEY = "dr_font";

const DR_WELCOME_MESSAGE = `اهلا وسهلا فيك يا غالي
انا دكتور التعافي طبيبك النفسي ومستشارك الخاص في رحلة التعافي والعودة للطريق الصحيح
كل شي تقوله هنا بيننا وبسرية تامة فلا تتردد ولا تستحي من اي شي
قولي وش اللي في بالك وان شاء الله نمشي سوا خطوة بخطوة 💪`;

const RAFIQ_WELCOME_MESSAGE = `يا هلا والله باخوي الغالي
انا رفيقك واخوك في رحلة التعافي هنا عشان اسمعك وادعمك في اي وقت
فضفض وطلع اللي بقلبك وتطمن كل كلامنا بيني وبينك
هاه طمني عنك كيف كان يومك؟ 🤍`;

function createWelcomeMessage(persona: "doctor" | "rafiq" = "doctor"): ChatMessage {
  return {
    id: "welcome-" + Date.now(),
    role: "assistant",
    content: persona === "doctor" ? DR_WELCOME_MESSAGE : RAFIQ_WELCOME_MESSAGE,
    timestamp: new Date(),
  };
}

function createConversation(persona: "doctor" | "rafiq" = "doctor"): Conversation {
  const now = new Date();
  return {
    id: "conv-" + Date.now(),
    title: "محادثة جديدة",
    messages: [createWelcomeMessage(persona)],
    persona,
    createdAt: now,
    updatedAt: now,
  };
}

function loadConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        persona: c.persona || "doctor",
      }));
    }
  } catch (e) {
    console.error("Failed to load:", e);
  }
  return [createConversation()];
}

function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error("Failed to save:", e);
  }
}

export function useAppStore() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem("dr_active_conv_id");
    const convs = loadConversations();
    if (savedActiveId && convs.some((c) => c.id === savedActiveId)) {
      return savedActiveId;
    }
    return convs[convs.length - 1]?.id || "";
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || "night";
  });
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem(FONT_KEY) as FontSize) || "medium";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth & Cloud Sync States
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem("dr_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [lastSynced, setLastSynced] = useState<string>(() => {
    return localStorage.getItem("dr_last_synced") || "";
  });

  const [authLoading, setAuthLoading] = useState(false);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  const syncToCloud = useCallback(async (convsList: Conversation[], user: UserSession) => {
    try {
      const userHash = await sha256("ta3afi_user_" + user.username.toLowerCase().trim());
      const authVerifier = await sha256(userHash + user.secretKey);
      
      const serialized = JSON.stringify(convsList);
      const encryptedData = await encryptData(serialized, user.secretKey);
      
      const payload = {
        username: user.username,
        authVerifier,
        encryptedData
      };
      
      const res = await fetch(`/api/kv/user_${userHash}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
        setLastSynced(timeStr);
        localStorage.setItem("dr_last_synced", timeStr);
      }
    } catch (e) {
      console.warn("Background sync failed:", e);
    }
  }, []);

  useEffect(() => {
    saveConversations(conversations);
    if (currentUser) {
      syncToCloud(conversations, currentUser);
    }
  }, [conversations, currentUser, syncToCloud]);

  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(FONT_KEY, fontSize); }, [fontSize]);
  useEffect(() => {
    if (activeConvId) {
      localStorage.setItem("dr_active_conv_id", activeConvId);
    }
  }, [activeConvId]);

  const login = useCallback(async (usernameInput: string, passwordInput: string) => {
    setAuthLoading(true);
    try {
      const username = usernameInput.toLowerCase().trim();
      const userHash = await sha256("ta3afi_user_" + username);
      const authVerifier = await sha256(userHash + passwordInput);
      
      const res = await fetch(`/api/kv/user_${userHash}`);
      if (!res.ok) {
        throw new Error("اسم المستخدم غير موجود أو كلمة المرور خاطئة!");
      }
      
      const text = await res.text();
      if (!text || text.trim() === "") {
        throw new Error("اسم المستخدم غير موجود أو كلمة المرور خاطئة!");
      }
      
      const userDoc = JSON.parse(text);
      if (userDoc.authVerifier !== authVerifier) {
        throw new Error("اسم المستخدم أو كلمة المرور خاطئة!");
      }
      
      // Decrypt conversations
      if (userDoc.encryptedData) {
        const decryptedStr = await decryptData(userDoc.encryptedData, passwordInput);
        const parsedConvs = JSON.parse(decryptedStr);
        const formattedConvs = parsedConvs.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
          persona: c.persona || "doctor",
        }));
        
        setConversations(formattedConvs);
        const savedActiveId = localStorage.getItem("dr_active_conv_id");
        if (savedActiveId && formattedConvs.some((c: any) => c.id === savedActiveId)) {
          setActiveConvId(savedActiveId);
        } else if (formattedConvs.length > 0) {
          setActiveConvId(formattedConvs[formattedConvs.length - 1].id);
        }
      }
      
      const session = { username: userDoc.username, secretKey: passwordInput };
      setCurrentUser(session);
      localStorage.setItem("dr_current_user", JSON.stringify(session));
      
      const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
      setLastSynced(timeStr);
      localStorage.setItem("dr_last_synced", timeStr);
      
      setAuthLoading(false);
      return { success: true };
    } catch (e: any) {
      setAuthLoading(false);
      return { success: false, error: e.message || "اسم المستخدم أو كلمة المرور خاطئة!" };
    }
  }, []);

  const signup = useCallback(async (usernameInput: string, passwordInput: string) => {
    setAuthLoading(true);
    try {
      const username = usernameInput.toLowerCase().trim();
      
      if (username.length < 3) {
        throw new Error("اسم المستخدم يجب أن يكون 3 حروف أو أكثر!");
      }
      if (passwordInput.length < 6) {
        throw new Error("كلمة المرور يجب أن تكون 6 خانات أو أكثر!");
      }
      
      const userHash = await sha256("ta3afi_user_" + username);
      const authVerifier = await sha256(userHash + passwordInput);
      
      // Check if user exists
      let userExists = false;
      try {
        const checkRes = await fetch(`/api/kv/user_${userHash}`);
        if (checkRes.ok) {
          const txt = await checkRes.text();
          if (txt && txt.trim() !== "") {
            userExists = true;
          }
        }
      } catch {}
      
      if (userExists) {
        throw new Error("اسم المستخدم هذا محجوز بالفعل! اختر اسماً آخر.");
      }
      
      // Encrypt current active conversations to seed their cloud storage
      const serialized = JSON.stringify(conversations);
      const encryptedData = await encryptData(serialized, passwordInput);
      
      const payload = {
        username: usernameInput.trim(),
        authVerifier,
        encryptedData
      };
      
      const res = await fetch(`/api/kv/user_${userHash}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error("فشلت عملية حفظ الحساب في قاعدة البيانات!");
      }
      
      const session = { username: usernameInput.trim(), secretKey: passwordInput };
      setCurrentUser(session);
      localStorage.setItem("dr_current_user", JSON.stringify(session));
      
      const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
      setLastSynced(timeStr);
      localStorage.setItem("dr_last_synced", timeStr);
      
      setAuthLoading(false);
      return { success: true };
    } catch (e: any) {
      setAuthLoading(false);
      return { success: false, error: e.message || "فشلت عملية إنشاء الحساب!" };
    }
  }, [conversations]);

  const logout = useCallback(() => {
    localStorage.removeItem("dr_current_user");
    localStorage.removeItem("dr_last_synced");
    setCurrentUser(null);
    setLastSynced("");
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setFontSize = useCallback((f: FontSize) => setFontSizeState(f), []);

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          const updated = {
            ...c,
            messages: [...c.messages, msg],
            updatedAt: new Date(),
          };
          if (msg.role === "user" && c.title === "محادثة جديدة") {
            updated.title = msg.content.slice(0, 40) + (msg.content.length > 40 ? "..." : "");
          }
          return updated;
        })
      );
    },
    [activeConvId]
  );

  const newConversation = useCallback((persona: "doctor" | "rafiq" = "doctor") => {
    const conv = createConversation(persona);
    setConversations((prev) => [...prev, conv]);
    setActiveConvId(conv.id);
    setSidebarOpen(false);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setSidebarOpen(false);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const conversationToDelete = prev.find(c => c.id === id);
        const personaToDelete = conversationToDelete?.persona || "doctor";
        const filtered = prev.filter((c) => c.id !== id);
        
        const samePersonaConvs = filtered.filter(c => (c.persona || "doctor") === personaToDelete);

        if (samePersonaConvs.length === 0) {
          const newConv = createConversation(personaToDelete);
          setActiveConvId(newConv.id);
          return [...filtered, newConv];
        }
        if (id === activeConvId) {
          setActiveConvId(samePersonaConvs[samePersonaConvs.length - 1].id);
        }
        return filtered;
      });
    },
    [activeConvId]
  );

  const switchPersona = useCallback((newPersona: "doctor" | "rafiq") => {
    setConversations(prev => {
        const activeConv = prev.find(c => c.id === activeConvId);
        
        // Find if there's already any conversation for this persona
        const existingConvForPersona = prev.find(c => (c.persona || "doctor") === newPersona);

        if (activeConv && activeConv.messages.length === 1 && activeConv.messages[0].id.startsWith("welcome-")) {
           // If we are currently on an empty conversation, we can just switch its persona if there's no other, or delete it and switch if there is
           if (existingConvForPersona) {
               // there is already one, so switch to it, but don't duplicate empty ones if possible. We'll just keep the empty one as is or remove it if we want. For simplicity, let's just let it be and select the existing one.
               setActiveConvId(existingConvForPersona.id);
               return prev;
           } else {
               // Update in place
               return prev.map(c => c.id === activeConvId ? {
                   ...c,
                   persona: newPersona,
                   messages: [createWelcomeMessage(newPersona)]
               } : c);
           }
        } else {
            if (existingConvForPersona) {
                // Switch to the most recent conversation of that persona
                const samePersonaConvs = prev.filter(c => (c.persona || "doctor") === newPersona);
                setActiveConvId(samePersonaConvs[samePersonaConvs.length - 1].id);
                return prev;
            } else {
                // Create a new one
                const conv = createConversation(newPersona);
                setActiveConvId(conv.id);
                return [...prev, conv];
            }
        }
    });
  }, [activeConvId]);

  const updateConversationTitle = useCallback(
    (id: string, newTitle: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() || "محادثة جديدة", updatedAt: new Date() } : c))
      );
    },
    []
  );

  return {
    conversations,
    activeConversation,
    activeConvId,
    theme,
    fontSize,
    sidebarOpen,
    setTheme,
    setFontSize,
    setSidebarOpen,
    addMessage,
    newConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    switchPersona,
    currentUser,
    lastSynced,
    authLoading,
    login,
    signup,
    logout,
  };
}
