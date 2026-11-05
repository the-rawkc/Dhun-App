import { YTMusic } from "../Verome-API/src/services/ytmusic.ts";
import { YouTubeSearch } from "../Verome-API/src/services/youtube-search.ts";
import { json, corsHeaders } from "../Verome-API/src/helpers/response.ts";

import { handleSearch, handleSearchSuggestions, handleYTSearch } from "../Verome-API/src/routes/search.ts";
import { handleContentRoutes } from "../Verome-API/src/routes/content.ts";
import { handleDiscoverRoutes } from "../Verome-API/src/routes/discover.ts";
import { handleStream, handleProxy, handleMusicFind } from "../Verome-API/src/routes/stream.ts";
import { handleInfoRoutes } from "../Verome-API/src/routes/info.ts";
import { handleFeedRoutes } from "../Verome-API/src/routes/feed.ts";
import { handleAuthLogin, handleAuthSync, handleAuthProfile } from "../Verome-API/src/routes/auth.ts";

export const config = {
  runtime: 'edge',
};

const ytmusic = new YTMusic();
const youtubeSearch = new YouTubeSearch();

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let response: Response | null = null;

    if (pathname === "/health" || pathname === "/api/health") {
      return json({ status: "ok", version: "2.0.0", platform: "vercel-edge" });
    }

    // ─── Cloud User Database & Authentication ────────────────
    if (pathname === "/api/auth/login") return await handleAuthLogin(req);
    if (pathname === "/api/auth/sync") return await handleAuthSync(req);
    if (pathname === "/api/auth/profile") return await handleAuthProfile(searchParams);

    // ─── Search ─────────────────────────────────────────────
    if (pathname === "/api/search") response = await handleSearch(req, searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/search/suggestions") response = await handleSearchSuggestions(searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/yt_search" || pathname === "/api/yt-search") response = await handleYTSearch(searchParams, youtubeSearch);

    // ─── Content (entities: songs, albums, artists) ─────────
    if (!response) response = await handleContentRoutes(pathname, searchParams, ytmusic);

    // ─── Discovery (charts, new-releases, trending) ─────────
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
      return response;
    }

    return json({ error: "Endpoint not found", path: pathname }, 404);
  } catch (err: any) {
    return json({ error: "Internal Server Error", message: err?.message || String(err) }, 500);
  }
}
