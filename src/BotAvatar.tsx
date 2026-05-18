export default function BotAvatar({ size = 40, isDoctor = true }: { size?: number, isDoctor?: boolean }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="av-bg" x1="0%" y1="0%" x2="100%" y2="100%">
             {isDoctor ? (
                <>
                  <stop offset="0%" stopColor="#1a1a2e" />
                  <stop offset="100%" stopColor="#16213e" />
                </>
             ) : (
                <>
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#172554" />
                </>
             )}
          </linearGradient>
          <linearGradient id="av-cross" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </linearGradient>
          <linearGradient id="av-heart" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ee5a24" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#av-bg)" />
        {isDoctor ? (
           <>
             {/* Medical cross */}
             <rect x="40" y="22" width="20" height="56" rx="4" fill="url(#av-cross)" opacity="0.95" />
             <rect x="22" y="40" width="56" height="20" rx="4" fill="url(#av-cross)" opacity="0.95" />
             {/* Heart pulse on cross */}
             <path
               d="M 35 50 L 42 50 L 45 42 L 50 58 L 55 42 L 58 50 L 65 50"
               fill="none"
               stroke="url(#av-heart)"
               strokeWidth="3"
               strokeLinecap="round"
               strokeLinejoin="round"
             />
           </>
        ) : (
           <>
              {/* Smiling face for friend */}
              <circle cx="35" cy="40" r="6" fill="#ffffff" />
              <circle cx="65" cy="40" r="6" fill="#ffffff" />
              <path
                d="M 30 60 Q 50 75 70 60"
                fill="none"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinecap="round"
              />
           </>
        )}
      </svg>
    </div>
  );
}
