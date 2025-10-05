import Gun from "gun";
import { serve } from "std/http/server.ts";

/**
 * Create and start a Gun server
 */
export function createGunServer(port = 8765) {
  console.log(`Starting Gun server on port ${port}`);
  
  // Initialize Gun directly
  // @ts-ignore - Gun has type inconsistencies
  const gun = Gun({
    web: false, // We'll handle the web server separately
    file: 'deno-data',
    multicast: false, // Disable multicast in Deno
    localStorage: false, // No localStorage in Deno
  });
  
  console.log('Gun database initialized');
  
  // Start a server for Gun's HTTP transport
  const httpServer = serve(async (req) => {
    // Set CORS headers to allow all origins
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    });
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers, status: 204 });
    }
    
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Handle Gun requests at /gun endpoint
    if (path === "/gun") {
      // For GET requests with a query parameter (Gun's way of syncing)
      if (req.method === "GET" && url.searchParams.toString()) {
        console.log("Gun GET sync request:", url.searchParams.toString());
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify({ ok: true, body: {} }), { headers });
      }
      
      // For POST requests (Gun data sync)
      if (req.method === "POST") {
        try {
          const body = await req.json();
          console.log("Gun POST sync:", Object.keys(body));
          
          // In a real implementation, we would process the Gun data here
          // For our simple demo, we'll just acknowledge receipt
          
          headers.set("Content-Type", "application/json");
          return new Response(JSON.stringify({ ok: true }), { headers });
        } catch (e) {
          console.error("Error parsing Gun data:", e);
          return new Response(JSON.stringify({ err: "Invalid data" }), { 
            headers, 
            status: 400 
          });
        }
      }
      
      // Simple response for other Gun requests
      headers.set("Content-Type", "text/plain");
      return new Response("Gun server running", { headers });
    }
    
    // Default response for other requests
    return new Response("Not Found", { status: 404 });
  }, { port });
  
  console.log(`Gun HTTP transport running on http://localhost:${port}/gun`);
  
  return { 
    gun,
    port,
    httpServer
  };
} 