const CORE_UNREAD_COMPUTE_CODE = `
  function computeUnread() {
    try {
      const host = (window.location && window.location.hostname ? window.location.hostname : "").toLowerCase();

      function isVisible(el) {
        if (!el) return false;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        if (typeof window.getComputedStyle !== "function") return true;
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      }

      // 1. Specific detection for Zalo Web (chat.zalo.me, id.zalo.me)
      // Count strictly by number of distinct unread conversations (people who messaged), NOT total message count
      if (host.includes("zalo.me")) {
        const threadSelectors = [
          ".conv-action__unread-v2",
          "[class*=\\"conv-action__unread\\"]",
          "[data-id=\\"chat-unread-count\\"]",
          ".conv-item [class*=\\"unread\\"]",
          ".conv-item [class*=\\"badge\\"]",
          "[class*=\\"conv-item\\"] [class*=\\"unread\\"]",
          "[class*=\\"conv-item\\"] [class*=\\"badge\\"]",
          ".conv-item[class*=\\"unread\\"]",
          "[class*=\\"conv-item\\"][class*=\\"unread\\"]",
          "div[id^=\\"conv-item\\"] [class*=\\"badge\\"]",
          "div[data-id^=\\"div_ConversationList_Item\\"] [class*=\\"badge\\"]"
        ];

        const unreadConvSet = new Set();
        const convBadges = document.querySelectorAll(threadSelectors.join(", "));
        convBadges.forEach((el) => {
          if (!isVisible(el)) return;
          if (
            (el.matches && el.matches("[class*=\\"disable\\"]")) ||
            (el.closest && (el.closest("[class*=\\"disable\\"]") || el.closest("[class*=\\"mute\\"]")))
          ) return;

          const convContainer = el.closest("div[id^='conv-item'], div[data-id^='div_ConversationList_Item'], .conv-item, [class*='conv-item'], [role='listitem']") || el;
          unreadConvSet.add(convContainer);
        });

        if (unreadConvSet.size > 0) {
          return Math.min(unreadConvSet.size, 999);
        }

        // Fallback: Check if message tab in left sidebar has unread badge/dot (at least 1 conversation unread)
        const navTab = document.querySelector(
          "[data-translate-title=\\"STR_TAB_MESSAGE\\"], [data-translate-title=\\"STR_TAB_CHAT\\"], [data-id=\\"div_Main_LeftMenu_Chat\\"], #nav-tab-chat, .nav-tab-chat, div[icon=\\"chat-menu\\"], div[class*=\\"nav-tab\\"][class*=\\"chat\\"], div[class*=\\"nav-tab\\"][class*=\\"message\\"], div.nav__tabs__top--item[icon*=\\"chat\\"], .nav__tabs__top--item:first-child"
        );
        if (navTab) {
          const badge = navTab.querySelector(
            "[class*=\\"leftbar-unread-badge\\"], .z-noti-badge, [class*=\\"z-noti-badge\\"], [class*=\\"noti-badge\\"], .v2-badge, [class*=\\"v2-badge\\"], .tab-red-dot, .badge-dot, [class*=\\"red-dot\\"], .badge, [class*=\\"badge\\"]"
          );
          if (badge && isVisible(badge)) {
            return 1;
          }
        }

        const anyRedDot = document.querySelector(".tab-red-dot, [class*=\\"tab-red-dot\\"], .badge-dot");
        if (anyRedDot && isVisible(anyRedDot)) return 1;

        return 0;
      }

      // 2. Check title for other providers (Messenger, Telegram, WhatsApp, Discord)
      const title = document.title || "";
      const titleMatch =
        title.match(/^[\\(\\[]\\s*(\\d+)\\+?\\s*[\\)\\]]/) ||
        title.match(/[\\(\\[]\\s*(\\d+)\\+?\\s*[\\)\\]]\\s*(?:Messenger|Facebook|Đoạn chat|Chat)/i) ||
        title.match(/[\\(\\[](\\d+)\\+?[\\)\\]]/);

      if (titleMatch) {
        const parsed = parseInt(titleMatch[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          return Math.min(parsed, 999);
        }
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
  let lastSnippetSignature = "";

  function cleanBidi(text) {
    return String(text || "").replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").trim();
  }

  function cleanNotificationPrefix(text, title) {
    let s = cleanBidi(text);
    const prefixRegex = /^(?:unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới)[:\uFF1A\s–—\-·]+/i;
    for (let i = 0; i < 3; i++) {
      const before = s;
      s = s.replace(prefixRegex, "").trim();
      if (title && s.toLowerCase().startsWith((title + ":").toLowerCase())) {
        s = s.slice(title.length + 1).trim();
      }
      if (title && s.toLowerCase().startsWith((title + "：").toLowerCase())) {
        s = s.slice(title.length + 1).trim();
      }
      if (s === before) break;
    }
    return s;
  }

  function extractAndSendLatestSnippet(silent = false) {
    try {
      const host = (window.location.hostname || "").toLowerCase();
      let payload = null;

      if (host.includes("zalo")) {
        const convNodes = Array.from(document.querySelectorAll(
          "div[id^='conv-item'], div[data-id^='div_ConversationList_Item'], .conv-item, [class*='conv-item'], [data-id*='ConvItem']"
        ));
        const unreadSelector = ".conv-action__unread-v2, [class*='conv-action__unread'], [data-id*='unread'], [class*='unread'], [class*='badge'], [class*='red-dot'], [class*='dot'], .v2-badge, .z-noti-badge, .badge, [data-id*='badge']";
        let target = convNodes.find(el => (el.matches && el.matches(unreadSelector)) || el.querySelector(unreadSelector));
        if (!target && convNodes.length > 0) target = convNodes[0];
        if (target) {
          const imgEl = target.querySelector("img");
          const icon = (imgEl && imgEl.src && imgEl.src.startsWith("http")) ? imgEl.src : "";

          let title = "";
          let body = "";

          const nameEl = target.querySelector(
            ".conv-item-title__name, [class*='title__name'], [class*='conv-item-title'], .conv-item-title, [class*='title'], [class*='name']"
          );
          if (nameEl) {
            title = cleanNotificationPrefix(nameEl.textContent || nameEl.getAttribute("aria-label") || nameEl.getAttribute("title") || "");
          }

          const msgEl = target.querySelector(
            ".conv-message, .conv-message__text, [class*='conv-message'], [class*='conv-item__message'], [class*='last-message'], [class*='snippet'], [class*='preview'], [class*='msg-info']"
          );
          if (msgEl) {
            body = cleanBidi(msgEl.textContent || msgEl.getAttribute("aria-label") || msgEl.getAttribute("title") || "");
          }

          // If body or title missing, gather all distinct visible text nodes
          if (!body || !title) {
            const spans = Array.from(target.querySelectorAll("span, p, div"))
              .map(el => (el.children.length === 0 ? cleanBidi(el.textContent) : ""))
              .filter(t => t.length > 0 && !/^(\\d+:\\d+|\\d+\\s*(phút|giờ|ngày|m|h|d|min|hr|day|days)|vừa xong|just now|\\d+\\+?)$/i.test(t));
            const unique = [];
            for (const s of spans) {
              if (!unique.includes(s)) unique.push(s);
            }
            if (!title && unique.length > 0) title = cleanNotificationPrefix(unique[0]);
            const bodyCandidates = title ? unique.filter(t => t !== title) : unique.slice(1);
            if (!body && bodyCandidates.length > 0) body = bodyCandidates.join(" ").trim();
          }

          body = cleanNotificationPrefix(body, title);

          if (title || body) {
            payload = {
              title: title || "Zalo",
              body: body || "",
              icon: icon
            };
          }
        }
      } else if (host.includes("messenger") || host.includes("facebook")) {
        const rows = Array.from(document.querySelectorAll(
          "[role='grid'] [role='row'], [role='listitem'], div[data-testid='mwthreadlist-item'], [aria-label*='Chats'] [role='row']"
        ));
        let unreadRow = rows.find(r => r.querySelector("[aria-label*='chưa đọc'], [aria-label*='unread'], [aria-label*='Unread']"));
        if (!unreadRow && rows.length > 0) unreadRow = rows[0];
        if (unreadRow) {
          const imgEl = unreadRow.querySelector("img");
          const icon = (imgEl && imgEl.src && imgEl.src.startsWith("http")) ? imgEl.src : "";

          const spans = Array.from(unreadRow.querySelectorAll("span[dir='auto'], span"))
            .map(s => cleanBidi(s.textContent))
            .filter(t => t.length > 0 && !/^(unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|\d+:\d+|\d+\s*(phút|giờ|ngày|m|h|d|min|hr|day|days)|vừa xong|just now|·)[:\uFF1A\s–—\-·]*$/i.test(t));

          const unique = [];
          for (const s of spans) {
            if (!unique.includes(s) && !unique.some(u => u.length > s.length && u.includes(s))) {
              unique.push(s);
            }
          }

          let title = unique.length > 0 ? cleanNotificationPrefix(unique[0]) : "Messenger";
          let body = unique.length > 1 ? unique.slice(1).join(" ").trim() : "";
          body = cleanNotificationPrefix(body, title);

          if (title || body) {
            payload = {
              title: title || "Messenger",
              body: body || "",
              icon: icon
            };
          }
        }
      }

      // Title fallback if conv list hasn't painted or had no body
      if (!payload || !payload.body) {
        const docTitle = document.title || "";
        const m = docTitle.match(/^[\\(\\[]\\s*\\d+\\+?\\s*[\\)\\]]\\s*(.*?)$/);
        if (m && m[1]) {
          const clean = m[1].replace(/[-–—|•]\s*(?:Zalo|Messenger|Facebook).*$/i, "").trim();
          if (clean.includes(": ")) {
            const parts = clean.split(/:\s+/);
            const titleFromDoc = parts[0].trim();
            const bodyFromDoc = parts.slice(1).join(": ").trim();
            if (bodyFromDoc) {
              payload = {
                title: titleFromDoc || (payload && payload.title) || (host.includes("zalo") ? "Zalo" : "Messenger"),
                body: bodyFromDoc,
                icon: (payload && payload.icon) || "",
              };
            }
          } else if (clean && (!payload || !payload.title || payload.title === "Zalo" || payload.title === "Messenger")) {
            if (!payload) payload = { title: clean, body: "", icon: "" };
            else payload.title = clean;
          }
        }
      }

      if (payload && (payload.title || payload.body)) {
        const sig = (payload.title || "") + "::" + (payload.body || "");
        if (silent) {
          lastSnippetSignature = sig;
          return;
        }
        if (sig !== lastSnippetSignature) {
          lastSnippetSignature = sig;
          console.log("__BUBBLE_NOTIFICATION_DATA__:" + JSON.stringify(payload));
        }
      }
    } catch {}
  }

  window.__bubble_extract_and_send = extractAndSendLatestSnippet;

  function report() {
    const count = computeUnread();
    if (count !== lastReported) {
      if (count > lastReported && count > 0) {
        setTimeout(extractAndSendLatestSnippet, 150);
        setTimeout(extractAndSendLatestSnippet, 600);
      }
      lastReported = count;
      console.log("__BUBBLE_UNREAD__:" + count);
    }
  }

  // 1. Hook audio playback: chime sounds accompany incoming messages on Zalo and Messenger
  try {
    const origAudioPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
      try {
        const dur = this.duration;
        if (!dur || dur < 5) {
          setTimeout(extractAndSendLatestSnippet, 150);
          setTimeout(report, 250);
        }
      } catch {}
      return origAudioPlay.apply(this, arguments);
    };
  } catch {}

  // 2. Watch for title changes
  try {
    let curTitle = document.title || "";
    setInterval(() => {
      if (document.title !== curTitle) {
        curTitle = document.title;
        report();
        if (/^[\\(\\[]\\s*\\d+\\+?\\s*[\\)\\]]/.test(curTitle)) {
          setTimeout(extractAndSendLatestSnippet, 150);
        }
      }
    }, 800);
  } catch {}

  // 3. Debounced DOM observer on body to detect chat updates
  try {
    let mutDebounce = null;
    const domObserver = new MutationObserver(() => {
      if (mutDebounce) return;
      mutDebounce = setTimeout(() => {
        mutDebounce = null;
        report();
        if ((window.location.hostname || "").toLowerCase().includes("zalo")) {
          extractAndSendLatestSnippet();
        }
      }, 400);
    });
    domObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  } catch {}

  // Prime the current row so existing unread messages do not look new.
  setTimeout(() => extractAndSendLatestSnippet(true), 800);

  // Zalo can update a background conversation without changing its badge/title.
  if ((window.location.hostname || "").toLowerCase().includes("zalo")) {
    setInterval(() => {
      report();
      extractAndSendLatestSnippet();
    }, 2000);
  }

  try {
    function parseNotificationPayload(title, options) {
      let titleStr = cleanBidi(title || "Tin nhắn mới");
      const rawBody = (options && options.body) ? cleanBidi(options.body) : "";
      let bodyStr = rawBody;
      const genericBody = /^(?:unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới)$/i.test(bodyStr);
      const genericTitle = /^(?:zalo|messenger|unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới)$/i.test(titleStr);

      if (genericTitle && bodyStr.includes(": ")) {
        const parts = bodyStr.split(/:\s+/);
        titleStr = parts[0].trim();
        bodyStr = parts.slice(1).join(": ").trim();
      } else {
        if (genericBody) bodyStr = "";
        if (!bodyStr && titleStr.includes(": ")) {
          const parts = titleStr.split(/:\s+/);
          titleStr = parts[0].trim();
          bodyStr = parts.slice(1).join(": ").trim();
        }
      }

      titleStr = cleanNotificationPrefix(titleStr);
      bodyStr = cleanNotificationPrefix(bodyStr, titleStr);

      return {
        title: titleStr || "Tin nhắn mới",
        body: bodyStr,
        icon: (options && options.icon) ? String(options.icon) : "",
      };
    }

    function FakeNotification(title, options) {
      try {
        const payload = parseNotificationPayload(title, options);
        console.log("__BUBBLE_NOTIFICATION_DATA__:" + JSON.stringify(payload));
      } catch {}
      console.log("__BUBBLE_NOTIF__:" + (title || ""));
      setTimeout(report, 250);
      setTimeout(report, 1000);

      this.title = String(title || "");
      this.body = options && options.body ? String(options.body) : "";
      this.icon = options && options.icon ? String(options.icon) : "";
      this.tag = options && options.tag ? String(options.tag) : "";
      this.data = (options && options.data) || null;
      this.onclick = null;
      this.onshow = null;
      this.onerror = null;
      this.onclose = null;

      setTimeout(() => {
        if (typeof this.onshow === "function") {
          try {
            this.onshow(new Event("show"));
          } catch {}
        }
        try {
          this.dispatchEvent(new Event("show"));
        } catch {}
      }, 20);

      return this;
    }

    try {
      FakeNotification.prototype = Object.create(EventTarget.prototype);
      FakeNotification.prototype.constructor = FakeNotification;
    } catch {
      FakeNotification.prototype = {};
    }

    FakeNotification.prototype.close = function() {
      if (typeof this.onclose === "function") {
        try {
          this.onclose(new Event("close"));
        } catch {}
      }
      try {
        this.dispatchEvent(new Event("close"));
      } catch {}
    };

    FakeNotification.prototype.addEventListener =
      FakeNotification.prototype.addEventListener || function() {};
    FakeNotification.prototype.removeEventListener =
      FakeNotification.prototype.removeEventListener || function() {};
    FakeNotification.prototype.dispatchEvent =
      FakeNotification.prototype.dispatchEvent ||
      function() {
        return true;
      };

    try {
      Object.defineProperty(FakeNotification, "permission", {
        get: () => "granted",
        set: () => {},
        configurable: true,
      });
    } catch {
      FakeNotification.permission = "granted";
    }

    FakeNotification.requestPermission = function(cb) {
      if (typeof cb === "function") {
        try {
          cb("granted");
        } catch {}
      }
      return Promise.resolve("granted");
    };

    FakeNotification.maxActions = 2;

    window.Notification = FakeNotification;

    if (navigator.permissions && navigator.permissions.query) {
      const origQuery = navigator.permissions.query;
      navigator.permissions.query = function(desc) {
        if (desc && desc.name === "notifications") {
          return Promise.resolve({ state: "granted", onchange: null });
        }
        return origQuery.apply(this, arguments);
      };
    }

    if (
      window.ServiceWorkerRegistration &&
      window.ServiceWorkerRegistration.prototype
    ) {
      window.ServiceWorkerRegistration.prototype.showNotification = function(
        title,
        options,
      ) {
        try {
          const payload = parseNotificationPayload(title, options);
          console.log("__BUBBLE_NOTIFICATION_DATA__:" + JSON.stringify(payload));
        } catch {}
        setTimeout(report, 250);
        return Promise.resolve();
      };
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
