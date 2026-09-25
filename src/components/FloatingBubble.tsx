import { BubbleIcon, type BubbleIconName } from "./BrandIcons"

export type BubbleState = "idle" | "unread" | "dragging" | "snapped" | "active"

export type ProviderBadges = {
  messenger?: number
  zalo?: number
  custom?: number
}

const sizeMap = { Small: 46, Medium: 56, Large: 66 }

export default function FloatingBubble({
  state = "idle",
  size = "Medium",
  unread = 0,
  providerUnread,
  edge = "right",
  onClick,
  style,
  className = "",
  icon = "default",
}: {
  state?: BubbleState
  size?: keyof typeof sizeMap
  unread?: number
  providerUnread?: ProviderBadges
  edge?: "left" | "right"
  onClick?: () => void
  style?: React.CSSProperties
  className?: string
  icon?: BubbleIconName
}) {
  const px = sizeMap[size]
  const dragging = state === "dragging"
  const snapped = state === "snapped"
  const showBadge = unread > 0 && !dragging

  const messengerCount = providerUnread?.messenger || 0
  const zaloCount = providerUnread?.zalo || 0
  const customCount = providerUnread?.custom || 0
  const hasSplitBadges =
    showBadge && providerUnread && (messengerCount > 0 || zaloCount > 0)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open chat panel"
      className={`group relative grid shrink-0 place-items-center rounded-full outline-none transition-[transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        dragging
          ? "scale-105 cursor-grabbing"
          : snapped
            ? ""
            : unread > 0
              ? "cursor-pointer hover:scale-[1.06] active:scale-95"
              : "cursor-pointer hover:scale-[1.04] active:scale-95 animate-breathe"
      } ${className}`}
      style={{
        width: px,
        height: px,
        boxShadow: dragging
          ? "0 4px 14px rgba(0, 0, 0, 0.35)"
          : unread > 0
            ? "0 2px 12px rgba(220, 38, 38, 0.3), 0 2px 8px rgba(0, 0, 0, 0.22)"
            : "0 2px 8px rgba(0, 0, 0, 0.22)",
        opacity: snapped ? 0.9 : 1,
        transform: snapped
          ? `translateX(${edge === "right" ? 30 : -30}%)`
          : undefined,
        ...style,
      }}
    >
      {/* active ring */}
      {state === "active" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow:
              "0 0 0 2px var(--primary), 0 0 0 5px color-mix(in srgb, var(--primary) 22%, transparent)",
          }}
        />
      )}
      <span
        className="grid place-items-center overflow-hidden rounded-full select-none"
        style={{ width: px, height: px }}
      >
        <BubbleIcon name={icon} size={px} round className="h-full w-full" />
      </span>

      {/* Split provider badges — Messenger (top-right), Zalo (bottom-right) */}
      {hasSplitBadges ? (
        <>
          {messengerCount > 0 && (
            <span
              className={`absolute flex items-center justify-center rounded-full border-[1.5px] border-white font-bold text-white shadow-md dark:border-background animate-scale-in select-none ${
                messengerCount > 9
                  ? "h-[18px] min-w-[18px] px-1 text-[8px]"
                  : "h-[18px] w-[18px] text-[9px]"
              }`}
              style={{
                top: -3,
                right: -3,
                background: "linear-gradient(135deg, #00c6ff, #0078ff)",
              }}
              title={`Messenger: ${messengerCount}`}
            >
              {messengerCount > 99 ? "99+" : messengerCount}
            </span>
          )}
          {zaloCount > 0 && (
            <span
              className={`absolute flex items-center justify-center rounded-full border-[1.5px] border-white font-bold text-white shadow-md dark:border-background animate-scale-in select-none ${
                zaloCount > 9
                  ? "h-[18px] min-w-[18px] px-1 text-[8px]"
                  : "h-[18px] w-[18px] text-[9px]"
              }`}
              style={{
                bottom: -3,
                right: -3,
                background: "#0068ff",
              }}
              title={`Zalo: ${zaloCount}`}
            >
              {zaloCount > 99 ? "99+" : zaloCount}
            </span>
          )}
          {customCount > 0 && (
            <span
              className={`absolute flex items-center justify-center rounded-full border-[1.5px] border-white font-bold text-white shadow-md dark:border-background animate-scale-in select-none ${
                customCount > 9
                  ? "h-[18px] min-w-[18px] px-1 text-[8px]"
                  : "h-[18px] w-[18px] text-[9px]"
              }`}
              style={{
                top: -3,
                left: -3,
                background: "var(--primary)",
              }}
              title={`Custom: ${customCount}`}
            >
              {customCount > 99 ? "99+" : customCount}
            </span>
          )}
        </>
      ) : (
        /* Fallback: single combined badge */
        showBadge && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md dark:border-background animate-scale-in select-none ${
              unread > 9
                ? "h-5 min-w-5 px-1 text-[10px]"
                : "h-5 w-5 text-[11px]"
            }`}
            style={{ background: "var(--danger)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )
      )}

      {/* snapped edge hint */}
      {snapped && (
        <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-border-strong opacity-0 group-hover:opacity-100" />
      )}
    </button>
  )
}
