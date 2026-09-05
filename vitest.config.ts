import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        env: process.env,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
