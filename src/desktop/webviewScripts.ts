const CORE_UNREAD_COMPUTE_CODE = `
  function computeUnread() {
    try {
      // 1. Check title first (standard across Messenger, Zalo, Telegram, WhatsApp, Discord)
      const title = document.title || "";
      const titleMatch =
        title.match(/^[\\(\\[]\\s*(\\d+)\\+?\\s*[\\)\\]]/) ||
        title.match(/[\\(\\[]\\s*(\\d+)\\+?\\s*[\\)\\]]\\s*(?:Zalo|Messenger|Facebook|Đoạn chat|Chat)/i) ||
        title.match(/[\\(\\[](\\d+)\\+?[\\)\\]]/);

      if (titleMatch) {
        const parsed = parseInt(titleMatch[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          return Math.min(parsed, 999);
        }
      }

      const host = (window.location && window.location.hostname ? window.location.hostname : "").toLowerCase();

      function isVisible(el) {
        if (!el) return false;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        if (typeof window.getComputedStyle !== "function") return true;
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      }

      // 2. Specific detection for Zalo Web (chat.zalo.me, id.zalo.me)
      if (host.includes("zalo.me")) {
        // Helper to extract count from Zalo FontAwesome-style icon classes (e.g. fa-1, fa-2, fa-5_Plus, fa-1_24_Line, fa-5plus_24_Line)
        function extractZaloFaCount(root) {
          if (!root) return 0;
          const all = [root, ...(root.querySelectorAll ? root.querySelectorAll("*") : [])];
          for (const node of all) {
            const list = Array.from(node.classList || []);
            for (const cls of list) {
              const m = cls.match(/fa-(\\d+)(?:plus|_Plus|_(\\d+)_Line)?/i);
              if (m) {
                const val = parseInt(m[1], 10);
                if (Number.isFinite(val) && val > 0) {
                  if (cls.toLowerCase().includes("plus")) return Math.max(val, 6);
                  return val;
                }
              }
            }
          }
          return 0;
        }

        // A. Primary: Check message tab in left sidebar
        const navSelectors = [
          "[data-translate-title=\\"STR_TAB_MESSAGE\\"]",
          "[data-translate-title=\\"STR_TAB_CHAT\\"]",
          "[data-id=\\"div_Main_LeftMenu_Chat\\"]",
          "#nav-tab-chat",
          ".nav-tab-chat",
          "div[icon=\\"chat-menu\\"]",
          "div[class*=\\"nav-tab\\"][class*=\\"chat\\"]",
          "div[class*=\\"nav-tab\\"][class*=\\"message\\"]",
          "div.nav__tabs__top--item[icon*=\\"chat\\"]",
          ".nav__tabs__top--item:first-child"
        ];

        let navTab = null;
        for (const sel of navSelectors) {
          const found = document.querySelector(sel);
          if (found) { navTab = found; break; }
        }

        let sidebarCount = 0;
        if (navTab) {
          const badgeSelectors = [
            "[class*=\\"leftbar-unread-badge\\"]",
            ".z-noti-badge",
            "[class*=\\"z-noti-badge\\"]",
            "[class*=\\"noti-badge\\"]",
            ".v2-badge",
            "[class*=\\"v2-badge\\"]",
            ".tab-red-dot",
            ".badge-dot",
            "[class*=\\"red-dot\\"]",
            ".badge",
            "[class*=\\"badge\\"]"
          ];

          let badge = null;
          for (const bSel of badgeSelectors) {
            const b = navTab.querySelector(bSel);
            if (b && isVisible(b)) { badge = b; break; }
          }

          if (badge) {
            const fa = extractZaloFaCount(badge);
            if (fa > 0) {
              sidebarCount = fa;
            } else {
              const text = (badge.textContent || "").trim();
              if (text) {
                const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
                if (Number.isFinite(num) && num > 0) {
                  sidebarCount = text.includes("+") ? Math.max(num, 6) : num;
                } else if (text.includes("+")) {
                  sidebarCount = 6;
                }
              }
              if (sidebarCount === 0) {
                const aria = (badge.getAttribute && (badge.getAttribute("aria-label") || badge.getAttribute("title"))) || "";
                const m = aria.match(/(\\d+)/);
                if (m) sidebarCount = parseInt(m[1], 10);
              }
              if (sidebarCount === 0) {
                sidebarCount = 1;
              }
            }
          }
        }

        // B. Secondary: Check unread badges in conversation list (thread list)
        const threadSelectors = [
          ".conv-action__unread-v2",
          "[class*=\\"conv-action__unread\\"]",
          "[data-id=\\"chat-unread-count\\"]",
          ".conv-item [class*=\\"unread\\"]",
          ".conv-item [class*=\\"badge\\"]",
          "[class*=\\"conv-item\\"] [class*=\\"unread\\"]",
          "[class*=\\"conv-item\\"] [class*=\\"badge\\"]",
          "div[id^=\\"conv-item\\"] [class*=\\"badge\\"]",
          "div[data-id^=\\"div_ConversationList_Item\\"] [class*=\\"badge\\"]"
        ];

        let threadTotal = 0;
        const convBadges = document.querySelectorAll(threadSelectors.join(", "));
        if (convBadges.length > 0) {
          convBadges.forEach((el) => {
            if (!isVisible(el)) return;
            if (
              (el.matches && el.matches("[class*=\\"disable\\"]")) ||
              (el.closest && (el.closest("[class*=\\"disable\\"]") || el.closest("[class*=\\"mute\\"]")))
            ) return;

            const fa = extractZaloFaCount(el);
            if (fa > 0) {
              threadTotal += fa;
              return;
            }
            const text = (el.textContent || "").trim();
            if (text) {
              const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
              if (Number.isFinite(num) && num > 0) {
                threadTotal += text.includes("+") ? Math.max(num, 6) : num;
                return;
              }
            }
            threadTotal += 1;
          });
        }

        if (sidebarCount >= 5 && threadTotal > sidebarCount) {
          return Math.min(threadTotal, 999);
        }
        if (sidebarCount > 0) {
          return Math.min(sidebarCount, 999);
        }
        if (threadTotal > 0) {
          return Math.min(threadTotal, 999);
        }

        const anyRedDot = document.querySelector(".tab-red-dot, [class*=\\"tab-red-dot\\"], .badge-dot");
        if (anyRedDot && isVisible(anyRedDot)) return 1;

        return 0;
      }

      // 3. Specific detection for Facebook / Messenger (messenger.com, facebook.com)
      if (host.includes("messenger.com") || host.includes("facebook.com")) {
        // Navigation Chats tab badge
        const chatNav = document.querySelector(
          "[aria-label*=\\"Chats\\" i], [aria-label*=\\"Đoạn chat\\" i], [role=\\"navigation\\"] [role=\\"tab\\"]"
        );
        if (chatNav) {
          const navLabel = (chatNav.getAttribute && chatNav.getAttribute("aria-label")) || "";
          const labelMatch = navLabel.match(/(\\d+)\\s*(?:unread|chưa đọc)/i);
          if (labelMatch) {
            const n = parseInt(labelMatch[1], 10);
            if (Number.isFinite(n) && n > 0) return Math.min(n, 999);
          }
          const badge = chatNav.querySelector(
            "[aria-hidden=\\"true\\"], [data-visualcompletion=\\"ignore-dynamic\\"], span"
          );
          if (badge && isVisible(badge)) {
            const t = (badge.textContent || "").trim();
            const n = parseInt(t.replace(/[^0-9]/g, ""), 10);
            if (Number.isFinite(n) && n > 0) return Math.min(n, 999);
          }
        }

        // Count unread conversation rows in thread list
        const unreadMarkers = document.querySelectorAll(
          "[aria-label*=\\"unread\\" i], [aria-label*=\\"chưa đọc\\" i], [aria-label*=\\"Mark as read\\" i], [aria-label*=\\"Đánh dấu là đã đọc\\" i]"
        );
        let markerCount = 0;
        unreadMarkers.forEach((m) => {
          if (!isVisible(m)) return;
          const label = ((m.getAttribute && m.getAttribute("aria-label")) || "").toLowerCase();
          if (label.includes("mark all as read") || label.includes("đánh dấu tất cả là đã đọc")) return;
          markerCount++;
        });
        if (markerCount > 0) return Math.min(markerCount, 999);

        // Blue dot markers in thread list
        const blueDots = document.querySelectorAll(
          "[role=\\"grid\\"] [role=\\"row\\"] [style*=\\"background-color: var(--accent)\\"], [role=\\"grid\\"] [role=\\"row\\"] span.x14yjl9h"
        );
        let visibleBlueDots = 0;
        blueDots.forEach((d) => {
          if (isVisible(d)) visibleBlueDots++;
        });
        if (visibleBlueDots > 0) return Math.min(visibleBlueDots, 999);
      }

      // 4. Generic fallback for custom tabs (Telegram, Slack, Discord, WhatsApp, etc.)
      const genericBadges = document.querySelectorAll(
        "[aria-label*=\\"unread\\" i], [aria-label*=\\"chưa đọc\\" i], [data-testid*=\\"unread\\" i]"
      );
      if (genericBadges.length > 0) {
        let count = 0;
        genericBadges.forEach((el) => {
          if (!isVisible(el)) return;
          const text = (el.textContent || "").trim();
          const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
          count += (Number.isFinite(num) && num > 0) ? num : 1;
        });
        if (count > 0) return Math.min(count, 999);
      }

      return 0;
    } catch (e) {
      return 0;
    }
  }
`

