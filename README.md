# 💬 Bubble Chat

<p align="center">
  <strong>Bong bóng chat tiện lợi cho Messenger & Zalo ngay trên màn hình Desktop của bạn.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.5-blue.svg" alt="Version 1.0.5" />
  <img src="https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Platform-macOS%20|%20Windows%20|%20Linux-lightgrey.svg" alt="Platforms" />
</p>

---

## 🌟 Giới thiệu

**Bubble Chat** là ứng dụng desktop hiện đại, mang trải nghiệm bong bóng chat (Chat Head) quen thuộc trên thiết bị di động lên máy tính cá nhân. Với khả năng tích hợp đồng thời cả **Facebook Messenger** và **Zalo**, bạn có thể nhắn tin nhanh chóng, theo dõi thông báo và chuyển đổi qua lại mà không cần phải mở nhiều tab trình duyệt cồng kềnh.

---

## ✨ Tính năng nổi bật

### 🎈 Bong bóng nổi thông minh (Floating Bubble)
- **Luôn nổi trên cùng (Always on Top)**: Luôn hiển thị trên các cửa sổ làm việc khác để bạn không bỏ lỡ tin nhắn.
- **Kéo & Thả linh hoạt (Drag & Drop)**: Dễ dàng di chuyển bong bóng tới bất kỳ vị trí nào trên màn hình.
- **Tự động bám mép (Snap to Edge)**: Tự động hít gọn vào cạnh màn hình trái/phải sau khi thả tay để không chiếm không gian hiển thị.
- **Huy hiệu thông báo (Unread Badge)**: Tự động phát hiện và đếm số lượng tin nhắn chưa đọc từ Messenger & Zalo theo thời gian thực.
- **Tùy biến kích thước & giao diện**: Hỗ trợ 3 kích thước bong bóng (*Small, Medium, Large*) cùng 2 chủ đề màu sắc (*Light Mode, Dark Mode*).

### 💬 Cửa sổ chat tiện lợi (Smart Chat Panel)
- **Định vị thông minh**: Tự động tính toán không gian khả dụng bên trái/phải bong bóng để mở cửa sổ chat ở vị trí thuận tiện nhất.
- **Chuyển đổi tức thì (Tab Switching)**: Chuyển đổi qua lại mượt mà giữa **Facebook Messenger** và **Zalo**.
- **Tự đóng khi bấm ra ngoài (Close on Blur)**: Tiết kiệm không gian làm việc; chỉ cần nhấp chuột ra ngoài cửa sổ chat sẽ tự động ẩn đi.
- **Tùy chỉnh độ thu phóng (Zoom)**: Phóng to hoặc thu nhỏ nội dung hiển thị của từng ứng dụng chat theo nhu cầu.

### ⚡ Chế độ tối ưu tài nguyên (Performance Modes)
- **Low Memory**: Tự động giải phóng và tạm dừng webview không hoạt động để tiết kiệm tối đa RAM.
- **Balanced**: Cân bằng tối ưu giữa việc giữ bộ nhớ đệm và sử dụng tài nguyên.
- **Instant Switching**: Giữ cả 2 ứng dụng trong RAM để chuyển đổi qua lại tức thì không cần tải lại.

### 🛡️ Tích hợp hệ thống & Bảo mật
- **Phiên đăng nhập độc lập (Isolated Sessions)**: Cookie và session của Messenger và Zalo được lưu trữ trong phân vùng riêng biệt (`persist:messenger`, `persist:zalo`), đảm bảo an toàn và bảo mật.
- **Quản lý dữ liệu & Bộ nhớ đệm**: Cho phép xóa cookie, session hoặc cache của từng nền tảng hoặc toàn bộ ứng dụng chỉ với một nhấp chuột trong phần Cài đặt.
- **Khay hệ thống (System Tray)**: Hỗ trợ chạy nền, ẩn/hiện nhanh qua biểu tượng tại Taskbar/Menu Bar.
- **Khởi động cùng hệ thống**: Tùy chọn tự động khởi chạy Bubble Chat khi mở máy tính.
- **Hỗ trợ đa màn hình**: Tự động khôi phục và đưa bong bóng về vùng an toàn khi thay đổi cấu hình màn hình.

---

## ⌨️ Phím tắt toàn hệ thống (Global Shortcuts)

