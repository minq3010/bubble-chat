import { AppIcon } from "./BrandIcons";

export type BubbleState = "idle" | "unread" | "dragging" | "snapped" | "active";

const sizeMap = { Small: 46, Medium: 56, Large: 66 };

export default function FloatingBubble({
  state = "idle",
  size = "Medium",
  unread = 0,
  edge = "right",
  onClick,
  style,
  className = "",
}: {
  state?: BubbleState;
  size?: keyof typeof sizeMap;
  unread?: number;
  edge?: "left" | "right";
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const px = sizeMap[size];
  const dragging = state === "dragging";
  const snapped = state === "snapped";
  const showBadge = unread > 0 && !dragging;

  return (
    <button
      onClick={onClick}
      aria-label="Open chat panel"
      className={`group relative grid shrink-0 place-items-center rounded-full outline-none transition-[transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        dragging ? "scale-110 cursor-grabbing" : "cursor-pointer hover:scale-[1.06] active:scale-95"
      } ${className}`}
      style={{
        width: px,
        height: px,
        boxShadow: dragging ? "var(--shadow-e3)" : "var(--shadow-e2)",
        opacity: snapped ? 0.9 : 1,
        transform: snapped ? `translateX(${edge === "right" ? 30 : -30}%)` : undefined,
        ...style,
      }}
    >
      {/* active ring */}
      {state === "active" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 2px var(--primary), 0 0 0 5px color-mix(in srgb, var(--primary) 22%, transparent)" }}
        />
      )}
      <span
        className="grid place-items-center rounded-full"
        style={{ width: px * 0.78, height: px * 0.78 }}
      >
        <AppIcon size={px * 0.78} round />
      </span>

      {showBadge && (
        <span
          className="absolute -top-0.5 -right-0.5 grid h-[20px] min-w-[20px] place-items-center rounded-full border-2 px-1 font-mono text-[10px] font-bold text-white"
          style={{ background: "var(--danger)", borderColor: "transparent" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}

      {/* snapped edge hint */}
      {snapped && (
        <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-border-strong opacity-0 group-hover:opacity-100" />
      )}
    </button>
  );
}
