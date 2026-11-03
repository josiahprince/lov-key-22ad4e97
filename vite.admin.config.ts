import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The staff admin app (admin/). It shares src/ for UI components, styles and
// the Supabase types, but is a separate site: the member app's build
// (vite.config.ts) never includes it. Run with `npm run dev:admin`.
export default defineConfig({
  root: path.resolve(__dirname, "admin"),
  envDir: __dirname,
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
  },
  plugins: [react()],
  css: {
    postcss: __dirname,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-admin"),
    emptyOutDir: true,
  },
});
