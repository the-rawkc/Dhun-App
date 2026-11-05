/**
 * Verome API - Entry Point
 * Music API for YouTube Music, Lyrics & Streaming
 *
 * Run: deno task start
 * Dev: deno task dev
 * Deploy: deno task deploy
 */

import { YTMusic } from "./src/services/ytmusic.ts";
import { YouTubeSearch } from "./src/services/youtube-search.ts";
import { json, corsHeaders } from "./src/helpers/response.ts";
import { fromFileUrl } from "jsr:@std/path";
import { html as uiHtml } from "./ui.ts";

// Routes
import { handleSearch, handleSearchSuggestions, handleYTSearch } from "./src/routes/search.ts";
import { handleContentRoutes } from "./src/routes/content.ts";
import { handleDiscoverRoutes } from "./src/routes/discover.ts";
import { handleStream, handleProxy, handleMusicFind } from "./src/routes/stream.ts";
import { handleInfoRoutes } from "./src/routes/info.ts";
import { handleFeedRoutes } from "./src/routes/feed.ts";
import { handleAuthLogin, handleAuthSync, handleAuthProfile } from "./src/routes/auth.ts";

// ─── Service Instances ──────────────────────────────────────

const ytmusic = new YTMusic();
const youtubeSearch = new YouTubeSearch();

// ─── High-Speed In-Memory Cache ──────────────────────────────
interface CacheEntry {
  body: string;
  status: number;
  contentType: string;
  expires: number;
}
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

function getCached(key: string): Response | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    apiCache.delete(key);
    return null;
  }
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      "Content-Type": entry.contentType,
      "X-Cache": "HIT",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      ...corsHeaders,
    },
  });
}

function setCache(key: string, res: Response, body: string, ttlMs = CACHE_TTL_MS) {
  if (res.status !== 200) return;
  if (apiCache.size > 800) {
    const keys = Array.from(apiCache.keys()).slice(0, 100);
    keys.forEach((k) => apiCache.delete(k));
  }
  apiCache.set(key, {
    body,
    status: res.status,
    contentType: res.headers.get("Content-Type") || "application/json",
    expires: Date.now() + ttlMs,
  });
}

// ─── Request Handler ────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Fast-path cache lookup for idempotent read endpoints
  const cacheable =
    req.method === "GET" &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/stream") &&
    !pathname.startsWith("/api/proxy") &&
    pathname !== "/" &&
    pathname !== "/health";

  if (cacheable) {
    const cached = getCached(req.url);
    if (cached) return cached;
  }

  try {
    let response: Response | null = null;

    // Root - UI
    if (pathname === "/") {
      return new Response(uiHtml, { headers: { "Content-Type": "text/html", ...corsHeaders } });
    }

    // Logo
    if (pathname === "/assets/logo.png" || pathname === "/assets/Logo.png") {
      try {
        const logoPath = fromFileUrl(new URL("./assets/Logo.png", import.meta.url));
        const logo = await Deno.readFile(logoPath);
        return new Response(logo, { headers: { "Content-Type": "image/png", ...corsHeaders } });
      } catch {
        return new Response("Logo not found", { status: 404 });
      }
    }

    if (pathname === "/favicon.ico") return new Response(null, { status: 204 });
    if (pathname === "/health") return json({ status: "ok", version: "2.0.0" });

    // ─── Cloud User Database & Authentication ────────────────
    if (pathname === "/api/auth/login") return await handleAuthLogin(req);
    if (pathname === "/api/auth/sync") return await handleAuthSync(req);
    if (pathname === "/api/auth/profile") return await handleAuthProfile(searchParams);

    // ─── Search ─────────────────────────────────────────────
    if (pathname === "/api/search") response = await handleSearch(req, searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/search/suggestions") response = await handleSearchSuggestions(searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/yt_search") response = await handleYTSearch(searchParams, youtubeSearch);

    // ─── Content (entities) ─────────────────────────────────
    if (!response) response = await handleContentRoutes(pathname, searchParams, ytmusic);

    // ─── Discovery ──────────────────────────────────────────
    if (!response) response = await handleDiscoverRoutes(pathname, searchParams, ytmusic, youtubeSearch);

    // ─── Streaming ──────────────────────────────────────────
    if (!response && pathname === "/api/music/find") return await handleMusicFind(searchParams, ytmusic);
    if (!response && pathname === "/api/stream") return await handleStream(searchParams);
    if (!response && pathname === "/api/proxy") return await handleProxy(searchParams, req);

    // ─── Info (lyrics, artist/track info) ───────────────────
    if (!response) response = await handleInfoRoutes(pathname, searchParams);

    // ─── Feed ───────────────────────────────────────────────
    if (!response) response = await handleFeedRoutes(pathname, searchParams);

    if (response) {
      if (cacheable && response.status === 200) {
        const bodyText = await response.text();
        setCache(req.url, response, bodyText);
        return new Response(bodyText, {
          status: response.status,
          headers: {
            "Content-Type": response.headers.get("Content-Type") || "application/json",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
            "X-Cache": "MISS",
            ...corsHeaders,
          },
        });
      }
      return response;
    }

    // ─── 404 ────────────────────────────────────────────────
    return json({ error: "Route not found", path: pathname }, 404);

  } catch (err) {
    console.error("Error:", err);
    return json({ error: "Internal server error", message: String(err) }, 500);
  }
}

// ─── Start Server ───────────────────────────────────────────

const PORT = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Verome API v2.0.0 running on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);
