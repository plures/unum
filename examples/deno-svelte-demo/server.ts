import { serve } from "std/http/server.ts";
import { createGunServer } from "./gun-server.ts";
import { join, dirname } from "https://deno.land/std@0.188.0/path/mod.ts";

// Show we're using the dist version
console.log("Using unum directly from the dist directory");

const port = 8000;
let html;

// Get the current directory
const currentDir = Deno.cwd();
const workspaceRoot = join(currentDir, "..", "..");
const distDir = join(workspaceRoot, "dist");

console.log("Current directory:", currentDir);
console.log("Workspace root:", workspaceRoot);
console.log("Dist directory:", distDir);

try {
  html = await Deno.readTextFile("./index.html");
  console.log("Successfully loaded index.html");
} catch (error) {
  console.error("Error loading index.html:", error);
  html = `<!DOCTYPE html>
<html>
<head>
  <title>Error - unum Demo</title>
</head>
<body>
  <h1>Error: Could not load index.html</h1>
  <p>Please make sure you're running the server from the examples/deno-svelte-demo directory</p>
</body>
</html>`;
}

// Start Gun server on port 8765
console.log("Starting Gun server...");
const gunServer = createGunServer();

console.log(`Starting HTTP server on http://localhost:${port}`);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`Received request: ${req.method} ${path}`);

    // Set CORS headers for all responses
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    });

    // Handle OPTIONS requests (CORS preflight)
    if (req.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }

    // Serve files from the dist directory (for unum access)
    if (path.startsWith("/dist/")) {
      try {
        const filePath = join(workspaceRoot, path);
        console.log(`Serving from dist: ${filePath}`);
        
        const file = await Deno.readFile(filePath);
        const contentType = path.endsWith(".js") 
          ? "application/javascript" 
          : path.endsWith(".ts") 
            ? "application/typescript"
            : path.endsWith(".css") 
              ? "text/css" 
              : "application/octet-stream";
        
        headers.set("Content-Type", contentType);
        return new Response(file, { headers });
      } catch (error) {
        console.error(`Error serving dist file ${path}:`, error);
        return new Response(`File not found: ${path}`, { 
          status: 404,
          headers
        });
      }
    }

    // Serve static files from assets
    if (path.startsWith("/assets/")) {
      try {
        const filePath = `.${path}`;
        console.log(`Serving static file: ${filePath}`);
        
        const file = await Deno.readFile(filePath);
        const contentType = path.endsWith(".js") 
          ? "application/javascript" 
          : path.endsWith(".css") 
            ? "text/css" 
            : "application/octet-stream";
        
        headers.set("Content-Type", contentType);
        return new Response(file, { headers });
      } catch (error) {
        console.error(`Error serving ${path}:`, error);
        return new Response(`File not found: ${path}`, { 
          status: 404,
          headers
        });
      }
    }

    // Serve main HTML
    headers.set("Content-Type", "text/html");
    return new Response(html, { headers });
  } catch (err: unknown) {
    // Safely handle unknown error type
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Server error:", err);
    return new Response(`Server error: ${errorMessage}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}, { port }); 