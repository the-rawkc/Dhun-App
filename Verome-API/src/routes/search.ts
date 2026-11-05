/**
 * Search Routes
 * /api/search, /api/search/suggestions, /api/yt_search
 */

import { json, error } from "../helpers/response.ts";
import { detectRegionFromIP } from "../helpers/region.ts";
import { apiCache } from "../helpers/cache.ts";
import type { YTMusic } from "../services/ytmusic.ts";
import type { YouTubeSearch } from "../services/youtube-search.ts";

export async function handleSearch(
  req: Request,
  searchParams: URLSearchParams,
  ytmusic: YTMusic,
  youtubeSearch: YouTubeSearch
): Promise<Response> {
  const query = searchParams.get("q") || "";
  const filter = searchParams.get("filter") || undefined;
  const continuationToken = searchParams.get("continuationToken") || undefined;
  const ignoreSpelling = searchParams.get("ignore_spelling") === "true";

  let region = searchParams.get("region") || searchParams.get("gl") || "IN";
  let language = searchParams.get("language") || searchParams.get("hl") || "en";

  if (!query && !continuationToken) return error("Missing 'q' or 'continuationToken'");

  // Cache Check: Return instantly in < 2ms if cached
  const cacheKey = `search:${query}:${filter || "all"}:${region}:${language}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return json(cached);
  }

  const results = await ytmusic.search(
    query,
    filter,
    continuationToken,
    ignoreSpelling,
    region,
    language
  );

  const responsePayload = { query, filter, region, language, ...results };

  // Cache for 10 minutes
  apiCache.set(cacheKey, responsePayload, 600);

  return json(responsePayload);
}

export async function handleSearchSuggestions(
  searchParams: URLSearchParams,
  ytmusic: YTMusic,
  youtubeSearch: YouTubeSearch
): Promise<Response> {
  const query = searchParams.get("q")?.trim();
  if (!query) return error("Missing 'q'");

  const cacheKey = `sugg:${query.toLowerCase()}`;
  const cached = apiCache.get<string[]>(cacheKey);
  if (cached) {
    return json({ suggestions: cached, source: "cache" });
  }

  const music = searchParams.get("music");
  const suggestions =
    music === "1"
      ? await ytmusic.getSearchSuggestions(query)
      : await youtubeSearch.getSuggestions(query);

  apiCache.set(cacheKey, suggestions, 1800); // Cache for 30 minutes

  return json({ suggestions, source: music === "1" ? "youtube_music" : "youtube" });
}

export async function handleYTSearch(
  searchParams: URLSearchParams,
  youtubeSearch: YouTubeSearch
): Promise<Response> {
  const query = searchParams.get("q");
  const filter = searchParams.get("filter") || "all";
  const continuationToken = searchParams.get("continuationToken") || undefined;

  if (!query && !continuationToken) return error("Missing 'q' or 'continuationToken'");

  const cacheKey = `yt:${query}:${filter}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return json(cached);

  const results: unknown[] = [];
  let nextToken: string | null = null;

  if (continuationToken) {
    if (filter === "videos") {
      const r = await youtubeSearch.searchVideos(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    } else if (filter === "channels") {
      const r = await youtubeSearch.searchChannels(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    } else if (filter === "playlists") {
      const r = await youtubeSearch.searchPlaylists(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    }
  } else if (query) {
    if (filter === "videos" || filter === "all") {
      const r = await youtubeSearch.searchVideos(query);
      results.push(...r.results);
      nextToken = r.continuationToken;
    }
    if (filter === "channels" || filter === "all") {
      const r = await youtubeSearch.searchChannels(query);
      results.push(...r.results);
      if (!nextToken) nextToken = r.continuationToken;
    }
    if (filter === "playlists" || filter === "all") {
      const r = await youtubeSearch.searchPlaylists(query);
      results.push(...r.results);
      if (!nextToken) nextToken = r.continuationToken;
    }
  }

  const payload = { filter, query, results, continuationToken: nextToken };
  apiCache.set(cacheKey, payload, 600);

  return json(payload);
}
