import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {defineConfig} from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5179, // Specify your desired port here
    host: true, // Allow external connections
    allowedHosts: true // Allow all hosts
  },
  preview: {
    port: 5179, // Same port for preview server
    host: true, // Allow external connections
    allowedHosts: true // Allow all hosts
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