| Phím tắt | Chức năng |
| :--- | :--- |
| `Alt + Command/Ctrl + B` | Ẩn / Hiện bong bóng chat (Bubble Chat) |
| `Alt + Command/Ctrl + M` | Mở nhanh cửa sổ chat **Facebook Messenger** |
| `Alt + Command/Ctrl + Z` | Mở nhanh cửa sổ chat **Zalo** |

---

## 📥 Cài đặt & Tải về

Bạn có thể tải về phiên bản mới nhất tại mục [Releases](https://github.com/minq3010/bubble-chat/releases):

- **macOS**: `Bubble-Chat-1.0.0-arm64.dmg` (Apple Silicon) hoặc `Bubble-Chat-1.0.0.dmg` (Intel)
- **Windows**: `Bubble-Chat-Setup-1.0.0.exe` (NSIS Installer)
- **Linux**: `Bubble-Chat-1.0.0.AppImage` hoặc `bubble-chat_1.0.0_amd64.deb`

---

## 🛠️ Hướng dẫn phát triển (Development)

### Yêu cầu tiên quyết
- **Node.js**: Phiên bản 22 trở lên
- **pnpm**: Phiên bản 9 trở lên

### 1. Clone mã nguồn
```bash
git clone https://github.com/minq3010/bubble-chat.git
cd bubble-chat
```

### 2. Cài đặt các gói phụ thuộc
```bash
pnpm install
```

### 3. Chạy môi trường phát triển (Dev Mode)
Lệnh này sẽ khởi chạy đồng thời Vite dev server và Electron:
```bash
pnpm dev
# hoặc
pnpm electron:dev
```

### 4. Đóng gói ứng dụng (Build Release)

Đóng gói theo từng nền tảng:
```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux

# Đóng gói tất cả các nền tảng được hỗ trợ trên máy hiện tại
pnpm build:all
```
File cài đặt sau khi build thành công sẽ nằm trong thư mục `release/`.

---

## 📁 Cấu trúc thư mục

```text
bubble-chat/
├── electron/
│   ├── main.cjs         # Quy trình chính của Electron (Quản lý cửa sổ, tray, shortcuts, IPC)
│   └── preload.cjs      # Cầu nối an toàn giữa Electron IPC và React UI qua ContextBridge
├── src/
│   ├── components/      # Các component giao diện React
│   │   ├── BrandIcons.tsx       # Logo Messenger, Zalo và icon ứng dụng
│   │   ├── ChatPanel.tsx        # Cửa sổ hiển thị chat & điều khiển webview
│   │   ├── FloatingBubble.tsx   # Giao diện bong bóng nổi và badge số tin nhắn
│   │   └── SettingsWindow.tsx   # Cửa sổ cấu hình tổng thể ứng dụng
│   ├── desktop/         # Tích hợp desktop và định tuyến
│   │   ├── BubbleWindow.tsx     # Logic xử lý kéo thả và render bong bóng
│   │   ├── PanelWindow.tsx      # Logic render panel chat
│   │   └── bridge.ts            # Wrapper gọi API desktop an toàn kiểu Type-safe
│   ├── hooks/           # Custom React hooks (useUnreadCounts, useWebviewZoom)
│   ├── App.tsx          # Router điều hướng dựa trên hash (#bubble hoặc panel)
│   ├── index.css        # CSS tùy chỉnh với Tailwind CSS v4
│   └── main.tsx         # Điểm nhập React client
├── .github/workflows/   # CI/CD GitHub Actions tự động build bản cài đặt khi gắn tag
├── package.json
└── vite.config.ts
```

---

## 🧰 Công nghệ sử dụng

- **Khung ứng dụng**: [Electron](https://www.electronjs.org/)
- **Thư viện UI**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bộ công cụ phát triển & Build**: [Vite 8](https://vitejs.dev/)
- **Thiết kế & Giao diện**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icon**: [Lucide React](https://lucide.dev/)
- **Bộ đóng gói**: [electron-builder](https://www.electron.build/)

---

## 👤 Tác giả

- **Nguyễn Minh Quốc**
- Email: [admin@minq.io.vn](mailto:admin@minq.io.vn)
- GitHub: [@minq3010](https://github.com/minq3010)

---

## 📄 Bản quyền & Giấy phép

Phát triển với mục đích học tập và phục vụ công việc hàng ngày. Mọi thắc mắc hoặc đóng góp vui lòng mở Issue hoặc Pull Request trên GitHub!
