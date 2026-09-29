const assert = require("node:assert/strict")

// 1. Test Notification Title/Body Parser Logic (FakeNotification & showNotification)
function parseNotificationPayload(title, options) {
  let titleStr = String(title || "Tin nhắn mới").trim()
  const rawBody = options && options.body ? String(options.body).trim() : ""
  let bodyStr = rawBody
  const genericBody =
    /^(?:new messages?|unread messages?|new message|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn mới)$/i.test(
      bodyStr,
    )
  const genericTitle =
    /^(?:zalo|messenger|new messages?|unread messages?|new message|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn mới)$/i.test(
      titleStr,
    )

  if (genericTitle && bodyStr.includes(": ")) {
    const parts = bodyStr.split(/:\s+/)
    titleStr = parts[0].trim()
    bodyStr = parts.slice(1).join(": ").trim()
  } else {
    if (genericBody) bodyStr = ""
    if (!bodyStr && titleStr.includes(": ")) {
      const parts = titleStr.split(/:\s+/)
      titleStr = parts[0].trim()
      bodyStr = parts.slice(1).join(": ").trim()
    }
  }
  return {
    title: titleStr || "Tin nhắn mới",
    body: bodyStr,
    icon: options && options.icon ? String(options.icon) : "",
  }
}

// Case 1D: Zalo sends a generic title/body wrapper around the real preview
{
  const res = parseNotificationPayload("Tin nhắn mới", {
    body: "Nguyễn Quốc: Nội dung thật của Zalo",
  })
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(res.body, "Nội dung thật của Zalo")
}

{
  const res = parseNotificationPayload("Nguyễn Quốc: Nội dung thật của Zalo", {
    body: "Tin nhắn mới",
  })
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(res.body, "Nội dung thật của Zalo")
}

// Case 1A: Standard title and options.body
{
  const res = parseNotificationPayload("Nguyễn Minh", { body: "Chào bạn!" })
  assert.equal(res.title, "Nguyễn Minh")
  assert.equal(res.body, "Chào bạn!")
}

// Case 1B: Title contains "Sender: Message", options.body is empty
{
  const res = parseNotificationPayload(
    "Nguyễn Quốc: Em mời cả công ty trà sữa!",
    {},
  )
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(res.body, "Em mời cả công ty trà sữa!")
}

// Case 1C: Title contains multiple colons (e.g. "Bot: Alert: High CPU")
{
  const res = parseNotificationPayload("Admin: Lưu ý: Họp khẩn cấp lúc 3h", {})
  assert.equal(res.title, "Admin")
  assert.equal(res.body, "Lưu ý: Họp khẩn cấp lúc 3h")
}

// 2. Test Document Title Unread Parser Logic
function parseTitleNotification(docTitle, host = "zalo.me") {
  const m = (docTitle || "").match(/^[\(\[]\s*(\d+)\+?\s*[\)\]]\s*(.*?)$/)
  if (!m || !m[2]) return null

  const clean = m[2]
    .replace(/[-–—|•]\s*(?:Zalo|Messenger|Facebook).*$/i, "")
    .trim()
  if (clean.includes(": ")) {
    const parts = clean.split(/:\s+/)
    return {
      title: parts[0].trim(),
      body: parts.slice(1).join(": ").trim(),
    }
  } else if (
    clean &&
    !clean.toLowerCase().includes("zalo") &&
    !clean.toLowerCase().includes("messenger")
  ) {
    return {
      title: clean,
      body: "",
    }
  }
  return {
    title: host.includes("zalo") ? "Zalo" : "Messenger",
    body: "",
  }
}

// Case 2A: Zalo title with sender and body
{
  const res = parseTitleNotification(
    "(1) Nguyễn Quốc: Em mời cả công ty trà sữa! - Zalo",
    "zalo.me",
  )
  assert.ok(res)
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(res.body, "Em mời cả công ty trà sữa!")
}

// Case 2B: Messenger title with sender only
{
  const res = parseTitleNotification(
    "(2) Alex Johnson - Messenger",
    "messenger.com",
  )
  assert.ok(res)
  assert.equal(res.title, "Alex Johnson")
  assert.equal(res.body, "")
}

// 3. Test Notification Debounce & Content Upgrade Filter
function evaluateNotificationPass(
  prevNotification,
  nextNotification,
  elapsedMs,
) {
  const prevHasBody = Boolean(
    prevNotification && prevNotification.body && prevNotification.body.trim(),
  )
  const nextHasBody = Boolean(
    nextNotification && nextNotification.body && nextNotification.body.trim(),
  )
  const sameProvider = prevNotification?.provider === nextNotification?.provider
  const sameSignature =
    `${prevNotification?.title || ""}::${prevNotification?.body || ""}` ===
    `${nextNotification?.title || ""}::${nextNotification?.body || ""}`

  // If next has body and previous had none within 1500ms, allow upgrade
  if (sameProvider && nextHasBody && !prevHasBody && elapsedMs < 1500) {
    return { pass: true, reason: "upgrade_content" }
  }
  if (sameProvider && sameSignature && elapsedMs < 700) {
    return { pass: false, reason: "debounced" }
  }
  return { pass: true, reason: "standard_pass" }
}

