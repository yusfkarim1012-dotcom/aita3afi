import { useState, useRef, useCallback } from "react";
import { X, Plus, Clipboard, Eye, EyeOff, Play, Check, AlertCircle, Loader2 } from "lucide-react";

interface KeyChipsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxKeys?: number;
  label: string;
  palette: {
    bg: string;
    card: string;
    border: string;
    text: string;
    text2: string;
    accent: string;
    accentLight: string;
    accentText: string;
  };
  dark: boolean;
  onTestKey?: (key: string) => Promise<{ success: boolean; message: string }>;
}

export default function KeyChipsInput({
  value,
  onChange,
  placeholder = "أدخل المفتاح هنا...",
  maxKeys = 100,
  label,
  palette: P,
  dark,
  onTestKey,
}: KeyChipsInputProps) {
  const [newKey, setNewKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const [testingIndex, setTestingIndex] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const keys = value
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k !== "");

  const updateKeys = useCallback(
    (newKeys: string[]) => {
      onChange(newKeys.join("\n"));
      setTestResults({}); // Clear test results when keys list changes
    },
    [onChange]
  );

  const addKey = () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;

    // Support pasting multiple keys at once (newline or comma separated)
    const incoming = trimmed
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k !== "");
    const combined = [...keys, ...incoming].slice(0, maxKeys);
    updateKeys(combined);
    setNewKey("");
    inputRef.current?.focus();
  };

  const removeKey = (index: number) => {
    const newKeys = keys.filter((_, i) => i !== index);
    updateKeys(newKeys);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const incoming = text
          .split(/[\n,]+/)
          .map((k) => k.trim())
          .filter((k) => k !== "");
        const combined = [...keys, ...incoming].slice(0, maxKeys);
        updateKeys(combined);
      }
    } catch {
      // Clipboard API might not be available, fallback
      inputRef.current?.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKey();
    }
  };

  const handleTest = async (key: string, index: number) => {
    if (testingIndex !== null) return;
    setTestingIndex(index);
    try {
      const res = await onTestKey!(key);
      setTestResults((prev) => ({ ...prev, [index]: res }));
      if (res.success) {
        alert(`✅ ${res.message}`);
      } else {
        alert(`❌ ${res.message}`);
      }
    } catch (err: any) {
      const errMsg = err.message || String(err);
      setTestResults((prev) => ({ ...prev, [index]: { success: false, message: errMsg } }));
      alert(`❌ کێشەیەک ڕوویدا لە کاتی تاقیکردنەوەی کلیلەکە:\n${errMsg}`);
    } finally {
      setTestingIndex(null);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 16)) + key.slice(-4);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-[12px] font-bold"
          style={{ color: P.text2, fontFamily: "'Noto Kufi Arabic'" }}
        >
          {label}
        </label>
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: keys.length > 0
                ? dark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)"
                : dark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
              color: keys.length > 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {keys.length}/{maxKeys}
          </span>
        </div>
      </div>

      {/* Chips Container */}
      <div
        className="rounded-2xl p-2.5 min-h-[60px] transition-all"
        style={{
          background: P.card,
          border: `1px solid ${P.border}`,
        }}
      >
        {/* Toggle visibility + paste row */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer hover:opacity-80"
            style={{
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              color: P.text2,
            }}
            type="button"
          >
            {showKeys ? <EyeOff size={11} /> : <Eye size={11} />}
            {showKeys ? "إخفاء" : "إظهار"}
          </button>
          <button
            onClick={handlePaste}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer hover:opacity-80"
            style={{
              background: dark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
              color: P.accentText,
            }}
            type="button"
          >
            <Clipboard size={11} />
            لصق
          </button>
        </div>

        {/* Key Chips */}
        {keys.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keys.map((key, i) => (
              <div
                key={i}
                className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-medium transition-all animate-fadeIn"
                style={{
                  background: focusedChip === i
                    ? dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)"
                    : dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${focusedChip === i
                    ? dark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"
                    : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                    }`,
                  color: P.text,
                  maxWidth: "100%",
                }}
                onMouseEnter={() => setFocusedChip(i)}
                onMouseLeave={() => setFocusedChip(null)}
              >
                <span
                  className="text-[9px] font-bold rounded-md px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    background: dark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                    color: P.accentText,
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="truncate select-all"
                  style={{
                    direction: "ltr",
                    maxWidth: onTestKey ? "calc(100% - 75px)" : "calc(100% - 50px)",
                    letterSpacing: showKeys ? "0" : "1px",
                  }}
                >
                  {showKeys ? key : maskKey(key)}
                </span>
                {onTestKey && (
                  <button
                    onClick={() => handleTest(key, i)}
                    disabled={testingIndex !== null}
                    className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer opacity-40 hover:opacity-100 disabled:opacity-20"
                    style={{
                      background: testResults[i]?.success
                        ? "rgba(34,197,94,0.15)"
                        : testResults[i]?.success === false
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(99,102,241,0.1)",
                      color: testResults[i]?.success
                        ? "#22c55e"
                        : testResults[i]?.success === false
                        ? "#ef4444"
                        : P.accentText,
                    }}
                    title="تاقیکردنەوەی کلیل"
                    type="button"
                  >
                    {testingIndex === i ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : testResults[i]?.success ? (
                      <Check size={10} />
                    ) : testResults[i]?.success === false ? (
                      <AlertCircle size={10} />
                    ) : (
                      <Play size={10} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => removeKey(i)}
                  className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer opacity-40 hover:opacity-100"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                  }}
                  type="button"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-4 text-[11px] font-medium"
            style={{ color: P.text2 }}
          >
            لا توجد مفاتيح حتى الآن. أضف مفتاحاً أدناه.
          </div>
        )}

        {/* Add Key Input */}
        {keys.length < maxKeys && (
          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-xl text-[11px] font-mono font-medium outline-none transition-all"
              style={{
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                color: P.text,
                direction: "ltr",
              }}
            />
            <button
              onClick={addKey}
              disabled={!newKey.trim()}
              className="px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: dark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
                color: "#22c55e",
              }}
              type="button"
            >
              <Plus size={12} />
              أضف
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
