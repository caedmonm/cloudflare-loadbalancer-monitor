import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // anything starting with /cf will be proxied
      "/cf": {
        target: "https://api.cloudflare.com/client/v4",
        changeOrigin: true,
        secure: true, // keep true; target is https
        rewrite: (path) => path.replace(/^\/cf/, ""),
      },
    },
  },
});
