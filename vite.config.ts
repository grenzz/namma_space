import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    watch: {
      ignored: ["**/Image_to_3D/**", "**/source/**", "**/dist/**"],
    },
  },
});