export const UNREAD_PROBE = `(() => {
${CORE_UNREAD_COMPUTE_CODE}
  return computeUnread();
})()`

export const REALTIME_OBSERVER_SCRIPT = `(() => {
  if (window.__bubble_observer_installed__) return;
  window.__bubble_observer_installed__ = true;

${CORE_UNREAD_COMPUTE_CODE}

  let lastReported = -1;
  function report() {
    const count = computeUnread();
    if (count !== lastReported) {
      lastReported = count;
      console.log("__BUBBLE_UNREAD__:" + count);
    }
  }

  try {
    const OrigNotification = window.Notification;
    if (OrigNotification) {
      window.Notification = function(title, options) {
        console.log("__BUBBLE_NOTIF__:" + (title || ""));
        setTimeout(report, 250);
        setTimeout(report, 1000);
        return new OrigNotification(title, options);
      };
      window.Notification.permission = OrigNotification.permission;
      window.Notification.requestPermission = OrigNotification.requestPermission.bind(OrigNotification);
    }
  } catch {}

})()`

export const AD_BLOCK_CSS = `
.video-ads,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay,
.ytp-ad-player-overlay-layout,
#masthead-ad,
ytd-display-ad-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-promoted-video-renderer,
ytd-banner-promo-renderer,
ytd-ad-slot-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
#player-ads,
tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model),
ytd-enforcement-message-view-model,
[data-testid="banner-ad"],
[data-testid="in-app-banner"],
[aria-label="Sponsored"],
.upgrade-button,
ins.adsbygoogle,
[id^="google_ads_"],
div[data-google-query-id] {
  display: none !important;
}
`

