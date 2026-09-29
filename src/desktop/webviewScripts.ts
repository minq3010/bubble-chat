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

  function isGenericLabel(str) {
    const s = cleanBidi(str).toLowerCase().trim();
    if (!s) return true;
    if (/[:\uFF1A]/.test(s)) return false;
    return (
      /^(?:zalo|messenger|facebook|đoạn chat|chat|tin nhắn mới|các tin nhắn mới|tin mới|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|chưa đọc|new messages?|unread messages?|unseen messages?|unread)(?:[:\uFF1A\s–—\-·•|/()\[\]]*|\s*\d+\+?|\d+\s*)*$/i.test(s) ||
      /^(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)$/i.test(s)
    );
  }

  function cleanNotificationText(text, title = "") {
    let s = cleanBidi(text);
    if (!s) return "";
    if (isGenericLabel(s)) return "";

    const prefixRegex =
      /^(?:(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)(?:\s+(?:from|từ)\s+[^:\uFF1A–—\-·•\n]+)?(?:[:\uFF1A–—\-·•|/]+|\s+))/i;
    const suffixRegex =
      /[:\uFF1A\s–—\-·•|/()\[\]]*(?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|tin mới|chưa đọc)$/i;
    const bracketedRegex =
      /(?:^|\s)[\(\[\{](?:\(?\d+\+?\)?\s*)?(?:unread messages?|new messages?|unseen messages?|unread|tin nhắn chưa đọc|các tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|chưa đọc)[\)\]\}][:\uFF1A\s–—\-·•]*/gi;

    for (let i = 0; i < 5; i++) {
      const before = s;
      s = s.replace(bracketedRegex, " ").trim();
      s = s.replace(prefixRegex, "").trim();
      s = s.replace(suffixRegex, "").trim();

      if (title) {
        const cleanT = cleanBidi(title).toLowerCase();
        if (cleanT && !isGenericLabel(cleanT)) {
          const sLower = s.toLowerCase();
          if (sLower.startsWith(cleanT)) {
            const rest = s.slice(cleanT.length);
            if (/^[:\uFF1A\s–—\-·•|/]+/.test(rest)) {
              s = rest.replace(/^[:\uFF1A\s–—\-·•|/]+/, "").trim();
            }
          }
        }
      }
      if (s === before) break;
    }
    if (isGenericLabel(s)) return "";
    return s;
  }

  function resolveNotificationTitleAndBody(rawTitle, rawBody, fallbackProvider = "Messenger") {
    let title = cleanNotificationText(rawTitle || "");
    let body = cleanNotificationText(rawBody || "", title);

    if (!title || isGenericLabel(title)) {
      const sepMatch = body.match(/^([^:\uFF1A–—\-·•\n]{1,40})[:\uFF1A–—\-·•]\s*(.+)$/);
      if (sepMatch && !isGenericLabel(sepMatch[1])) {
        title = cleanNotificationText(sepMatch[1]);
        body = cleanNotificationText(sepMatch[2], title);
      } else {
        title = "";
      }
    }

    if (!body && title) {
      const sepMatch = title.match(/^([^:\uFF1A–—\-·•\n]{1,40})[:\uFF1A–—\-·•]\s*(.+)$/);
      if (sepMatch && !isGenericLabel(sepMatch[1])) {
        title = cleanNotificationText(sepMatch[1]);
        body = cleanNotificationText(sepMatch[2], title);
      }
    }

    if (isGenericLabel(title)) title = "";
    if (isGenericLabel(body)) body = "";

    return {
      title: title || fallbackProvider,
      body: body,
    };
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
            title = cleanNotificationText(nameEl.textContent || nameEl.getAttribute("aria-label") || nameEl.getAttribute("title") || "");
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
            if (!title && unique.length > 0) title = cleanNotificationText(unique[0]);
            const bodyCandidates = title ? unique.filter(t => t !== title) : unique.slice(1);
            if (!body && bodyCandidates.length > 0) body = bodyCandidates.join(" ").trim();
          }

          const res = resolveNotificationTitleAndBody(title, body, "Zalo");
          title = res.title;
          body = res.body;

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
            .map(s => cleanNotificationText(s.textContent))
            .filter(t => t.length > 0 && !isGenericLabel(t) && !/^(\d+:\d+|\d+\s*(phút|giờ|ngày|m|h|d|min|hr|day|days)|vừa xong|just now|·)$/i.test(t));

          const unique = [];
          for (const s of spans) {
            if (!unique.includes(s) && !unique.some(u => u.length > s.length && u.includes(s))) {
              unique.push(s);
            }
          }

          let rawTitle = "";
          let rawBody = "";
          if (unique.length === 1) {
            if (unique[0].length > 20 || /[\.\,\?\!\;]/.test(unique[0]) || unique[0].includes(" ")) {
              rawBody = unique[0];
              rawTitle = "Messenger";
            } else {
              rawTitle = unique[0];
            }
          } else if (unique.length > 1) {
            rawTitle = unique[0];
            rawBody = unique.slice(1).join(" ").trim();
          }

          const res = resolveNotificationTitleAndBody(rawTitle, rawBody, "Messenger");
          let title = res.title;
          let body = res.body;

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
        const m = docTitle.match(/^[\(\[]\s*\d+\+?\s*[\)\]]\s*(.*?)$/);
        if (m && m[1]) {
          const clean = m[1].replace(/[-–—|•]\s*(?:Zalo|Messenger|Facebook).*$/i, "").trim();
          let titleCand = "";
          let bodyCand = "";
          if (clean.includes(": ")) {
            const parts = clean.split(/:\s+/);
            titleCand = parts[0].trim();
            bodyCand = parts.slice(1).join(": ").trim();
          } else {
            titleCand = clean;
          }
          const hostProvider = host.includes("zalo") ? "Zalo" : "Messenger";
          const res = resolveNotificationTitleAndBody(titleCand, bodyCand, hostProvider);
          if (res.body || res.title) {
            payload = {
              title: res.title || (payload && payload.title) || hostProvider,
              body: res.body || (payload && payload.body) || "",
              icon: (payload && payload.icon) || "",
            };
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
      const host = (window.location.hostname || "").toLowerCase();
      const defaultProvider = host.includes("zalo") ? "Zalo" : (host.includes("messenger") || host.includes("facebook") ? "Messenger" : "Tin nhắn mới");
      const res = resolveNotificationTitleAndBody(title || "", (options && options.body) || "", defaultProvider);
      return {
        title: res.title || defaultProvider,
        body: res.body || "",
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

    try {
      const styleId = "__bubble_yt_adblock_css";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = ".ytp-ad-overlay-container, .ytp-ad-message-container, ytd-banner-promo-renderer, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, #masthead-ad, ytd-rich-item-renderer:has(ytd-ad-slot-renderer), .ad-showing .html5-video-container { visibility: hidden !important; }";
        (document.head || document.documentElement).appendChild(style);
      }
    } catch {}

    // 1. Sanitize YouTube player response to remove mid-roll and pre-roll ad schedules at source (uBlock Origin pattern)
    function freezeConstant(obj, prop, val) {
      try {
        Object.defineProperty(obj, prop, {
          configurable: true,
          enumerable: true,
          get() { return val; },
          set() { /* freeze constant */ },
        });
      } catch {
        try { delete obj[prop]; } catch {}
      }
    }

    function sanitizePlayerResponse(obj) {
      if (!obj || typeof obj !== "object") return obj;
      freezeConstant(obj, "adPlacements", undefined);
      freezeConstant(obj, "adSlots", undefined);
      freezeConstant(obj, "playerAds", undefined);
      freezeConstant(obj, "adBreakHeartbeatParams", undefined);
      if (obj.playerResponse && typeof obj.playerResponse === "object") {
        sanitizePlayerResponse(obj.playerResponse);
      }
      return obj;
    }

    try {
      if (window.ytInitialPlayerResponse) {
        sanitizePlayerResponse(window.ytInitialPlayerResponse);
      }
      let currentYtInitialPlayerResponse = window.ytInitialPlayerResponse;
      Object.defineProperty(window, "ytInitialPlayerResponse", {
        configurable: true,
        enumerable: true,
        get() {
          return currentYtInitialPlayerResponse;
        },
        set(val) {
          currentYtInitialPlayerResponse = sanitizePlayerResponse(val);
        },
      });
    } catch {}

    try {
      if (window.playerResponse) {
        sanitizePlayerResponse(window.playerResponse);
      }
      let currentYtPlayerResponse = window.playerResponse;
      Object.defineProperty(window, "playerResponse", {
        configurable: true,
        enumerable: true,
        get() {
          return currentYtPlayerResponse;
        },
        set(val) {
          currentYtPlayerResponse = sanitizePlayerResponse(val);
        },
      });
    } catch {}

    // Intercept fetch for SPA navigation and player updates
    if (typeof window.fetch === "function") {
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
        const response = await origFetch.apply(this, args);
        if (typeof url === "string" && (url.includes("/youtubei/v1/player") || url.includes("/get_video_info"))) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            const data = JSON.parse(text);
            if (data && (data.adPlacements || data.adSlots || data.playerAds)) {
              sanitizePlayerResponse(data);
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }
          } catch {}
        }
        return response;
      };
    }

    // Intercept XMLHttpRequest for player data
    if (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype) {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__bubbleUrl = url;
        return origOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function(...args) {
        if (typeof this.__bubbleUrl === "string" && this.__bubbleUrl.includes("/youtubei/v1/player")) {
          this.addEventListener("readystatechange", function() {
            if (this.readyState === 4 && this.status === 200) {
              try {
                const data = JSON.parse(this.responseText);
                if (data && (data.adPlacements || data.adSlots || data.playerAds)) {
                  sanitizePlayerResponse(data);
                  const modified = JSON.stringify(data);
                  Object.defineProperty(this, "responseText", { value: modified });
                  Object.defineProperty(this, "response", { value: modified });
                }
              } catch {}
            }
          });
        }
        return origSend.apply(this, args);
      };
    }

    function getVideoId() {
      const m = location.search.match(/[?&]v=([^&]+)/);
      return m ? m[1] : "";
    }

    function ensurePlaying() {
      if (userPaused) return;
      if (!location.pathname.startsWith("/watch") && !location.pathname.startsWith("/shorts")) return;

      const player = document.querySelector("#movie_player, .html5-video-player");
      const video = document.querySelector("video");
      if (!video) return;

      const isAd = Boolean(
        (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) ||
        document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
      );

      // Don't force the main video to play while an ad is active.
      if (isAd) return;

      // Click YouTube large center play button if present
      const bigPlay = document.querySelector(".ytp-large-play-button");
      if (bigPlay && (bigPlay.offsetWidth > 0 || bigPlay.offsetHeight > 0)) {
        try { bigPlay.click(); } catch {}
      }

      // Check player state: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
      let pState = null;
      if (player && typeof player.getPlayerState === "function") {
        try { pState = player.getPlayerState(); } catch {}
      }

      // YouTube playerState 0 means the main video has genuinely ended.
      // Also verify if video.ended is true and currentTime is actually at the end of the duration.
      const isTrulyEnded = (pState === 0) || (video.ended && Number.isFinite(video.duration) && video.duration > 2 && video.currentTime >= video.duration - 0.5);
      if (isTrulyEnded) return;

      // If currentTime was mistakenly sought to end during ad transition, recover it:
      if (pState !== 0 && video.ended && Number.isFinite(video.duration) && video.duration > 10 && video.currentTime >= video.duration - 0.5) {
        try { video.currentTime = 0; } catch {}
      }

      // If paused or unstarted:
      if (video.paused || pState === -1 || pState === 2 || pState === 5) {
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

    function observePlayer(player) {
      if (!player || player === observedPlayer) return;
      playerObserver?.disconnect();
      observedPlayer = player;
      playerObserver = new MutationObserver(() => {
        if (adCheckTimer) return;
        adCheckTimer = setTimeout(() => {
          adCheckTimer = null;
          handleYouTube();
        }, 50);
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
            for (const delay of [50, 200, 600]) {
              setTimeout(handleYouTube, delay);
            }
          });
          video.addEventListener("durationchange", () => {
            handleYouTube();
          });
          video.addEventListener("timeupdate", () => {
            const p = document.querySelector("#movie_player, .html5-video-player");
            if (
              (p && (p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting"))) ||
              document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
            ) {
              handleYouTube();
            }
          });
          video.addEventListener("canplay", () => {
            if (!userPaused && video.paused && !video.ended) ensurePlaying();
          });
          video.addEventListener("play", () => {
            userPaused = false;
          });
        }

        // 1. Detect if video ID changed (transitioned to next track/song)
        const currentId = getVideoId();
        if (currentId && currentId !== lastKnownVideoId) {
          lastKnownVideoId = currentId;
          userPaused = false; // Reset paused state for the new track
          for (const d of [50, 200, 500, 1000]) {
            setTimeout(ensurePlaying, d);
          }
        }

        // 2. Reliable YouTube ad detection
        const isAdShowing = Boolean(
          (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) ||
          document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
        );

        // 3. Directly skip ads and trigger skip buttons immediately
        if (isAdShowing) {
          userPaused = false;

          if (player && typeof player.skipAd === "function") {
            try { player.skipAd(); } catch {}
          }
          const skipSelectors = [
            ".ytp-ad-skip-button",
            ".ytp-ad-skip-button-modern",
            ".ytp-skip-ad-button",
            ".ytp-skip-ad-button-modern",
            ".ytp-ad-skip-button-slot button",
            "button[id^='skip-button']",
            ".ytp-ad-overlay-close-button",
            ".ytp-ad-skip-button-container button",
            ".ytp-ad-skip-button-text",
            "button.ytp-ad-skip-button",
            "button.ytp-ad-skip-button-modern",
            "button.ytp-skip-ad-button",
            "button.ytp-skip-ad-button-modern",
            "[class*='ytp-ad-skip-button']",
            "[class*='ytp-skip-ad-button']",
          ];
          for (const sel of skipSelectors) {
            const btns = document.querySelectorAll(sel);
            for (const btn of btns) {
              if (btn && typeof btn.click === "function") {
                try { btn.click(); } catch {}
              }
            }
          }
          if (video) {
            if (!adMediaState) {
              adMediaState = { muted: video.muted, opacity: video.style.opacity };
            }
            video.muted = true;
            // Instantly hide ad frames visually - never show fast-forwarded ads!
            video.style.opacity = "0";

            // Only seek if we are confident this is an ad video and not the main video:
            const mainDuration = (player && typeof player.getDuration === "function") ? player.getDuration() : 0;
            const isMainVideo = mainDuration > 0 && Number.isFinite(video.duration) && Math.abs(video.duration - mainDuration) < 1.0;

            if (!isMainVideo && Number.isFinite(video.duration) && video.duration > 0 && video.duration < 120) {
              try { video.currentTime = video.duration; } catch {}
            }

            if (video.paused) {
              const p = video.play();
              if (p && typeof p.catch === "function") p.catch(() => {});
            }
          }
        } else if (video && adMediaState) {
          video.muted = adMediaState.muted;
          video.style.opacity = adMediaState.opacity || "1";
          video.playbackRate = 1;
          adMediaState = null;
          userPaused = false;
          ensurePlaying();
          for (const d of [60, 150, 300, 600, 1000]) {
            setTimeout(ensurePlaying, d);
          }
        } else if (!isAdShowing && video && video.paused && !userPaused) {
          ensurePlaying();
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
      if (!e.isTrusted) return;

      const p = document.querySelector("#movie_player, .html5-video-player");
      const isAd = Boolean(
        (p && (p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting"))) ||
        document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
      );
      if (isAd) return;

      const target = e.target;
      if (target instanceof Element && target.closest(".ytp-play-button, video")) {
        const video = document.querySelector("video");
        if (video) userPaused = !video.paused;
      }
    }, true);

    document.addEventListener("keydown", (e) => {
      if (!e.isTrusted) return;
      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

        const p = document.querySelector("#movie_player, .html5-video-player");
        const isAd = Boolean(
          (p && (p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting"))) ||
          document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-showing")
        );
        if (isAd) return;

        const video = document.querySelector("video");
        if (video) userPaused = !video.paused;
      }
    }, true);

    handleYouTube();
    setInterval(handleYouTube, 250);

    const recheckDelays = [50, 200, 500, 1000];
    function triggerRecheck() {
      for (const d of recheckDelays) {
        setTimeout(handleYouTube, d);
      }
    }

    window.addEventListener("yt-navigate-finish", triggerRecheck);
    window.addEventListener("yt-page-data-updated", triggerRecheck);
    window.addEventListener("popstate", triggerRecheck);
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