// Case 3A: Notification with body arrives 80ms after empty notification -> MUST PASS (upgrade)
{
  const prev = { provider: "zalo", title: "Zalo", body: "" }
  const next = {
    provider: "zalo",
    title: "Nguyễn Quốc",
    body: "Uống trà sữa nha",
  }
  const evalRes = evaluateNotificationPass(prev, next, 80)
  assert.equal(evalRes.pass, true)
  assert.equal(evalRes.reason, "upgrade_content")
}

// Case 3B: Rapid duplicate event arrives 100ms later -> MUST DEBOUNCE
{
  const prev = {
    provider: "zalo",
    title: "Nguyễn Quốc",
    body: "Uống trà sữa nha",
  }
  const next = {
    provider: "zalo",
    title: "Nguyễn Quốc",
    body: "Uống trà sữa nha",
  }
  const evalRes = evaluateNotificationPass(prev, next, 100)
  assert.equal(evalRes.pass, false)
  assert.equal(evalRes.reason, "debounced")
}

// Case 3C: New notification arrives after 300ms -> MUST PASS
{
  const prev = { provider: "messenger", title: "Alex", body: "Hey" }
  const next = { provider: "messenger", title: "Alex", body: "How are you?" }
  const evalRes = evaluateNotificationPass(prev, next, 300)
  assert.equal(evalRes.pass, true)
  assert.equal(evalRes.reason, "standard_pass")
}

// Case 3D: Messenger must never debounce a Zalo notification
{
  const prev = { provider: "messenger", title: "Alex", body: "Ping" }
  const next = { provider: "zalo", title: "Alex", body: "Ping" }
  const evalRes = evaluateNotificationPass(prev, next, 80)
  assert.equal(evalRes.pass, true)
}

// 4. Test Messenger Multi-span Text Extraction
function cleanNotificationText(text, title = "") {
  let s = String(text || "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
  const prefixRegex =
    /^(?:unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới)[:\uFF1A\s–—\-·]+/i
  for (let i = 0; i < 3; i++) {
    const before = s
    s = s.replace(prefixRegex, "").trim()
    if (title && s.toLowerCase().startsWith((title + ":").toLowerCase())) {
      s = s.slice(title.length + 1).trim()
    }
    if (title && s.toLowerCase().startsWith((title + "：").toLowerCase())) {
      s = s.slice(title.length + 1).trim()
    }
    if (s === before) break
  }
  return s
}

function extractMessengerSpans(rawSpans) {
  const spans = rawSpans
    .map((s) => cleanNotificationText(s))
    .filter(
      (t) =>
        t.length > 0 &&
        !/^(unread messages?|new messages?|unseen messages?|các tin nhắn chưa đọc|tin nhắn chưa đọc|tin nhắn chưa xem|tin nhắn mới|các tin nhắn mới|\d+:\d+|\d+\s*(phút|giờ|ngày|m|h|d|min|hr|day|days)|vừa xong|just now|·)[:\uFF1A\s–—\-·]*$/i.test(
          t,
        ),
    )

  const unique = []
  for (const s of spans) {
    if (
      !unique.includes(s) &&
      !unique.some((u) => u.length > s.length && u.includes(s))
    ) {
      unique.push(s)
    }
  }

  const title =
    unique.length > 0 ? cleanNotificationText(unique[0]) : "Messenger"
  let body = unique.length > 1 ? unique.slice(1).join(" ").trim() : ""
  body = cleanNotificationText(body, title)
  return { title, body }
}

{
  // Simulating Facebook Messenger DOM: [Name, Author Prefix, Message Body, Dot, Timestamp]
  const messengerRow = [
    "Nguyễn Quốc",
    "Quốc:",
    "Em mời cả công ty trà sữa, mọi người ra uống nhé ạ!",
    "·",
    "Vừa xong",
  ]
  const res = extractMessengerSpans(messengerRow)
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(
    res.body,
    "Quốc: Em mời cả công ty trà sữa, mọi người ra uống nhé ạ!",
  )
}

{
  // Simulating Facebook Messenger with "Unread message:..." prefix
  const unreadMsgRow = [
    "Thùy Vân",
    "Unread message:Ko có em anh ăn ngon thế",
    "vừa xong",
  ]
  const res = extractMessengerSpans(unreadMsgRow)
  assert.equal(res.title, "Thùy Vân")
  assert.equal(res.body, "Ko có em anh ăn ngon thế")
}

{
  // Simulating Facebook Messenger with hidden LTR Unicode marks (\u200E) from dir="auto"
  const ltrRow = [
    "\u200EThùy Vân",
    "\u200EUnread message:Ko có em anh ăn ngon thế",
    "vừa xong",
  ]
  const res = extractMessengerSpans(ltrRow)
  assert.equal(res.title, "Thùy Vân")
  assert.equal(res.body, "Ko có em anh ăn ngon thế")
}

{
  // Simulating Facebook Messenger with directional embedding marks and full-width colon
  const bidiRow = [
    "Thùy Vân",
    "\u202AUnread message：Ko có em anh ăn ngon thế\u202C",
    "vừa xong",
  ]
  const res = extractMessengerSpans(bidiRow)
  assert.equal(res.title, "Thùy Vân")
  assert.equal(res.body, "Ko có em anh ăn ngon thế")
}

{
  // Simulating multi-layer sender and unread prefix
  const layeredRow = [
    "Thùy Vân",
    "Unread message: Thùy Vân: Ko có em anh ăn ngon thế",
    "vừa xong",
  ]
  const res = extractMessengerSpans(layeredRow)
  assert.equal(res.title, "Thùy Vân")
  assert.equal(res.body, "Ko có em anh ăn ngon thế")
}

{
  // Simulating Facebook Messenger with isolated "Unread message" span
  const isolatedSpanRow = [
    "Thùy Vân",
    "Unread message",
    "Ko có em anh ăn ngon thế",
    "vừa xong",
  ]
  const res = extractMessengerSpans(isolatedSpanRow)
  assert.equal(res.title, "Thùy Vân")
  assert.equal(res.body, "Ko có em anh ăn ngon thế")
}

{
  // Simulating single direct message without author prefix
  const directRow = ["Lê Hoa", "Báo cáo gửi rồi nha anh", "5 phút"]
  const res = extractMessengerSpans(directRow)
  assert.equal(res.title, "Lê Hoa")
  assert.equal(res.body, "Báo cáo gửi rồi nha anh")
}

// 5. Test Zalo Multi-span Extraction
function extractZaloSpans(spans, explicitTitle = "") {
  const textNodes = spans
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length > 0 &&
        !/^(\d+:\d+|\d+\s*(phút|giờ|ngày|m|h|d|min|hr|day|days)|vừa xong|just now|\d+\+?)$/i.test(
          t,
        ),
    )

  const unique = []
  for (const t of textNodes) {
    if (!unique.includes(t)) unique.push(t)
  }

  const title = explicitTitle || (unique.length > 0 ? unique[0] : "Zalo")
  const bodyCandidates = title
    ? unique.filter((t) => t !== title)
    : unique.slice(1)
  const body = bodyCandidates.length > 0 ? bodyCandidates.join(" ").trim() : ""
  return { title, body }
}