export const AD_BLOCK_SCRIPT = `(() => {
  if (window.__bubbleAdBlockActive) return;
  window.__bubbleAdBlockActive = true;

  const isYouTube = location.hostname.includes("youtube.com") || location.hostname.includes("youtu.be");
  const isSpotify = location.hostname.includes("spotify.com");

  if (isYouTube) {
    let userPaused = false;
    let lastKnownVideoId = "";
    let trackedVideo = null;
    let observedPlayer = null;
    let playerObserver = null;
    let adCheckTimer = null;
    let adMediaState = null;

    function getVideoId() {
      const m = location.search.match(/[?&]v=([^&]+)/);
      return m ? m[1] : "";
    }

    function ensurePlaying() {
      if (userPaused) return;
      if (!location.pathname.startsWith("/watch")) return;

      const player = document.querySelector("#movie_player, .html5-video-player");
      const video = document.querySelector("video");
      if (!video) return;

      const isAd = Boolean(
        (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) ||
        document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
      );

      // Don't force the main video to play while an ad is active.
      if (isAd) return;

      // Check player state: -1 (unstarted), 2 (paused), 5 (video cued)
      let pState = null;
      if (player && typeof player.getPlayerState === "function") {
        try { pState = player.getPlayerState(); } catch {}
      }

      if (video.ended) return;

      // If paused or unstarted:
      if (video.paused || pState === -1 || pState === 2 || pState === 5) {
        if (!video.ended && video.readyState >= 1) {
          if (player && typeof player.playVideo === "function") {
            try { player.playVideo(); } catch {}
          }
          if (video.paused) {
            const p = video.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => {});
            }
          }
        }
      }
    }

    function observePlayer(player) {
      if (!player || player === observedPlayer) return;
      playerObserver?.disconnect();
      observedPlayer = player;
      playerObserver = new MutationObserver(() => {
        if (adCheckTimer) return;
        adCheckTimer = setTimeout(() => {
          adCheckTimer = null;
          handleYouTube();
        }, 100);
      });
      playerObserver.observe(player, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    function handleYouTube() {
      try {
        const player = document.querySelector("#movie_player, .html5-video-player");
        const video = document.querySelector("video");
        observePlayer(player);

        if (video && video !== trackedVideo) {
          trackedVideo = video;
          video.addEventListener("loadedmetadata", () => {
            for (const delay of [100, 500, 1200]) {
              setTimeout(handleYouTube, delay);
            }
          });
          video.addEventListener("canplay", () => {
            if (!userPaused && video.paused && !video.ended) ensurePlaying();
          });
        }

        // 1. Detect if video ID changed (transitioned to next track/song)
        const currentId = getVideoId();
        if (currentId && currentId !== lastKnownVideoId) {
          lastKnownVideoId = currentId;
          userPaused = false; // Reset paused state for the new track
          ensurePlaying();
        }

        // 2. Reliable YouTube ad detection
        const isAdShowing = Boolean(
          (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) ||
          document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
        );

        // 3. Trigger skip buttons and player.skipAd API
        if (isAdShowing) {
          if (player && typeof player.skipAd === "function") {
            try { player.skipAd(); } catch {}
          }
          const skipSelectors = [
            ".ytp-ad-skip-button",
            ".ytp-ad-skip-button-modern",
            ".ytp-skip-ad-button",
            ".ytp-ad-skip-button-slot button",
            "button[id^='skip-button']",
            ".ytp-ad-overlay-close-button",
            ".ytp-ad-skip-button-container button"
          ];
          for (const sel of skipSelectors) {
            const btn = document.querySelector(sel);
            if (btn && typeof btn.click === "function") {
              btn.click();
              break;
            }
          }
          if (video) {
            if (!adMediaState) {
              adMediaState = { muted: video.muted, playbackRate: video.playbackRate };
            }
            video.muted = true;
            video.playbackRate = 16;
          }
        } else if (video && adMediaState) {
          video.muted = adMediaState.muted;
          video.playbackRate = adMediaState.playbackRate;
          adMediaState = null;
        }

        // 4. Auto-dismiss "Video paused. Continue watching?" dialogs
        const confirmBtn = document.querySelector(
          "yt-confirm-dialog-renderer #confirm-button button, ytd-popup-container #confirm-button button"
        );
        if (confirmBtn && typeof confirmBtn.click === "function") {
          confirmBtn.click();
          ensurePlaying();
        }

        // 5. Dismiss anti-adblock enforcement dialogs
        const dialog = document.querySelector("tp-yt-paper-dialog:has(ytd-enforcement-message-view-model), ytd-enforcement-message-view-model");
        if (dialog) {
          dialog.remove();
          const backdrop = document.querySelector("tp-yt-iron-overlay-backdrop");
          if (backdrop) backdrop.remove();
          ensurePlaying();
        }
        const dismissBtn = document.querySelector("ytd-enforcement-message-view-model #dismiss-button button");
        if (dismissBtn && typeof dismissBtn.click === "function") {
          dismissBtn.click();
          ensurePlaying();
        }
      } catch {}
    }

    // Record user pause before YouTube changes the media state.
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof Element && target.closest(".ytp-play-button, video")) {
        const video = document.querySelector("video");
        if (video) userPaused = !video.paused;
      }
    }, true);

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
        const video = document.querySelector("video");
        if (video) userPaused = !video.paused;
      }
    }, true);

    handleYouTube();
    setInterval(handleYouTube, 1500);

    const recheckDelays = [100, 500, 1500];
    function triggerRecheck() {
      for (const d of recheckDelays) {
        setTimeout(handleYouTube, d);
      }
    }

    window.addEventListener("yt-navigate-finish", triggerRecheck);
    window.addEventListener("yt-page-data-updated", triggerRecheck);
  }

  if (isSpotify) {
    function handleSpotify() {
      try {
        const trackInfo = document.querySelector("[data-testid='now-playing-widget'], [data-testid='context-item-info']");
        const isAd = trackInfo && /advertisement|quảng cáo/i.test(trackInfo.textContent || "");
        if (isAd) {
          const skipForward = document.querySelector("[data-testid='control-button-skip-forward']");
          if (skipForward && typeof skipForward.click === "function") {
            skipForward.click();
          }
          const audio = document.querySelector("audio");
          if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = audio.duration;
          }
        }
      } catch {}
    }
    setInterval(handleSpotify, 2000);
  }
})()`
