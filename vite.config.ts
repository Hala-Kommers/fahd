import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const { dependencies } = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8"));

export default defineConfig({
  plugins: [react()],
  server: {
    watch: { usePolling: true },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [...Object.keys(dependencies), "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  resolve: {
    alias: {
      "@": path.resolve(projectDir, "src"),
      "@shared": path.resolve(projectDir, "src", "shared"),
    },
  },
  build: {
    cssMinify: "esbuild",
  },
});