{
  const zaloNodes = [
    "Nhóm Dự Án",
    "Hôm nay release bản v1.0.8 nhé",
    "10:45",
    "3",
  ]
  const res = extractZaloSpans(zaloNodes)
  assert.equal(res.title, "Nhóm Dự Án")
  assert.equal(res.body, "Hôm nay release bản v1.0.8 nhé")
}

{
  // Zalo DOM containing duplicate sender name in avatar alt/header and message text
  const zaloWithDupes = [
    "Nguyễn Quốc",
    "Nguyễn Quốc",
    "Chiều nay đi ăn bún chả không?",
    "Vừa xong",
  ]
  const res = extractZaloSpans(zaloWithDupes, "Nguyễn Quốc")
  assert.equal(res.title, "Nguyễn Quốc")
  assert.equal(res.body, "Chiều nay đi ăn bún chả không?")
}

{
  // Zalo group chat message with author prefix
  const zaloGroup = [
    "Kế toán - Nhân sự",
    "Thu Hà: Mọi người gửi bảng chấm công trước 5h nha",
    "10:15",
  ]
  const res = extractZaloSpans(zaloGroup)
  assert.equal(res.title, "Kế toán - Nhân sự")
  assert.equal(res.body, "Thu Hà: Mọi người gửi bảng chấm công trước 5h nha")
}

// 6. Test Zalo Per-Person Unread Calculation (counting distinct people/conversations, not message sum)
function computeZaloUnreadCount(mockConversationBadges) {
  const unreadConvSet = new Set()
  mockConversationBadges.forEach((item) => {
    if (item.disabled || item.muted) return
    unreadConvSet.add(item.conversationId)
  })
  return unreadConvSet.size
}

{
  // 1 person sent 50 messages, 1 group sent 10 messages -> total count must be 2 (people/conversations), not 60!
  const mockBadges = [
    { conversationId: "user_thuyvan", rawCount: 50, disabled: false },
    { conversationId: "user_thuyvan", rawCount: 50, disabled: false }, // same conversation container
    { conversationId: "group_duan", rawCount: 10, disabled: false },
  ]
  const count = computeZaloUnreadCount(mockBadges)
  assert.equal(
    count,
    2,
    "Must count 2 distinct senders/conversations, not sum of messages",
  )
}

{
  // Muted conversation is excluded
  const mockBadges = [
    { conversationId: "user_thuyvan", rawCount: 15, disabled: false },
    {
      conversationId: "muted_channel",
      rawCount: 99,
      disabled: false,
      muted: true,
    },
  ]
  const count = computeZaloUnreadCount(mockBadges)
  assert.equal(count, 1, "Must exclude muted conversations")
}

console.log("✓ All push notification self-tests passed successfully!")
