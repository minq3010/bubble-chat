type IconProps = { className?: string; size?: number };

export function MessengerIcon({ className, size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="msgr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--messenger)" />
          <stop offset="1" stopColor="var(--messenger-2)" />
        </linearGradient>
      </defs>
      <path
        fill="url(#msgr-grad)"
        d="M12 2C6.2 2 2 6.24 2 11.85c0 2.94 1.2 5.5 3.16 7.28.16.15.26.36.27.58l.05 1.8c.02.57.6.94 1.13.71l2-.88c.17-.08.36-.09.54-.05 1.03.28 2.13.44 3.2.44 5.8 0 10-4.24 10-9.85S17.8 2 12 2Z"
      />
      <path
        fill="var(--card)"
        d="m6 15.06 2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.18.69.63l-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63Z"
      />
    </svg>
  );
}

export function ZaloIcon({ className, size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--zalo)" />
      <path
        fill="var(--card)"
        d="M7.4 8.3h4.3c.4 0 .6.45.36.77L9.1 13.2h3.02a.5.5 0 0 1 0 1H7.3c-.4 0-.62-.46-.37-.78l2.96-4.12H7.4a.5.5 0 0 1 0-1Z"
      />
      <path
        fill="var(--card)"
        d="M13.7 8.6a.5.5 0 0 1 1 0v5.1a.5.5 0 0 1-1 0V8.6Zm2 2.9a2.05 2.05 0 1 1 4.1 0 2.05 2.05 0 0 1-4.1 0Zm1 0a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0Z"
      />
    </svg>
  );
}

export function AppIcon({ className, size = 24, round = false }: IconProps & { round?: boolean }) {
  return <img src={`${import.meta.env.BASE_URL}bubble-chat-icon.png`} width={size} height={size} className={`${round ? "rounded-full" : ""} ${className || ""}`} aria-hidden="true" />;
}
