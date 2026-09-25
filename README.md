<a id="bubble-chat"></a>
<div align="center">

  <img src="public/bubble-chat-icon.png" width="96" height="96" alt="Bubble Chat Logo" />

  # Bubble Chat

  **Truy cập Facebook Messenger và Zalo tức thì từ bong bóng chat nổi thông minh trên máy tính.**

  <p>
    <a href="https://github.com/minq3010/bubble-chat/releases/latest">
      <img src="https://img.shields.io/badge/Release-v1.0.8-0084FF?style=flat-square" alt="Version 1.0.8" />
    </a>
    <img src="https://img.shields.io/badge/Platform-macOS_%7C_Windows_%7C_Linux-27272a?style=flat-square" alt="Platforms" />
    <img src="https://img.shields.io/badge/Stack-Electron_%E2%80%A2_React_%E2%80%A2_Vite-0284c7?style=flat-square" alt="Tech Stack" />
    <a href="https://github.com/minq3010/bubble-chat/stargazers">
      <img src="https://img.shields.io/github/stars/minq3010/bubble-chat?style=flat-square&color=d97706" alt="Stars" />
    </a>
  </p>

  <p>
    <a href="#muc-luc">Mục lục</a> •
    <a href="#tai-xuong">Tải xuống</a> •
    <a href="#tinh-nang">Tính năng</a> •
    <a href="#phim-tat">Phím tắt</a> •
    <a href="#cai-dat">Cài đặt</a> •
    <a href="#phat-trien">Dành cho Developers</a>
  </p>

</div>

---

<a id="muc-luc"></a>
## Mục lục

