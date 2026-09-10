/**
 * Suppress CSS transitions temporarily while switching themes to prevent
 * buttons and UI elements from flickering/morphing during theme transition.
 */
export function withTransitionSuppression(fn: () => void) {
  if (typeof document === "undefined") {
    fn();
    return;
  }
  const root = document.documentElement;
  root.classList.add("disable-transitions");
  fn();
  // Force synchronous reflow so new CSS variables take effect without transition interpolation
  void root.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("disable-transitions");
    });
  });
}
