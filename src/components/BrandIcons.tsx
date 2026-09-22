type IconProps = {
  className?: string
  size?: number
}

export const bubbleIconNames = [
  "default",
  "message",
  "spark",
  "heart",
  "bolt",
] as const

export type BubbleIconName = typeof bubbleIconNames[number]

type BubbleIconProps = IconProps & {
  name?: BubbleIconName
  round?: boolean
}

export function MessengerIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
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
  )
}

export function ZaloIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
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
  )
}

export function AppIcon({
  className,
  size = 24,
  round = false,
}: IconProps & { round?: boolean }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}bubble-chat-icon.png`}
      width={size}
      height={size}
      className={`select-none ${
        round ? "rounded-full" : ""
      } ${className || ""}`}
      draggable={false}
      alt="Bubble Chat"
      aria-hidden="true"
    />
  )
}

export function BubbleIcon({
  name = "default",
  className,
  size = 24,
  round = true,
}: BubbleIconProps) {
  if (name === "default") {
    return <AppIcon size={size} round={round} className={className} />
  }

  const paths = {
    message: (
      <>
        <path d="M12 3c-5.1 0-9 3.32-9 7.8 0 2.54 1.38 4.8 3.63 6.2L6 20.5l3.45-1.76c.81.2 1.66.3 2.55.3 5.1 0 9-3.32 9-7.8S17.1 3 12 3Z" />
        <circle cx="8.5" cy="10.8" r="1" fill="currentColor" />
        <circle cx="12" cy="10.8" r="1" fill="currentColor" />
        <circle cx="15.5" cy="10.8" r="1" fill="currentColor" />
      </>
    ),
    spark: (
      <path d="m12 2 1.85 6.15L20 10l-6.15 1.85L12 18l-1.85-6.15L4 10l6.15-1.85L12 2Zm7.1 14.2.82 2.08L22 19.1l-2.08.82L19.1 22l-.82-2.08-2.08-.82 2.08-.82.82-2.08Z" />
    ),
    heart: (
      <path d="M12 20.5 4.7 13.6A5.15 5.15 0 0 1 12 6.2a5.15 5.15 0 0 1 7.3 7.4L12 20.5Z" />
    ),
    bolt: <path d="M13.45 2 5 13h5.7L9.55 22 19 10.2h-5.8L13.45 2Z" />,
  }[name]

  const colors = {
    message: "linear-gradient(135deg,#0a7cff,#6f4bff)",
    spark: "linear-gradient(135deg,#f59e0b,#ef4444)",
    heart: "linear-gradient(135deg,#ec4899,#ef4444)",
    bolt: "linear-gradient(135deg,#14b8a6,#0ea5e9)",
  }[name]

  return (
    <span
      className={`grid place-items-center overflow-hidden select-none ${
        round ? "rounded-full" : ""
      } ${className || ""}`}
      style={{ width: size, height: size, background: colors }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="white"
      >
        {paths}
      </svg>
    </span>
  )
}

export function YoutubeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="#FF0000"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export function TiktokIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="#FE2C55"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.05.86.13V9.36a6.38 6.38 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75c1.47 1.05 3.27 1.67 5.22 1.67V6.97a4.83 4.83 0 0 1-1.46-.28z" />
    </svg>
  )
}

export function SpotifyIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="#1DB954"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
