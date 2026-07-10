import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localKvPlugin(): Plugin {
  const storePath = path.resolve(__dirname, ".local-kv.json");

  const readStore = (): Record<string, string> => {
    try {
      return JSON.parse(fs.readFileSync(storePath, "utf8"));
    } catch {
      return {};
    }
  };

  const writeStore = (store: Record<string, string>) => {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  };

  return {
    name: "local-kv-dev",
    configureServer(server) {
      server.middlewares.use("/api/kv", (req, res) => {
        const url = new URL(req.url || "", "http://localhost");
        const key = decodeURIComponent(url.pathname.replace(/^\//, ""));

        if (!key) {
          res.statusCode = 400;
          res.end("Bad Request");
          return;
        }

        if (req.method === "GET") {
          const store = readStore();
          if (!(key in store)) {
            res.statusCode = 404;
            res.end("Not Found");
            return;
          }
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(store[key]);
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.setEncoding("utf8");
          req.on("data", chunk => {
            body += chunk;
          });
          req.on("end", () => {
            const store = readStore();
            if (body === "") delete store[key];
            else store[key] = body;
            writeStore(store);
            res.end("OK");
          });
          return;
        }

        res.statusCode = 405;
        res.end("Method Not Allowed");
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [localKvPlugin(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