- [Tính năng nổi bật](#tinh-nang)
  - [Bong bóng chat (Floating Bubble)](#bong-bong-chat)
  - [Tích hợp Messenger & Zalo](#tich-hop)
  - [Tùy biến giao diện](#tuy-bien)
  - [Bảo mật & Hiệu năng](#bao-mat-hieu-nang)
- [Phím tắt toàn hệ thống](#phim-tat)
- [Tải xuống](#tai-xuong)
- [Hướng dẫn cài đặt](#cai-dat)
  - [macOS](#cai-dat-macos)
  - [Windows](#cai-dat-windows)
  - [Linux](#cai-dat-linux)
  - [Cập nhật tự động](#cap-nhat-tu-dong)
- [Dành cho nhà phát triển](#phat-trien)
  - [Yêu cầu môi trường](#yeu-cau-moi-truong)
  - [Cài đặt & Khởi chạy](#khoi-chay-dev)
  - [Đóng gói ứng dụng (Build)](#dong-goi-build)
  - [Cấu hình TOTP & Biến môi trường](#cau-hinh-totp)
- [Cấu trúc thư mục dự án](#cau-truc-du-an)
- [Công nghệ sử dụng](#cong-nghe)
- [Tác giả](#tac-gia)

---

<a id="tinh-nang"></a>
## Tính năng nổi bật

<a id="bong-bong-chat"></a>
### Bong bóng chat (Floating Bubble)
- **Luôn hiển thị trên cùng (Always on Top):** Nhấp chuột để mở nhanh khung chat, nhấp lại để thu gọn.
- **Kéo thả tự do:** Di chuyển bong bóng đến vị trí mong muốn; tự động lưu tọa độ và hỗ trợ đa màn hình.
- **Đếm tin nhắn chưa đọc:** Huy hiệu thông báo hiển thị tổng số tin nhắn mới theo thời gian thực từ cả hai nền tảng.

<a id="tich-hop"></a>
### Tích hợp Messenger & Zalo
- **Giao diện hợp nhất:** Sử dụng song song Facebook Messenger và Zalo Web trong một cửa sổ duy nhất.
- **Chuyển đổi nhanh:** Đổi qua lại giữa các tab chỉ với một cú nhấp chuột.
- **Thu phóng nội dung (Zoom):** Tùy chỉnh tỷ lệ hiển thị riêng biệt cho từng dịch vụ chat.
- **Tự đóng khi mất tiêu điểm (Close on Blur):** Tự động ẩn khung chat khi nhấp chuột ra ngoài màn hình làm việc.

<a id="tuy-bien"></a>
### Tùy biến giao diện
- **Chế độ màu:** Hỗ trợ Sáng (Light), Tối (Dark) và Tự động theo hệ thống (System).
- **Kích thước & Độ trong suốt:** Cho phép chỉnh kích thước bong bóng (Nhỏ / Vừa / Lớn) và độ mờ (Opacity 20% - 100%) của cả bong bóng lẫn khung chat.
- **Biểu tượng:** Đa dạng lựa chọn icon bong bóng tùy theo sở thích.

<a id="bao-mat-hieu-nang"></a>
### Bảo mật & Hiệu năng
- **Bảo vệ bằng 2FA (TOTP):** Tích hợp màn hình khóa bảo mật bằng mã xác thực 2 bước.
- **Phân vùng dữ liệu độc lập:** Quản lý session và cookie riêng biệt (`persist:messenger`, `persist:zalo`), đảm bảo an toàn tài khoản.
- **Quản lý bộ nhớ:** Dễ dàng xóa cache, cookie và dữ liệu duyệt web bất cứ lúc nào.
- **Chế độ hiệu năng (Performance Modes):**
  - **Low Memory:** Giải phóng webview nền để giảm thiểu mức chiếm dụng RAM.
  - **Balanced:** Cân bằng giữa tốc độ phản hồi và bộ nhớ sử dụng.
  - **Instant Switching:** Giữ sẵn cả hai ứng dụng trong RAM để chuyển tab tức thì.
- **Khay hệ thống (System Tray):** Ẩn ứng dụng xuống khay hệ thống khi không sử dụng.

[↑ Lên đầu trang](#bubble-chat)

---

<a id="phim-tat"></a>
## Phím tắt toàn hệ thống

| Phím tắt | Chức năng |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Cmd / Ctrl</kbd> + <kbd>B</kbd> | Bật / Tắt hiển thị bong bóng chat |
| <kbd>Alt</kbd> + <kbd>Cmd / Ctrl</kbd> + <kbd>M</kbd> | Mở nhanh cửa sổ Messenger |
| <kbd>Alt</kbd> + <kbd>Cmd / Ctrl</kbd> + <kbd>Z</kbd> | Mở nhanh cửa sổ Zalo |

[↑ Lên đầu trang](#bubble-chat)

---

<a id="tai-xuong"></a>
## Tải xuống

Các gói cài đặt trực tiếp cho phiên bản **v1.0.8**:

| Nền tảng | Kiến trúc | Liên kết tải về | Định dạng |
| :--- | :---: | :--- | :---: |
| macOS | Apple Silicon (`arm64`) | [Tải về Bubble Chat cho macOS](https://github.com/minq3010/bubble-chat/releases/download/v1.0.8/Bubble-Chat-1.0.8-mac-arm64.dmg) | `.dmg` |
| Windows | 64-bit (`x64`) | [Tải về Bubble Chat cho Windows](https://github.com/minq3010/bubble-chat/releases/download/v1.0.8/Bubble-Chat-1.0.8-win-x64.exe) | `.exe` |
| Linux | Ubuntu / Debian (`amd64`) | [Tải về Bubble Chat cho Linux](https://github.com/minq3010/bubble-chat/releases/download/v1.0.8/Bubble-Chat-1.0.8-linux-amd64.deb) | `.deb` |

> [!TIP]
> Bạn có thể xem toàn bộ các bản phát hành và lịch sử cập nhật tại mục [Releases](https://github.com/minq3010/bubble-chat/releases).

[↑ Lên đầu trang](#bubble-chat)

---

<a id="cai-dat"></a>
## Hướng dẫn cài đặt

<a id="cai-dat-macos"></a>
### macOS

1. Tải về tệp `.dmg`.
2. Kéo biểu tượng **Bubble Chat** vào thư mục **Applications**.
3. Mở ứng dụng từ **Launchpad** hoặc **Applications**.

> [!NOTE]
> **Nếu macOS chặn ứng dụng chưa xác minh (Gatekeeper):**
> 1. Chuột phải vào **Bubble Chat** trong `Applications` → Chọn **Open** → Xác nhận **Open**.
> 2. Hoặc mở **Terminal** và chạy lệnh gỡ cờ cách ly:
>    ```bash
>    xattr -dr com.apple.quarantine "/Applications/Bubble Chat.app"
>    ```

---

<a id="cai-dat-windows"></a>
### Windows

1. Tải về tệp `.exe`.
2. Chạy tệp cài đặt và làm theo hướng dẫn trên màn hình.
3. Mở **Bubble Chat** từ **Start Menu** hoặc màn hình Desktop.

---

<a id="cai-dat-linux"></a>
### Linux (Ubuntu / Debian)

1. Tải về tệp `.deb`.
2. Mở tệp bằng trình quản lý phần mềm (Software Install), hoặc chạy lệnh Terminal:
   ```bash
   sudo dpkg -i Bubble-Chat-1.0.8-linux-amd64.deb
   ```
3. Mở **Bubble Chat** từ menu ứng dụng.

---

<a id="cap-nhat-tu-dong"></a>
### Cập nhật tự động

Ứng dụng tích hợp sẵn tính năng kiểm tra phiên bản mới:
- Đi tới **Cài đặt → Giới thiệu → Kiểm tra cập nhật**.
- Khi có bản mới, ứng dụng sẽ tự động tải về và thông báo cập nhật.

[↑ Lên đầu trang](#bubble-chat)

---

<a id="phat-trien"></a>
## Dành cho nhà phát triển

<a id="yeu-cau-moi-truong"></a>
### Yêu cầu môi trường
- **Node.js**: Phiên bản 22 trở lên
- **pnpm**: Phiên bản 9 trở lên

<a id="khoi-chay-dev"></a>
### Cài đặt & Khởi chạy

```bash
# Clone repository
git clone https://github.com/minq3010/bubble-chat.git
cd bubble-chat

# Cài đặt phụ thuộc
pnpm install

# Khởi chạy Vite dev server và Electron
pnpm dev
```

<a id="dong-goi-build"></a>
### Đóng gói ứng dụng (Build)

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux

# Đóng gói tất cả nền tảng
pnpm build:all
```
> Tệp sau khi đóng gói được lưu trong thư mục `release/`.

<a id="cau-hinh-totp"></a>
### Cấu hình TOTP & Biến môi trường

- **Phát triển cục bộ:** Tạo tệp `.env` (dựa trên mẫu `.env.example`).
  - Đặt `BUBBLE_ENABLE_TOTP=false` để tắt màn hình khóa 2FA khi phát triển.
  - Đặt `BUBBLE_ENABLE_TOTP=true` và cung cấp mã bí mật `BUBBLE_TOTP_SECRET` để kiểm tra chức năng 2FA.
- **GitHub Actions (CI/CD):** Thiết lập GitHub Secret `BUBBLE_ENABLE_TOTP` (`true` hoặc `false`) cùng `BUBBLE_TOTP_SECRET` khi xuất bản release.

[↑ Lên đầu trang](#bubble-chat)

---

<a id="cau-truc-du-an"></a>
## Cấu trúc thư mục dự án

```text
bubble-chat/
├── electron/
│   ├── main.cjs         # Quản lý vòng đời Electron (Windows, Tray, Shortcuts, IPC)
│   └── preload.cjs      # ContextBridge kết nối Electron và Webview
├── src/
│   ├── components/      # Các component React UI
│   │   ├── BrandIcons.tsx       # Biểu tượng Messenger, Zalo và Bubble
│   │   ├── ChatPanel.tsx        # Cửa sổ chat & điều khiển webview
│   │   ├── FloatingBubble.tsx   # Bong bóng chat nổi và badge thông báo
│   │   ├── LockScreen.tsx       # Màn hình khóa bảo vệ 2FA TOTP
│   │   └── SettingsWindow.tsx   # Cửa sổ cài đặt
│   ├── desktop/         # Tích hợp desktop và IPC bridge
│   │   ├── BubbleWindow.tsx     # Xử lý cửa sổ bong bóng và kéo thả
│   │   ├── PanelWindow.tsx      # Xử lý cửa sổ chat panel
│   │   └── bridge.ts            # Wrapper gọi API desktop Type-safe
│   ├── hooks/           # Custom React hooks (unread counts, zoom, updates)
│   ├── utils/           # Tiện ích đa ngôn ngữ (i18n), xử lý theme
│   ├── App.tsx          # Router điều hướng giao diện
│   ├── index.css        # CSS tùy chỉnh với Tailwind CSS v4
│   └── main.tsx         # Điểm vào chính của ứng dụng
├── public/              # Tài nguyên tĩnh và icon ứng dụng
├── package.json
└── vite.config.ts
```

[↑ Lên đầu trang](#bubble-chat)

---

<a id="cong-nghe"></a>
## Công nghệ sử dụng

<p>
  <img src="https://img.shields.io/badge/Electron-44.2-47848F?style=flat-square" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Lucide_Icons-latest-F56565?style=flat-square" alt="Lucide" />
</p>

---

<a id="tac-gia"></a>
<div align="center">

  Phát triển bởi **[Nguyễn Minh Quốc](https://github.com/minq3010)**

  [![GitHub](https://img.shields.io/badge/GitHub-minq3010-181717?style=flat-square&logo=github)](https://github.com/minq3010)
  [![Email](https://img.shields.io/badge/Email-minhquoc%40minq.io.vn-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:minhquoc@minq.io.vn)
  [![Báo lỗi](https://img.shields.io/badge/Issues-Báo_lỗi-blue?style=flat-square&logo=github)](https://github.com/minq3010/bubble-chat/issues)

</div>
