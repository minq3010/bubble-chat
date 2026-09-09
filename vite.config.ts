import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ["lucide-react"] },
  server: { host: "0.0.0.0", port: 8443, strictPort: true },
});
