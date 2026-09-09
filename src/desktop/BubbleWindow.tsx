import { useEffect, useRef, useState } from "react";
import FloatingBubble from "../components/FloatingBubble";
import { desktop } from "./bridge";
import { totalUnread, useUnreadCounts } from "../hooks/useUnreadCounts";

/**
 * Renderer for the transparent, always-on-top bubble window.
 * Distinguishes single clicks (to toggle panel) from dragging (to reposition bubble).
 */
export default function BubbleWindow() {
  const unreadCounts = useUnreadCounts();
  const unread = totalUnread(unreadCounts);
  const [theme, setTheme] = useState(() => localStorage.getItem("bubble.theme") || "Dark");
  const [size, setSize] = useState<"Small" | "Medium" | "Large">(() => {
    const value = localStorage.getItem("bubble.bubbleSize");
    return value === "Small" || value === "Large" ? value : "Medium";
  });

  const lastClickRef = useRef(0);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    const onAppearance = (event: Event) => {
      const value = (event as CustomEvent<{ key: string; value: string }>).detail;
      if (value.key === "bubble.theme") setTheme(value.value);
      if (
        value.key === "bubble.bubbleSize" &&
        (value.value === "Small" || value.value === "Medium" || value.value === "Large")
      ) {
        setSize(value.value);
      }
    };
    window.addEventListener("bubble:appearance", onAppearance);
    return () => window.removeEventListener("bubble:appearance", onAppearance);
  }, []);

  const triggerClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 150) return;
    lastClickRef.current = now;
    desktop()?.bubbleClick();
  };

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    isDraggingRef.current = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!startPosRef.current) return;
      const distance = Math.hypot(
        moveEvent.clientX - startPosRef.current.x,
        moveEvent.clientY - startPosRef.current.y
      );
      // Nâng ngưỡng kéo lên 14px để loại bỏ hoàn toàn rung ngón tay trên trackpad macOS
      if (distance > 14) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          desktop()?.bubbleDragStart();
        }
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        desktop()?.bubbleDragEnd();
      } else {
        triggerClick();
      }
      startPosRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div
      className={`${theme !== "Light" ? "dark" : ""} relative flex h-screen w-screen items-center justify-center bg-transparent select-none`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        desktop()?.showContextMenu();
      }}
    >
      <div onPointerDown={onPointerDown} className="cursor-grab active:cursor-grabbing">
        <FloatingBubble
          state={unread > 0 ? "unread" : "idle"}
          unread={unread}
          size={size}
        />
      </div>
    </div>
  );
}
