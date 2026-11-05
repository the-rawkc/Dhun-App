/**
 * Discovery Routes
 * /api/charts, /api/moods, /api/trending, /api/radio, /api/similar, /api/top/*
 */

import { json, error } from "../helpers/response.ts";
import { matchRoute } from "../helpers/router.ts";
import { apiCache } from "../helpers/cache.ts";
import type { YTMusic } from "../services/ytmusic.ts";
import type { YouTubeSearch } from "../services/youtube-search.ts";
import {
  getTrendingMusic,
  getRadio,
  getTopArtists,
  getTopTracks,
  getSimilarTracks,
} from "../services/discovery.ts";

export async function handleDiscoverRoutes(
  pathname: string,
  searchParams: URLSearchParams,
  ytmusic: YTMusic,
  youtubeSearch: YouTubeSearch
): Promise<Response | null> {
  const cacheKey = `disc:${pathname}:${searchParams.toString()}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return json(cached);

  if (pathname === "/api/charts") {
    const res = await ytmusic.getCharts(searchParams.get("country") || "IN");
    apiCache.set(cacheKey, res, 1200);
    return json(res);
  }

  if (pathname === "/api/moods") {
    const res = await ytmusic.getMoodCategories();
    apiCache.set(cacheKey, res, 3600);
    return json(res);
  }

  const moodParams = matchRoute(pathname, "/api/moods/:categoryId");
  if (moodParams) {
    const res = await ytmusic.getMoodPlaylists(moodParams.categoryId);
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }

  if (pathname === "/api/watch_playlist") {
    const videoId = searchParams.get("videoId") || undefined;
    const playlistId = searchParams.get("playlistId") || undefined;
    if (!videoId && !playlistId) return error("Provide videoId or playlistId");
    const res = await ytmusic.getWatchPlaylist(
      videoId,
      playlistId,
      searchParams.get("radio") === "true",
      searchParams.get("shuffle") === "true",
      parseInt(searchParams.get("limit") || "25")
    );
    apiCache.set(cacheKey, res, 600);
    return json(res);
  }

  if (pathname === "/api/trending") {
    const country = searchParams.get("country") || "IN";
    const res = await getTrendingMusic(country, ytmusic);
    apiCache.set(cacheKey, res, 900);
    return json(res);
  }

  if (pathname === "/api/radio") {
    const videoId = searchParams.get("videoId");
    if (!videoId) return error("Missing videoId");
    const res = await getRadio(videoId, ytmusic);
    apiCache.set(cacheKey, res, 1200);
    return json(res);
  }

  if (pathname === "/api/similar") {
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");
    if (!title || !artist) return error("Missing title or artist");
    const result = await getSimilarTracks(
      title,
      artist,
      searchParams.get("limit") || "5",
      youtubeSearch
    );
    if ("error" in result) return json({ error: (result as any).error }, 500);
    apiCache.set(cacheKey, result, 1800);
    return json(result);
  }

  if (pathname === "/api/top/artists") {
    const res = await getTopArtists(
      searchParams.get("country") || "IN",
      parseInt(searchParams.get("limit") || "20"),
      ytmusic
    );
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }

  if (pathname === "/api/top/tracks") {
    const res = await getTopTracks(
      searchParams.get("country") || "IN",
      parseInt(searchParams.get("limit") || "20"),
      ytmusic
    );
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }

  return null;
}
