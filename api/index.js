import fs from 'node:fs';
import path from 'node:path';
import CryptoJS from 'crypto-js';

// Verome-API/src/services/ytmusic-parser.ts
function parseSearchResults(data) {
  const results = [];
  let continuationToken = null;
  if (data?.continuationContents?.musicShelfContinuation) {
    const shelf = data.continuationContents.musicShelfContinuation;
    for (const item of shelf.contents || []) {
      const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
      if (parsed)
        results.push(parsed);
    }
    continuationToken = shelf.continuations?.[0]?.nextContinuationData?.continuation || shelf.continuations?.[0]?.reloadContinuationData?.continuation || null;
    return { results, continuationToken };
  }
  const actions = data?.onResponseReceivedCommands || [];
  for (const action of actions) {
    const items = action?.appendContinuationItemsAction?.continuationItems || [];
    for (const entry of items) {
      if (entry.musicShelfRenderer || entry.musicShelfContinuation) {
        const shelf = entry.musicShelfRenderer || entry.musicShelfContinuation;
        for (const item of shelf.contents || []) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed)
            results.push(parsed);
        }
        continuationToken = shelf.continuations?.[0]?.nextContinuationData?.continuation || continuationToken;
      }
      if (entry.itemSectionRenderer) {
        for (const item of entry.itemSectionRenderer.contents || []) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              results.push(parsed);
          }
        }
      }
      if (entry.continuationItemRenderer) {
        continuationToken = entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || continuationToken;
      }
    }
  }
  if (results.length === 0) {
    const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      if (section.musicCardShelfRenderer) {
        const topResult = parseTopResultCard(section.musicCardShelfRenderer);
        if (topResult)
          results.push(topResult);
        for (const item of section.musicCardShelfRenderer.contents || []) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              results.push(parsed);
          }
        }
      }
      if (section.musicShelfRenderer) {
        for (const item of section.musicShelfRenderer.contents || []) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              results.push(parsed);
          }
        }
        continuationToken = section.musicShelfRenderer.continuations?.[0]?.nextContinuationData?.continuation || continuationToken;
      }
      if (section.itemSectionRenderer) {
        for (const item of section.itemSectionRenderer.contents || []) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              results.push(parsed);
          }
          if (item.musicShelfRenderer) {
            for (const shelfItem of item.musicShelfRenderer.contents || []) {
              if (shelfItem.musicResponsiveListItemRenderer) {
                const parsed = parseMusicItem(shelfItem.musicResponsiveListItemRenderer);
                if (parsed)
                  results.push(parsed);
              }
            }
          }
        }
      }
    }
  }
  return { results, continuationToken };
}
function parseTopResultCard(card) {
  if (!card)
    return null;
  const title = card.title?.runs?.[0]?.text;
  const subtitleRuns = card.subtitle?.runs || [];
  const thumbnail = card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;
  const videoId = card.onTap?.watchEndpoint?.videoId || card.buttons?.[0]?.buttonRenderer?.command?.watchEndpoint?.videoId;
  const browseId = card.onTap?.browseEndpoint?.browseId;
  const subtitleText = subtitleRuns.map((r) => r.text).join("");
  let resultType = "song";
  const lower = subtitleText.toLowerCase();
  if (lower.includes("video") || lower.includes("vid\xE9o"))
    resultType = "video";
  else if (lower.includes("artist") || lower.includes("artiste"))
    resultType = "artist";
  else if (lower.includes("album"))
    resultType = "album";
  else if (lower.includes("playlist"))
    resultType = "playlist";
  const artistRun = subtitleRuns.find(
    (r) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST"
  );
  const artists = artistRun ? [{ name: artistRun.text, id: artistRun.navigationEndpoint?.browseEndpoint?.browseId }] : [];
  return { title, thumbnails: [{ url: thumbnail }], videoId, browseId, artists, resultType, isTopResult: true, subtitle: subtitleText };
}
function parseSuggestions(data) {
  const suggestions = [];
  const contents = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || data?.contents || [];
  for (const content of contents) {
    const runs = content?.searchSuggestionRenderer?.suggestion?.runs || [];
    const text = runs.map((r) => r.text).join("");
    if (text)
      suggestions.push(text);
  }
  return suggestions;
}
function parseMusicItem(item) {
  if (!item)
    return null;
  const title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
  if (!title)
    return null;
  const thumbnail = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || item.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;
  const videoId = item.playlistItemData?.videoId || item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId || item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || item.doubleTapCommand?.watchEndpoint?.videoId || item.navigationEndpoint?.watchEndpoint?.videoId || void 0;
  const browseId = item.navigationEndpoint?.browseEndpoint?.browseId || item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || void 0;
  const subtitle = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  let artists = subtitle.filter((r) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST").map((r) => ({ name: r.text, id: r.navigationEndpoint?.browseEndpoint?.browseId }));
  if (artists.length === 0 && subtitle.length > 0) {
    const candidate = subtitle[0]?.text;
    if (candidate && candidate !== "\u2022" && !candidate.match(/^\d+/) && candidate.length > 1) {
      artists = [{ name: candidate }];
    }
  }
  const duration = item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
  const subtitleText = subtitle.map((r) => r.text || "").join("").toLowerCase();
  let resultType = "song";
  if (videoId) {
    resultType = subtitleText.includes("video") ? "video" : "song";
  } else if (browseId?.startsWith("UC") || subtitleText.includes("artist") || subtitleText.includes("artiste")) {
    resultType = "artist";
  } else if (browseId?.startsWith("MPRE") || subtitleText.includes("album") || subtitleText.includes("ep") || subtitleText.includes("single")) {
    resultType = "album";
  } else if (browseId?.startsWith("VL") || subtitleText.includes("playlist")) {
    resultType = "playlist";
  }
  return {
    title,
    thumbnails: [{ url: thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "") }],
    videoId,
    browseId,
    artists,
    duration,
    resultType
  };
}
function parseTwoRowItem(item) {
  if (!item)
    return null;
  return {
    title: item.title?.runs?.[0]?.text,
    subtitle: item.subtitle?.runs?.map((r) => r.text).join(""),
    thumbnails: item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    videoId: item.navigationEndpoint?.watchEndpoint?.videoId,
    browseId: item.navigationEndpoint?.browseEndpoint?.browseId,
    playlistId: item.navigationEndpoint?.watchEndpoint?.playlistId
  };
}

// Verome-API/src/services/ytmusic.ts
var YTMusic = class {
  baseURL = "https://music.youtube.com/youtubei/v1";
  apiKey = (typeof Deno !== "undefined" ? Deno.env.get("YTM_API_KEY") : typeof process !== "undefined" ? process.env?.["YTM_API_KEY"] : void 0) || atob("QUl6YVN5QzlYTDNaaldqWENsSVgxRm1VeEpxLS1Fb2hjRDRfb1Nz");
  context = {
    client: {
      hl: "en",
      gl: "US",
      clientName: "WEB_REMIX",
      clientVersion: "1.20251015.03.00",
      platform: "DESKTOP",
      utcOffsetMinutes: 0
    }
  };
  async search(query, filter, continuationToken, _ignoreSpelling = false, region, language) {
    const normalizedQuery = query.normalize("NFC");
    const filterParams = this.getFilterParams(filter);
    const params = continuationToken ? { continuation: continuationToken } : filterParams ? { query: normalizedQuery, params: filterParams } : { query: normalizedQuery };
    const context = region || language ? { client: { ...this.context.client, gl: region || this.context.client.gl, hl: language || this.context.client.hl } } : this.context;
    const data = await this.makeRequestWithContext("search", params, context);
    return parseSearchResults(data);
  }
  async getSearchSuggestions(query) {
    const data = await this.makeRequest("music/get_search_suggestions", { input: query.normalize("NFC") });
    return parseSuggestions(data);
  }
  async getSong(videoId) {
    const data = await this.makeRequest("player", { videoId });
    const details = data?.videoDetails || {};
    return {
      videoId: details.videoId,
      title: details.title,
      author: details.author,
      lengthSeconds: details.lengthSeconds,
      thumbnail: details.thumbnail?.thumbnails?.[0]?.url
    };
  }
  async getAlbum(browseId) {
    let cleanBrowseId = browseId;
    if (cleanBrowseId.startsWith("OLAK") && !cleanBrowseId.startsWith("VL")) {
      cleanBrowseId = `VL${cleanBrowseId}`;
    }
    const data = await this.makeRequest("browse", { browseId: cleanBrowseId });
    const singleColumn = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    const twoColumnPrimary = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    const twoColumnSecondary = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents;
    let title = "", artist = "", thumbnail = "", year = "";
    const oldHeader = data?.header?.musicDetailHeaderRenderer || data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer || data?.header?.musicResponsiveHeaderRenderer;
    if (oldHeader) {
      title = oldHeader.title?.runs?.[0]?.text || title;
      const subtitleRuns = oldHeader.subtitle?.runs || oldHeader.straplineTextOne?.runs || [];
      artist = subtitleRuns.find((r) => r.navigationEndpoint)?.text || subtitleRuns[0]?.text || artist;
      thumbnail = oldHeader.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || oldHeader.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || thumbnail;
    }
    const primaryContents = twoColumnPrimary || singleColumn || [];
    for (const section of primaryContents) {
      if (section.musicResponsiveHeaderRenderer) {
        const h = section.musicResponsiveHeaderRenderer;
        title = h.title?.runs?.[0]?.text || title;
        const subtitleRuns = h.straplineTextOne?.runs || h.subtitle?.runs || [];
        artist = subtitleRuns.find((r) => r.navigationEndpoint)?.text || subtitleRuns[0]?.text || artist;
        thumbnail = h.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || thumbnail;
        for (const run of h.subtitle?.runs || []) {
          const yearMatch = run.text?.match(/\d{4}/);
          if (yearMatch)
            year = yearMatch[0];
        }
      }
      if (section.musicDescriptionShelfRenderer) {
        const subHeader = section.musicDescriptionShelfRenderer.subheader?.runs?.[0]?.text || "";
        const yearMatch = subHeader.match(/\d{4}/);
        if (yearMatch && !year)
          year = yearMatch[0];
      }
    }
    const allSections = [
      ...twoColumnSecondary || [],
      ...twoColumnPrimary || [],
      ...singleColumn || [],
      ...data?.contents?.sectionListRenderer?.contents || []
    ];
    const tracks = [];
    const seenTrackIds = /* @__PURE__ */ new Set();
    for (const section of allSections) {
      const shelfItems = section.musicShelfRenderer?.contents || section.musicPlaylistShelfRenderer?.contents || section.itemSectionRenderer?.contents || [];
      for (const item of shelfItems) {
        if (item.musicResponsiveListItemRenderer) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed && parsed.videoId && !seenTrackIds.has(parsed.videoId)) {
            seenTrackIds.add(parsed.videoId);
            tracks.push(parsed);
          }
        }
      }
    }
    if (tracks.length === 0 && (browseId.startsWith("OLAK") || browseId.startsWith("VL") || browseId.startsWith("RD"))) {
      const pl = await this.getPlaylist(browseId);
      if (pl?.tracks?.length) {
        return {
          browseId,
          title: pl.title || title,
          artist: pl.author || pl.artist || artist,
          thumbnail: pl.thumbnail || thumbnail,
          year: year || "",
          trackCount: pl.tracks.length,
          tracks: pl.tracks
        };
      }
    }
    return { browseId, title, artist, thumbnail, year, trackCount: tracks.length, tracks };
  }
  async getArtist(browseId) {
    const data = await this.makeRequest("browse", { browseId });
    const header = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer || {};
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const topSongs = [], albums = [], singles = [], videos = [];
    for (const section of contents) {
      const shelf = section.musicShelfRenderer;
      const carousel = section.musicCarouselShelfRenderer;
      if (shelf) {
        const t = shelf.title?.runs?.[0]?.text?.toLowerCase() || "";
        if (t.includes("song")) {
          for (const item of shelf.contents || []) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              topSongs.push(parsed);
          }
        }
      }
      if (carousel) {
        const t = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase() || "";
        const items = (carousel.contents || []).map((item) => parseTwoRowItem(item.musicTwoRowItemRenderer)).filter(Boolean);
        if (t.includes("album"))
          albums.push(...items);
        else if (t.includes("single"))
          singles.push(...items);
        else if (t.includes("video"))
          videos.push(...items);
      }
    }
    return {
      browseId,
      name: header.title?.runs?.[0]?.text,
      description: header.description?.runs?.[0]?.text,
      thumbnail: header.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
      subscribers: header.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text,
      topSongs,
      albums,
      singles,
      videos
    };
  }
  async getArtistSummary(artistId, country = "US") {
    const url = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
    const body = { browseId: artistId, context: { client: { ...this.context.client, gl: country } } };
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    const header = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer;
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    let playlistId = null;
    for (const item of contents) {
      if (item.musicShelfRenderer?.title?.runs?.[0]?.text === "Top songs") {
        playlistId = item.musicShelfRenderer.contents?.[0]?.musicResponsiveListItemRenderer?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.playlistId;
        break;
      }
    }
    let recommendedArtists = null;
    for (const item of contents) {
      const headerTitle = item.musicCarouselShelfRenderer?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
      if (headerTitle === "Fans might also like") {
        recommendedArtists = (item.musicCarouselShelfRenderer.contents || []).map((it) => ({
          name: it.musicTwoRowItemRenderer?.title?.runs?.[0]?.text,
          browseId: it.musicTwoRowItemRenderer?.navigationEndpoint?.browseEndpoint?.browseId,
          thumbnail: it.musicTwoRowItemRenderer?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url
        }));
        break;
      }
    }
    return {
      artistName: header?.title?.runs?.[0]?.text,
      artistAvatar: header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url,
      playlistId,
      recommendedArtists
    };
  }
  async getPlaylist(playlistId) {
    const browseId = `VL${playlistId.replace(/^VL/, "")}`;
    const data = await this.makeRequest("browse", { browseId });
    const primaryContents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    let title = "", author = "", description = "", thumbnail = "";
    for (const section of primaryContents) {
      if (section.musicResponsiveHeaderRenderer) {
        const h = section.musicResponsiveHeaderRenderer;
        title = h.title?.runs?.[0]?.text || "";
        const subtitleRuns = h.straplineTextOne?.runs || [];
        author = subtitleRuns.find((r) => r.navigationEndpoint)?.text || subtitleRuns[0]?.text || "";
        description = h.description?.musicDescriptionShelfRenderer?.description?.runs?.[0]?.text || "";
        thumbnail = h.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";
      }
    }
    const oldHeader = data?.header?.musicDetailHeaderRenderer || data?.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer;
    if (oldHeader && !title) {
      title = oldHeader.title?.runs?.[0]?.text || "";
      const subtitleRuns = oldHeader.subtitle?.runs || [];
      author = subtitleRuns.find((r) => r.navigationEndpoint)?.text || subtitleRuns[0]?.text || "";
      thumbnail = oldHeader.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || oldHeader.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";
    }
    const secondaryContents = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents || [];
    const tracks = [];
    for (const section of secondaryContents) {
      if (section.musicPlaylistShelfRenderer) {
        for (const item of section.musicPlaylistShelfRenderer.contents || []) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed)
            tracks.push(parsed);
        }
      }
      if (section.musicShelfRenderer) {
        for (const item of section.musicShelfRenderer.contents || []) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed)
            tracks.push(parsed);
        }
      }
    }
    if (tracks.length === 0) {
      const singleColumn = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of singleColumn) {
        if (section.musicShelfRenderer) {
          for (const item of section.musicShelfRenderer.contents || []) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed)
              tracks.push(parsed);
          }
        }
      }
    }
    return { playlistId: playlistId.replace(/^VL/, ""), title, author, description, thumbnail, trackCount: tracks.length, tracks };
  }
  async getCharts(country) {
    const data = await this.makeRequest("browse", { browseId: "FEmusic_charts", formData: { selectedValues: [country || "US"] } });
    return this.parseChartsData(data);
  }
  async getMoodCategories() {
    const data = await this.makeRequest("browse", { browseId: "FEmusic_moods_and_genres" });
    return this.parseMoodsData(data);
  }
  async getMoodPlaylists(categoryId) {
    const data = await this.makeRequest("browse", { browseId: categoryId });
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const playlists = [];
    for (const section of contents) {
      for (const item of section.musicShelfRenderer?.contents || []) {
        const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
        if (parsed)
          playlists.push(parsed);
      }
    }
    return playlists;
  }
  async getWatchPlaylist(videoId, playlistId, radio = false, shuffle = false, limit = 25) {
    const data = await this.makeRequest("next", { videoId, playlistId, radio, shuffle });
    const contents = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];
    const tracks = contents.map((item) => {
      const video = item.playlistPanelVideoRenderer;
      if (!video)
        return null;
      return { videoId: video.videoId, title: video.title?.runs?.[0]?.text, author: video.shortBylineText?.runs?.[0]?.text, thumbnail: video.thumbnail?.thumbnails?.[0]?.url };
    }).filter(Boolean);
    return { tracks: tracks.slice(0, limit) };
  }
  async getRelated(videoId) {
    const url = `https://www.youtube.com/youtubei/v1/next?key=${this.apiKey}`;
    const body = { videoId, context: { client: { clientName: "WEB", clientVersion: "2.20251013.01.00" } } };
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    const secondaryResults = data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];
    const results = [];
    for (const item of secondaryResults) {
      if (item.lockupViewModel) {
        const lockup = item.lockupViewModel;
        const metadata = lockup.metadata?.lockupMetadataViewModel;
        const contentImage = lockup.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel;
        const vid = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId || lockup.contentId;
        if (vid) {
          results.push({
            videoId: vid,
            title: metadata?.title?.content,
            artist: metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content,
            thumbnail: contentImage?.image?.sources?.[0]?.url,
            duration: metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[2]?.text?.content
          });
        }
      } else if (item.compactVideoRenderer) {
        const video = item.compactVideoRenderer;
        const durationText = video.lengthText?.simpleText || "";
        let durationSeconds = 0;
        if (durationText) {
          const parts = durationText.split(":").map((p) => parseInt(p) || 0);
          if (parts.length === 2)
            durationSeconds = parts[0] * 60 + parts[1];
          else if (parts.length === 3)
            durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        if (video.videoId && !(durationSeconds > 0 && durationSeconds <= 60)) {
          results.push({
            videoId: video.videoId,
            title: video.title?.simpleText || video.title?.runs?.[0]?.text,
            artist: video.shortBylineText?.runs?.[0]?.text,
            thumbnail: video.thumbnail?.thumbnails?.[0]?.url,
            duration: durationText
          });
        }
      }
    }
    return results.slice(0, 20);
  }
  async makeRequest(endpoint, params) {
    const url = `${this.baseURL}/${endpoint}?key=${this.apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: this.context, ...params }) });
    return response.json();
  }
  async makeRequestWithContext(endpoint, params, context) {
    const url = `${this.baseURL}/${endpoint}?key=${this.apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, ...params }) });
    return response.json();
  }
  getFilterParams(filter) {
    if (!filter)
      return void 0;
    const filterMap = {
      songs: "EgWKAQIIAWoKEAkQAxAEEAoQBQ%3D%3D",
      videos: "EgWKAQIQAWoKEAkQAxAEEAoQBQ%3D%3D",
      albums: "EgWKAQIYAWoKEAkQAxAEEAoQBQ%3D%3D",
      artists: "EgWKAQIgAWoKEAkQAxAEEAoQBQ%3D%3D",
      playlists: "EgWKAQIoAWoKEAkQAxAEEAoQBQ%3D%3D",
      community_playlists: "EgeKAQQoAEABagoQAxAEEAkQChAF",
      featured_playlists: "EgeKAQQoADgBagoQAxAEEAkQChAF"
    };
    return filterMap[filter] || void 0;
  }
  parseChartsData(data) {
    const results = [];
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      if (section.musicCarouselShelfRenderer) {
        const title = section.musicCarouselShelfRenderer?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
        const items = (section.musicCarouselShelfRenderer?.contents || []).map((item) => parseTwoRowItem(item.musicTwoRowItemRenderer || item.musicResponsiveListItemRenderer)).filter(Boolean);
        if (title && items.length)
          results.push({ title, items });
      }
      if (section.musicShelfRenderer) {
        const title = section.musicShelfRenderer?.title?.runs?.[0]?.text;
        const items = (section.musicShelfRenderer?.contents || []).map((item) => parseMusicItem(item.musicResponsiveListItemRenderer)).filter(Boolean);
        if (title && items.length)
          results.push({ title, items });
      }
    }
    return results;
  }
  parseMoodsData(data) {
    const results = [];
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of contents) {
      if (section.gridRenderer) {
        const items = (section.gridRenderer?.items || []).map((item) => {
          const nav = item.musicNavigationButtonRenderer;
          if (!nav)
            return null;
          return { title: nav.buttonText?.runs?.[0]?.text, browseId: nav.clickCommand?.browseEndpoint?.browseId, color: nav.solid?.leftStripeColor };
        }).filter(Boolean);
        if (items.length)
          results.push({ title: "Moods & Genres", items });
      }
      if (section.musicCarouselShelfRenderer) {
        const title = section.musicCarouselShelfRenderer?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
        const items = (section.musicCarouselShelfRenderer?.contents || []).map((item) => {
          const nav = item.musicNavigationButtonRenderer;
          if (!nav)
            return null;
          return { title: nav.buttonText?.runs?.[0]?.text, browseId: nav.clickCommand?.browseEndpoint?.browseId, color: nav.solid?.leftStripeColor };
        }).filter(Boolean);
        if (title && items.length)
          results.push({ title, items });
      }
    }
    return results;
  }
};

// Verome-API/src/services/youtube-search.ts
var YouTubeSearch = class {
  searchURL = "https://www.youtube.com/results";
  continuationURL = "https://www.youtube.com/youtubei/v1/search";
  suggestionsURL = "https://suggestqueries-clients6.youtube.com/complete/search";
  apiKey = null;
  clientVersion = null;
  async searchVideos(query, continuationToken) {
    if (continuationToken)
      return this.fetchContinuation(continuationToken, "video");
    if (!query)
      throw new Error("Query is required for initial search");
    const response = await fetch(`${this.searchURL}?search_query=${encodeURIComponent(query.normalize("NFC"))}&sp=EgIQAQ%253D%253D`);
    const html = await response.text();
    this.extractAPIConfig(html);
    return this.parseVideoResults(html);
  }
  async searchChannels(query, continuationToken) {
    if (continuationToken)
      return this.fetchContinuation(continuationToken, "channel");
    if (!query)
      throw new Error("Query is required for initial search");
    const response = await fetch(`${this.searchURL}?search_query=${encodeURIComponent(query.normalize("NFC"))}&sp=EgIQAg%253D%253D`);
    const html = await response.text();
    this.extractAPIConfig(html);
    return this.parseChannelResults(html);
  }
  async searchPlaylists(query, continuationToken) {
    if (continuationToken)
      return this.fetchContinuation(continuationToken, "playlist");
    if (!query)
      throw new Error("Query is required for initial search");
    const response = await fetch(`${this.searchURL}?search_query=${encodeURIComponent(query.normalize("NFC"))}&sp=EgIQAw%253D%253D`);
    const html = await response.text();
    this.extractAPIConfig(html);
    return this.parsePlaylistResults(html);
  }
  async getSuggestions(query) {
    try {
      const url = `${this.suggestionsURL}?ds=yt&client=youtube&q=${encodeURIComponent(query.normalize("NFC"))}`;
      const response = await fetch(url);
      const text = await response.text();
      const start = text.indexOf("(");
      const end = text.lastIndexOf(")");
      if (start === -1 || end === -1)
        return this.getStaticSuggestions(query);
      const json2 = JSON.parse(text.slice(start + 1, end));
      return (json2[1] || []).map((item) => Array.isArray(item) ? item[0] : item).slice(0, 10);
    } catch {
      return this.getStaticSuggestions(query);
    }
  }
  extractAPIConfig(html) {
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const clientVersionMatch = html.match(/"clientVersion":"([^"]+)"/);
    if (apiKeyMatch)
      this.apiKey = apiKeyMatch[1];
    if (clientVersionMatch)
      this.clientVersion = clientVersionMatch[1];
  }
  async fetchContinuation(token, type) {
    if (!this.apiKey)
      throw new Error("API key not initialized");
    const response = await fetch(`${this.continuationURL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuation: token, context: { client: { clientName: "WEB", clientVersion: this.clientVersion || "2.20231219.01.00" } } })
    });
    const data = await response.json();
    return this.parseContinuationResults(data, type);
  }
  parseVideoResults(html) {
    const results = [];
    let continuationToken = null;
    const jsonMatch = html.match(/var ytInitialData = ({.+?});/);
    if (!jsonMatch)
      return { results, continuationToken };
    const data = JSON.parse(jsonMatch[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const items = sections[0]?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      if (item.videoRenderer)
        results.push(this.parseVideoRenderer(item.videoRenderer));
    }
    continuationToken = this.extractContinuationToken(data);
    return { results, continuationToken };
  }
  parseChannelResults(html) {
    const results = [];
    let continuationToken = null;
    const jsonMatch = html.match(/var ytInitialData = ({.+?});/);
    if (!jsonMatch)
      return { results, continuationToken };
    const data = JSON.parse(jsonMatch[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      for (const item of section?.itemSectionRenderer?.contents || []) {
        if (item.channelRenderer)
          results.push(this.parseChannelRenderer(item.channelRenderer));
      }
    }
    continuationToken = this.extractContinuationToken(data);
    return { results, continuationToken };
  }
  parsePlaylistResults(html) {
    const results = [];
    let continuationToken = null;
    const jsonMatch = html.match(/var ytInitialData = ({.+?});/);
    if (!jsonMatch)
      return { results, continuationToken };
    const data = JSON.parse(jsonMatch[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      for (const item of section?.itemSectionRenderer?.contents || []) {
        if (item.playlistRenderer)
          results.push(this.parsePlaylistRenderer(item.playlistRenderer));
      }
    }
    continuationToken = this.extractContinuationToken(data);
    return { results, continuationToken };
  }
  parseContinuationResults(data, type) {
    const results = [];
    let continuationToken = null;
    const actions = data?.onResponseReceivedCommands || [];
    for (const action of actions) {
      const items = action?.appendContinuationItemsAction?.continuationItems || [];
      for (const item of items) {
        if (item.continuationItemRenderer) {
          continuationToken = item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
          continue;
        }
        if (type === "video" && item.videoRenderer)
          results.push(this.parseVideoRenderer(item.videoRenderer));
        else if (type === "channel" && item.channelRenderer)
          results.push(this.parseChannelRenderer(item.channelRenderer));
        else if (type === "playlist" && item.playlistRenderer)
          results.push(this.parsePlaylistRenderer(item.playlistRenderer));
        if (item.itemSectionRenderer?.contents) {
          for (const inner of item.itemSectionRenderer.contents) {
            if (type === "video" && inner.videoRenderer)
              results.push(this.parseVideoRenderer(inner.videoRenderer));
            else if (type === "channel" && inner.channelRenderer)
              results.push(this.parseChannelRenderer(inner.channelRenderer));
            else if (type === "playlist" && inner.playlistRenderer)
              results.push(this.parsePlaylistRenderer(inner.playlistRenderer));
          }
        }
      }
    }
    return { results, continuationToken };
  }
  extractContinuationToken(data) {
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      if (section.continuationItemRenderer) {
        return section.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
      }
    }
    return null;
  }
  parseVideoRenderer(v) {
    return {
      type: "video",
      id: v.videoId,
      title: v.title?.runs?.[0]?.text,
      duration: v.lengthText?.simpleText,
      channel: { id: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId, name: v.ownerText?.runs?.[0]?.text },
      thumbnails: v.thumbnail?.thumbnails,
      publishedTime: v.publishedTimeText?.simpleText,
      viewCount: { text: v.viewCountText?.simpleText },
      link: `https://www.youtube.com/watch?v=${v.videoId}`
    };
  }
  parseChannelRenderer(c) {
    return {
      type: "channel",
      channelId: c.channelId,
      title: c.title?.simpleText,
      thumbnail: c.thumbnail?.thumbnails?.[0]?.url,
      subscriberCount: c.subscriberCountText?.simpleText,
      videoCount: c.videoCountText?.simpleText,
      url: `https://www.youtube.com/channel/${c.channelId}`
    };
  }
  parsePlaylistRenderer(p) {
    return {
      type: "playlist",
      playlistId: p.playlistId,
      title: p.title?.simpleText,
      thumbnail: p.thumbnails?.[0]?.thumbnails?.[0]?.url,
      videoCount: p.videoCount,
      author: p.shortBylineText?.runs?.[0]?.text,
      url: `https://www.youtube.com/playlist?list=${p.playlistId}`
    };
  }
  getStaticSuggestions(query) {
    return [query, `${query} video`, `${query} 2024`, `${query} tutorial`, `${query} song`];
  }
};

// Verome-API/src/helpers/response.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
function error(message, status = 400) {
  return json({ error: message }, status);
}

// Verome-API/src/helpers/cache.ts
var MemoryCache = class {
  store = /* @__PURE__ */ new Map();
  maxItems = 1e3;
  get(key) {
    const entry = this.store.get(key);
    if (!entry)
      return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key, value, ttlSeconds = 600) {
    if (this.store.size >= this.maxItems) {
      const firstKey = this.store.keys().next().value;
      if (firstKey)
        this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1e3
    });
  }
  clear() {
    this.store.clear();
  }
};
var apiCache = new MemoryCache();

// Verome-API/src/routes/search.ts
async function handleSearch(req, searchParams, ytmusic2, youtubeSearch2) {
  const query = searchParams.get("q") || "";
  const filter = searchParams.get("filter") || void 0;
  const continuationToken = searchParams.get("continuationToken") || void 0;
  const ignoreSpelling = searchParams.get("ignore_spelling") === "true";
  let region = searchParams.get("region") || searchParams.get("gl") || "IN";
  let language = searchParams.get("language") || searchParams.get("hl") || "en";
  if (!query && !continuationToken)
    return error("Missing 'q' or 'continuationToken'");
  const cacheKey = `search:${query}:${filter || "all"}:${region}:${language}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return json(cached);
  }
  const results = await ytmusic2.search(
    query,
    filter,
    continuationToken,
    ignoreSpelling,
    region,
    language
  );
  const responsePayload = { query, filter, region, language, ...results };
  apiCache.set(cacheKey, responsePayload, 600);
  return json(responsePayload);
}
async function handleSearchSuggestions(searchParams, ytmusic2, youtubeSearch2) {
  const query = searchParams.get("q")?.trim();
  if (!query)
    return error("Missing 'q'");
  const cacheKey = `sugg:${query.toLowerCase()}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return json({ suggestions: cached, source: "cache" });
  }
  const music = searchParams.get("music");
  const suggestions = music === "1" ? await ytmusic2.getSearchSuggestions(query) : await youtubeSearch2.getSuggestions(query);
  apiCache.set(cacheKey, suggestions, 1800);
  return json({ suggestions, source: music === "1" ? "youtube_music" : "youtube" });
}
async function handleYTSearch(searchParams, youtubeSearch2) {
  const query = searchParams.get("q");
  const filter = searchParams.get("filter") || "all";
  const continuationToken = searchParams.get("continuationToken") || void 0;
  if (!query && !continuationToken)
    return error("Missing 'q' or 'continuationToken'");
  const cacheKey = `yt:${query}:${filter}`;
  const cached = apiCache.get(cacheKey);
  if (cached)
    return json(cached);
  const results = [];
  let nextToken = null;
  if (continuationToken) {
    if (filter === "videos") {
      const r = await youtubeSearch2.searchVideos(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    } else if (filter === "channels") {
      const r = await youtubeSearch2.searchChannels(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    } else if (filter === "playlists") {
      const r = await youtubeSearch2.searchPlaylists(null, continuationToken);
      results.push(...r.results);
      nextToken = r.continuationToken;
    }
  } else if (query) {
    if (filter === "videos" || filter === "all") {
      const r = await youtubeSearch2.searchVideos(query);
      results.push(...r.results);
      nextToken = r.continuationToken;
    }
    if (filter === "channels" || filter === "all") {
      const r = await youtubeSearch2.searchChannels(query);
      results.push(...r.results);
      if (!nextToken)
        nextToken = r.continuationToken;
    }
    if (filter === "playlists" || filter === "all") {
      const r = await youtubeSearch2.searchPlaylists(query);
      results.push(...r.results);
      if (!nextToken)
        nextToken = r.continuationToken;
    }
  }
  const payload = { filter, query, results, continuationToken: nextToken };
  apiCache.set(cacheKey, payload, 600);
  return json(payload);
}

// Verome-API/src/helpers/router.ts
function matchRoute(pathname, pattern) {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length)
    return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// Verome-API/src/services/entities.ts
async function getSongComplete(videoId, ytmusic2) {
  const song = await ytmusic2.getSong(videoId);
  if (!song?.videoId)
    return { success: false, error: "Song not found" };
  const searchResults = await ytmusic2.search(`${song.title} ${song.author}`, "songs");
  const match = searchResults.results?.find((r) => r.videoId === videoId);
  return {
    success: true,
    song: { videoId: song.videoId, title: song.title, duration: song.lengthSeconds, thumbnail: song.thumbnail },
    artist: { name: song.author, browseId: match?.artists?.[0]?.id || null },
    album: match?.browseId?.startsWith("MPRE") ? { browseId: match.browseId } : null
  };
}
async function getAlbumComplete(browseId, ytmusic2) {
  const album = await ytmusic2.getAlbum(browseId);
  if (!album?.title && (!album?.tracks || album.tracks.length === 0)) {
    const pl = await ytmusic2.getPlaylist(browseId);
    if (pl?.tracks?.length) {
      return {
        success: true,
        album: { browseId, title: pl.title || "Album", year: "", thumbnail: pl.thumbnail, trackCount: pl.tracks.length },
        artist: { name: pl.author || pl.artist || "Artist", browseId: null },
        tracks: pl.tracks.map((t, i) => ({
          videoId: t.videoId,
          title: t.title,
          duration: t.duration,
          artist: t.artist || pl.author || pl.artist,
          trackNumber: i + 1
        }))
      };
    }
    return { success: false, error: "Album not found" };
  }
  return {
    success: true,
    album: {
      browseId: album.browseId,
      title: album.title || "Album",
      year: album.year || "",
      thumbnail: album.thumbnail,
      trackCount: album.trackCount || album.tracks?.length || 0
    },
    artist: { name: album.artist || "", browseId: null },
    tracks: (album.tracks || []).map((t, i) => ({
      videoId: t.videoId,
      title: t.title,
      duration: t.duration || "",
      artist: t.artist || t.artists && t.artists[0]?.name || album.artist,
      trackNumber: i + 1
    }))
  };
}
async function getArtistComplete(browseId, ytmusic2) {
  const artist = await ytmusic2.getArtist(browseId);
  if (!artist?.name)
    return { success: false, error: "Artist not found" };
  const allSongs = [...artist.topSongs || []];
  try {
    const fullSongsSearch = await ytmusic2.search(artist.name, "songs");
    if (fullSongsSearch?.results?.length) {
      allSongs.push(...fullSongsSearch.results);
    }
  } catch (err) {
    console.warn("Failed to fetch artist full songs catalog:", err);
  }
  const seenIds = /* @__PURE__ */ new Set();
  const dedupedSongs = allSongs.filter((s) => {
    if (!s?.videoId || seenIds.has(s.videoId))
      return false;
    seenIds.add(s.videoId);
    return true;
  });
  return {
    success: true,
    artist: {
      browseId: artist.browseId,
      name: artist.name,
      description: artist.description,
      thumbnail: artist.thumbnail,
      subscribers: artist.subscribers
    },
    topSongs: dedupedSongs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist || s.artists && s.artists[0]?.name || artist.name,
      thumbnail: s.thumbnails?.[0]?.url || s.thumbnail,
      duration: s.duration
    })),
    albums: artist.albums.map((a) => ({
      browseId: a.browseId,
      title: a.title,
      year: a.subtitle?.match(/\d{4}/)?.[0] || null,
      thumbnail: a.thumbnails?.[0]?.url
    })),
    singles: artist.singles.map((s) => ({
      browseId: s.browseId,
      title: s.title,
      year: s.subtitle?.match(/\d{4}/)?.[0] || null,
      thumbnail: s.thumbnails?.[0]?.url
    }))
  };
}
async function getFullChain(videoId, ytmusic2) {
  const songData = await getSongComplete(videoId, ytmusic2);
  if (!songData.success)
    return songData;
  const result = { success: true, song: songData.song, artist: songData.artist };
  if (songData.artist?.browseId) {
    const artistData = await getArtistComplete(songData.artist.browseId, ytmusic2);
    if (artistData.success) {
      result.artistDetails = { description: artistData.artist.description, subscribers: artistData.artist.subscribers, thumbnail: artistData.artist.thumbnail };
      result.discography = { albums: artistData.albums, singles: artistData.singles };
      result.otherSongs = artistData.topSongs.filter((s) => s.videoId !== videoId).slice(0, 5);
    }
  }
  return result;
}

// Verome-API/src/routes/content.ts
async function handleContentRoutes(pathname, searchParams, ytmusic2) {
  let params;
  params = matchRoute(pathname, "/api/songs/:videoId");
  if (params)
    return json(await getSongComplete(params.videoId, ytmusic2));
  params = matchRoute(pathname, "/api/albums/:browseId");
  if (params)
    return json(await getAlbumComplete(params.browseId, ytmusic2));
  params = matchRoute(pathname, "/api/album/:id");
  if (params)
    return json(await getAlbumComplete(params.id, ytmusic2));
  params = matchRoute(pathname, "/api/artists/:browseId");
  if (params)
    return json(await getArtistComplete(params.browseId, ytmusic2));
  if (pathname !== "/api/artist/info") {
    params = matchRoute(pathname, "/api/artist/:artistId");
    if (params) {
      const country = searchParams.get("country") || "US";
      return json(await ytmusic2.getArtistSummary(params.artistId, country));
    }
  }
  params = matchRoute(pathname, "/api/playlists/:playlistId");
  if (params)
    return json(await ytmusic2.getPlaylist(params.playlistId));
  params = matchRoute(pathname, "/api/playlist/:id");
  if (params)
    return json(await ytmusic2.getPlaylist(params.id));
  params = matchRoute(pathname, "/api/related/:id");
  if (params)
    return json({ success: true, data: await ytmusic2.getRelated(params.id) });
  params = matchRoute(pathname, "/api/chain/:videoId");
  if (params)
    return json(await getFullChain(params.videoId, ytmusic2));
  return null;
}

// Verome-API/src/services/lastfm.ts
var getEnv = (key) => {
  try {
    if (typeof Deno !== "undefined")
      return Deno.env.get(key);
    if (typeof process !== "undefined")
      return process.env?.[key];
  } catch {
  }
  return void 0;
};
var API_KEY = getEnv("LASTFM_API_KEY") || atob("MDg2N2JjYjZmMzZjODc5Mzk4OTY5ZGI2ODJhN2I2OWI=");
var LastFM = {
  API_KEY,
  async getSimilarTracks(title, artist, limit = "5") {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${API_KEY}&limit=${limit}&format=json`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data?.error)
        return { error: data.message || "Last.fm error" };
      return (data?.similartracks?.track || []).map((t) => ({ title: t.name, artist: t?.artist?.name })).filter((t) => t.title && t.artist);
    } catch {
      return { error: "Failed to fetch similar tracks" };
    }
  }
};
async function getArtistInfo(artist) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    if (data?.error)
      return { success: false, error: data.message };
    const a = data?.artist;
    return {
      success: true,
      name: a?.name,
      bio: a?.bio?.summary?.replace(/<[^>]*>/g, ""),
      tags: a?.tags?.tag?.map((t) => t.name) || [],
      similar: a?.similar?.artist?.map((s) => s.name) || [],
      stats: { listeners: a?.stats?.listeners, playcount: a?.stats?.playcount },
      image: a?.image?.find((i) => i.size === "large")?.["#text"]
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getTrackInfo(title, artist) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${API_KEY}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    if (data?.error)
      return { success: false, error: data.message };
    const t = data?.track;
    return {
      success: true,
      name: t?.name,
      artist: t?.artist?.name,
      album: t?.album?.title,
      duration: t?.duration,
      listeners: t?.listeners,
      playcount: t?.playcount,
      tags: t?.toptags?.tag?.map((tag) => tag.name) || [],
      wiki: t?.wiki?.summary?.replace(/<[^>]*>/g, "")
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getTopArtists(country, limit) {
  if (!country) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${API_KEY}&limit=${limit}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    const artists = data?.artists?.artist || [];
    return {
      success: true,
      country: "Global",
      artists: artists.map((a) => ({
        name: a.name,
        playcount: a.playcount,
        listeners: a.listeners,
        url: a.url,
        image: a.image?.find((i) => i.size === "large")?.["#text"]
      }))
    };
  }
  return null;
}
async function getTopTracks(country, limit) {
  if (!country) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${API_KEY}&limit=${limit}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    const tracks = data?.tracks?.track || [];
    return {
      success: true,
      country: "Global",
      tracks: tracks.map((t) => ({
        name: t.name,
        artist: t.artist?.name,
        playcount: t.playcount,
        listeners: t.listeners,
        url: t.url
      }))
    };
  }
  return null;
}

// Verome-API/src/services/discovery.ts
async function getTrendingMusic(country = "United States", ytmusic2) {
  try {
    if (ytmusic2) {
      const searchQueries = [
        `${country}n music 2026`,
        `${country}n songs`,
        `${country}n hits`,
        `popular ${country}n music`,
        `new ${country}n songs 2026`
      ];
      const allTracks = [];
      const seenIds = /* @__PURE__ */ new Set();
      for (const query of searchQueries) {
        if (allTracks.length >= 30)
          break;
        const results = await ytmusic2.search(query, "songs");
        if (results.results) {
          for (const t of results.results) {
            if (t.videoId && !seenIds.has(t.videoId)) {
              seenIds.add(t.videoId);
              allTracks.push({
                name: t.title,
                artist: t.artists?.map((a) => a.name).join(", "),
                videoId: t.videoId,
                thumbnail: t.thumbnails?.[0]?.url,
                duration: t.duration
              });
            }
            if (allTracks.length >= 30)
              break;
          }
        }
      }
      if (allTracks.length > 0) {
        return { success: true, country, tracks: allTracks };
      }
    }
    return { success: false, error: "Could not fetch trending" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getRadio(videoId, ytmusic2) {
  try {
    const data = await ytmusic2.getWatchPlaylist(videoId, void 0, true, false, 50);
    if (data.tracks && data.tracks.length > 0) {
      return { success: true, seedVideoId: videoId, tracks: data.tracks };
    }
    return { success: false, error: "Could not generate radio" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getTopArtists2(country, limit = 20, ytmusic2) {
  try {
    if (country && ytmusic2) {
      const searchQueries = [
        `${country}n artist`,
        `${country}n singer`,
        `${country}n rapper`,
        `${country}n musician`,
        `artist from ${country}`,
        `singer from ${country}`
      ];
      const allArtists = [];
      const seenIds = /* @__PURE__ */ new Set();
      for (const query of searchQueries) {
        if (allArtists.length >= limit)
          break;
        const results = await ytmusic2.search(query, "artists");
        if (results.results) {
          for (const a of results.results) {
            if (a.browseId && !seenIds.has(a.browseId)) {
              seenIds.add(a.browseId);
              allArtists.push({ name: a.title, browseId: a.browseId, thumbnail: a.thumbnails?.[0]?.url });
            }
            if (allArtists.length >= limit)
              break;
          }
        }
      }
      if (allArtists.length > 0) {
        return { success: true, country, artists: allArtists.slice(0, limit) };
      }
    }
    return await getTopArtists(void 0, limit);
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getTopTracks2(country, limit = 20, ytmusic2) {
  try {
    if (country && ytmusic2) {
      const searchQueries = [
        `${country}n music`,
        `${country}n songs`,
        `${country}n rap`,
        `${country}n hits 2026`,
        `music from ${country}`,
        `songs from ${country}`
      ];
      const allTracks = [];
      const seenIds = /* @__PURE__ */ new Set();
      for (const query of searchQueries) {
        if (allTracks.length >= limit)
          break;
        const results = await ytmusic2.search(query, "songs");
        if (results.results) {
          for (const t of results.results) {
            if (t.videoId && !seenIds.has(t.videoId)) {
              seenIds.add(t.videoId);
              allTracks.push({
                name: t.title,
                artist: t.artists?.map((a) => a.name).join(", "),
                videoId: t.videoId,
                thumbnail: t.thumbnails?.[0]?.url,
                duration: t.duration
              });
            }
            if (allTracks.length >= limit)
              break;
          }
        }
      }
      if (allTracks.length > 0) {
        return { success: true, country, tracks: allTracks.slice(0, limit) };
      }
    }
    return await getTopTracks(void 0, limit);
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function getSimilarTracks(title, artist, limit, youtubeSearch2) {
  const similar = await LastFM.getSimilarTracks(title, artist, limit);
  if ("error" in similar)
    return { error: similar.error };
  const ytResults = await Promise.all(
    similar.map(async (t) => {
      const r = await youtubeSearch2.searchVideos(`${t.title} ${t.artist}`);
      return r.results[0] || null;
    })
  );
  return ytResults.filter(Boolean);
}

// Verome-API/src/routes/discover.ts
async function handleDiscoverRoutes(pathname, searchParams, ytmusic2, youtubeSearch2) {
  const cacheKey = `disc:${pathname}:${searchParams.toString()}`;
  const cached = apiCache.get(cacheKey);
  if (cached)
    return json(cached);
  if (pathname === "/api/charts") {
    const res = await ytmusic2.getCharts(searchParams.get("country") || "IN");
    apiCache.set(cacheKey, res, 1200);
    return json(res);
  }
  if (pathname === "/api/moods") {
    const res = await ytmusic2.getMoodCategories();
    apiCache.set(cacheKey, res, 3600);
    return json(res);
  }
  const moodParams = matchRoute(pathname, "/api/moods/:categoryId");
  if (moodParams) {
    const res = await ytmusic2.getMoodPlaylists(moodParams.categoryId);
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }
  if (pathname === "/api/watch_playlist") {
    const videoId = searchParams.get("videoId") || void 0;
    const playlistId = searchParams.get("playlistId") || void 0;
    if (!videoId && !playlistId)
      return error("Provide videoId or playlistId");
    const res = await ytmusic2.getWatchPlaylist(
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
    const res = await getTrendingMusic(country, ytmusic2);
    apiCache.set(cacheKey, res, 900);
    return json(res);
  }
  if (pathname === "/api/radio") {
    const videoId = searchParams.get("videoId");
    if (!videoId)
      return error("Missing videoId");
    const res = await getRadio(videoId, ytmusic2);
    apiCache.set(cacheKey, res, 1200);
    return json(res);
  }
  if (pathname === "/api/similar") {
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");
    if (!title || !artist)
      return error("Missing title or artist");
    const result = await getSimilarTracks(
      title,
      artist,
      searchParams.get("limit") || "5",
      youtubeSearch2
    );
    if ("error" in result)
      return json({ error: result.error }, 500);
    apiCache.set(cacheKey, result, 1800);
    return json(result);
  }
  if (pathname === "/api/top/artists") {
    const res = await getTopArtists2(
      searchParams.get("country") || "IN",
      parseInt(searchParams.get("limit") || "20"),
      ytmusic2
    );
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }
  if (pathname === "/api/top/tracks") {
    const res = await getTopTracks2(
      searchParams.get("country") || "IN",
      parseInt(searchParams.get("limit") || "20"),
      ytmusic2
    );
    apiCache.set(cacheKey, res, 1800);
    return json(res);
  }
  return null;
}

// Verome-API/src/services/streaming.ts
var instancesCache = null;
var instancesCacheTime = 0;
var CACHE_DURATION = 5 * 60 * 1e3;
var PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.darkness.services",
  "https://pipedapi.r4fo.com",
  "https://api.piped.yt",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
  "https://api.piped.projectsegfau.lt",
  "https://pipedapi.leptons.xyz"
];
async function getDynamicInstances() {
  const now = Date.now();
  if (instancesCache && now - instancesCacheTime < CACHE_DURATION) {
    return instancesCache;
  }
  try {
    const response = await fetch("https://raw.githubusercontent.com/n-ce/Uma/main/dynamic_instances.json");
    const data = await response.json();
    data.piped = PIPED_INSTANCES;
    instancesCache = data;
    instancesCacheTime = now;
    return instancesCache;
  } catch {
    return {
      piped: PIPED_INSTANCES,
      invidious: ["https://y.com.sb", "https://inv.nadeko.net"]
    };
  }
}
async function fetchFromPiped(videoId) {
  const instances = await getDynamicInstances();
  const pipedInstances = instances.piped || [];
  for (const instance of pipedInstances) {
    try {
      const response = await fetch(`${instance}/streams/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const data = await response.json();
      if (data?.error)
        continue;
      if (data?.audioStreams?.length) {
        const instanceUrl = new URL(instance);
        const proxyHost = instanceUrl.host.replace("pipedapi", "pipedproxy").replace("api.", "proxy.");
        return {
          success: true,
          instance,
          streamingUrls: data.audioStreams.map((s) => ({
            url: s.url,
            quality: s.quality,
            mimeType: s.mimeType,
            bitrate: s.bitrate,
            proxyHost
          })),
          metadata: {
            id: videoId,
            title: data.title,
            uploader: data.uploader,
            thumbnail: data.thumbnailUrl,
            duration: data.duration,
            views: data.views
          },
          hlsUrl: data.hls
        };
      }
    } catch {
      continue;
    }
  }
  return { success: false, error: "No working Piped instances found" };
}
async function fetchFromInvidious(videoId) {
  const instances = await getDynamicInstances();
  const invidiousInstances = instances.invidious || [];
  for (const instance of invidiousInstances) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${videoId}`);
      const data = await response.json();
      if (data) {
        const audioFormats = (data.adaptiveFormats || []).filter(
          (f) => f.type?.includes("audio") || f.mimeType?.includes("audio")
        );
        return {
          success: true,
          instance,
          streamingUrls: audioFormats.map((f) => ({
            url: `${instance}/latest_version?id=${videoId}&itag=${f.itag}`,
            directUrl: f.url,
            bitrate: f.bitrate,
            type: f.type,
            audioQuality: f.audioQuality,
            itag: f.itag
          })),
          metadata: {
            id: videoId,
            title: data.title,
            author: data.author,
            thumbnail: data.videoThumbnails?.[0]?.url,
            lengthSeconds: data.lengthSeconds,
            viewCount: data.viewCount
          }
        };
      }
    } catch {
      continue;
    }
  }
  return { success: false, error: "No working Invidious instances found" };
}

// Verome-API/src/routes/stream.ts
async function handleStream(searchParams) {
  const id = searchParams.get("id");
  if (!id)
    return error("Missing id");
  const piped = await fetchFromPiped(id);
  if (piped.success) {
    return json({
      success: true,
      service: "piped",
      instance: piped.instance,
      streamingUrls: piped.streamingUrls,
      metadata: piped.metadata,
      requestedId: id,
      timestamp: new Date().toISOString()
    });
  }
  const invidious = await fetchFromInvidious(id);
  if (invidious.success) {
    return json({
      success: true,
      service: "invidious",
      instance: invidious.instance,
      streamingUrls: invidious.streamingUrls,
      metadata: invidious.metadata,
      requestedId: id,
      timestamp: new Date().toISOString()
    });
  }
  return json({ success: false, error: "No streaming data found" }, 404);
}
async function handleAudioStream(searchParams) {
  const query = searchParams.get("query") || searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  if (!query)
    return error("Missing query");

  try {
    const cleanQuery = query.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
    const searchTerm = `${cleanQuery} ${artist}`.trim();
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=5&p=1&_marker=0&ctx=web6dot0&q=${encodeURIComponent(searchTerm)}`;
    const sRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const sData = await sRes.json();
    let item = sData?.results?.[0];

    // If not found with artist, try clean query alone
    if (!item?.encrypted_media_url && artist) {
      const fallbackUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=5&p=1&_marker=0&ctx=web6dot0&q=${encodeURIComponent(cleanQuery)}`;
      const fRes = await fetch(fallbackUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const fData = await fRes.json();
      item = fData?.results?.[0];
    }

    if (!item?.encrypted_media_url) {
      // Fallback to autocomplete if search.getResults didn't find encrypted_media_url
      const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(cleanQuery)}`;
      const aRes = await fetch(autoUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const aData = await aRes.json();
      const song = aData?.songs?.data?.[0];
      if (song?.id) {
        const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${song.id}`;
        const dRes = await fetch(detailsUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        const dData = await dRes.json();
        item = dData[song.id];
      }
    }

    if (!item?.encrypted_media_url) {
      return json({ success: false, error: "Song not found in direct index" }, 404);
    }

    const key = CryptoJS.enc.Utf8.parse("38346591");
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(item.encrypted_media_url) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    let streamUrl = decrypted.toString(CryptoJS.enc.Utf8);
    if (!streamUrl) {
      return json({ success: false, error: "Decryption failed" }, 500);
    }

    // Upgrade to 320kbps high fidelity audio
    streamUrl = streamUrl.replace("_96.mp4", "_320.mp4");

    return json({
      success: true,
      streamUrl,
      title: item.song || item.title,
      artist: item.primary_artists || item.singers || artist,
      duration: parseInt(item.duration, 10) || 0,
      artwork: item.image ? item.image.replace("150x150", "500x500") : null
    });
  } catch (err) {
    return json({ success: false, error: String(err) }, 500);
  }
}
async function handleProxy(searchParams, req) {
  const audioUrl = searchParams.get("url");
  if (!audioUrl)
    return error("Missing url");
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
      "Referer": "https://www.youtube.com/",
      "Origin": "https://www.youtube.com"
    };
    const rangeHeader = req.headers.get("Range");
    if (rangeHeader)
      headers["Range"] = rangeHeader;
    const response = await fetch(audioUrl, { headers });
    if (!response.ok && response.status !== 206) {
      return new Response(`Failed: ${response.status}`, { status: 502, headers: corsHeaders });
    }
    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    responseHeaders.set("Cache-Control", "public, max-age=3600");
    responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "audio/mp4");
    if (response.headers.get("Content-Length"))
      responseHeaders.set("Content-Length", response.headers.get("Content-Length"));
    if (response.headers.get("Content-Range"))
      responseHeaders.set("Content-Range", response.headers.get("Content-Range"));
    responseHeaders.set("Accept-Ranges", response.headers.get("Accept-Ranges") || "bytes");
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (err) {
    return new Response("Proxy error: " + String(err), { status: 502, headers: corsHeaders });
  }
}
async function handleMusicFind(searchParams, ytmusic2) {
  const name = searchParams.get("name"), artist = searchParams.get("artist");
  if (!name || !artist)
    return error("Missing name and artist");
  const searchResults = await ytmusic2.search(`${name} ${artist}`, "songs");
  if (!searchResults.results?.length)
    return json({ success: false, error: "Song not found" }, 404);
  const normalize = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
  const nName = normalize(name);
  const artistsList = artist.split(",").map((a) => normalize(a));
  const match = searchResults.results.find((song) => {
    const nSongName = normalize(song.title || "");
    const songArtists = (song.artists || []).map((a) => normalize(a.name || ""));
    return (nSongName.includes(nName) || nName.includes(nSongName)) && artistsList.some((a) => songArtists.some((sa) => sa.includes(a) || a.includes(sa)));
  });
  return match ? json({ success: true, data: match }) : json({ success: false, error: "Song not found" }, 404);
}

// Indic Script to English Transliteration (Keeping Devanagari Hindi as Hindi)
const INDIC_CHAR_MAP = {
  // Gurmukhi (Punjabi)
  'ਅ': 'a', 'ਆ': 'aa', 'ਇ': 'i', 'ਈ': 'ee', 'ਉ': 'u', 'ਊ': 'oo', 'ਏ': 'e', 'ਐ': 'ai', 'ਓ': 'o', 'ਔ': 'au',
  'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'ng', 'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'ny',
  'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n', 'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm', 'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ੜ': 'r',
  'ਸ਼': 'sh', 'ਸ': 's', 'ਹ': 'h', 'ਾ': 'aa', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'ੇ': 'e', 'ੈ': 'ai',
  'ੋ': 'o', 'ੌ': 'au', 'ੰ': 'n', 'ਂ': 'n', 'ੱ': '', '੍': '',
  // Tamil
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oa', 'ஔ': 'au',
  'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm',
  'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oa', 'ௌ': 'au', '்': '',
  // Telugu
  'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo', 'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oa', 'ఔ': 'au',
  'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n',
  'త': 'th', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n', 'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm', 'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v',
  'శ': 'sh', 'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l', 'ా': 'aa', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo', 'ె': 'e', 'ే': 'ae', 'ై': 'ai', 'ొ': 'o', 'ో': 'oa', 'ౌ': 'au', '్': '', 'ం': 'm',
  // Malayalam
  'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'എ': 'e', 'ഏ': 'ae', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oa', 'ഔ': 'au',
  'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ങ': 'ng', 'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ഝ': 'jh', 'ഞ': 'ny',
  'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n', 'ത': 'th', 'ഥ': 'th', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',
  'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm', 'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ശ': 'sh', 'ഷ': 'sh', 'സ': 's', 'ഹ': 'h', 'ള': 'l',
  'ാ': 'aa', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'െ': 'e', 'േ': 'ae', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'oa', 'ൌ': 'au', '്': '', 'ം': 'm',
  // Kannada
  'ಅ': 'a', 'ಆ': 'aa', 'ಇ': 'i', 'ಈ': 'ee', 'ಉ': 'u', 'ಊ': 'oo', 'ಎ': 'e', 'ಏ': 'ae', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'oa', 'ಔ': 'au',
  'ಕ': 'k', 'ಖ': 'kh', 'ಗ': 'g', 'ಘ': 'gh', 'ಙ': 'ng', 'ಚ': 'ch', 'ಛ': 'chh', 'ಜ': 'j', 'ಝ': 'jh', 'ಞ': 'ny',
  'ಟ': 't', 'ಠ': 'th', 'ಡ': 'd', 'ಢ': 'dh', 'ಣ': 'n', 'ತ': 'th', 'ಥ': 'th', 'ದ': 'd', 'ಧ': 'dh', 'ನ': 'n',
  'ಪ': 'p', 'ಫ': 'ph', 'ಬ': 'b', 'ಭ': 'bh', 'ಮ': 'm', 'ಯ': 'y', 'ರ': 'r', 'ಲ': 'l', 'ವ': 'v', 'ಶ': 'sh', 'ಷ': 'sh', 'ಸ': 's', 'ಹ': 'h', 'ಳ': 'l',
  'ಾ': 'aa', 'ಿ': 'i', 'ೀ': 'ee', 'ು': 'u', 'ೂ': 'oo', 'ೆ': 'e', 'ೇ': 'ae', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'oa', 'ೌ': 'au', '್': '', 'ಂ': 'm',
  // Bengali
  'অ': 'o', 'আ': 'aa', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ഘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ত': 't', 'থ': 'th', 'দ': 'd', 'ಧ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm', 'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'া': 'aa', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ൂ': 'oo', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', '্': '', 'ং': 'ng',
  // Gujarati
  'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
  'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n', 'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l', 'ા': 'aa', 'િ': 'i', 'ી': 'ee', 'ુ': 'u', 'ૂ': 'oo', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', '્': '', 'ં': 'n'
};

function formatLyricsByLang(text) {
  if (!text || typeof text !== 'string') return text;
  // If Devanagari Hindi only, leave as Hindi!
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasNonHindiIndic = /[\u0980-\u0D7F]/.test(text);
  if (hasHindi && !hasNonHindiIndic) return text;
  if (!hasNonHindiIndic) return text;

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += INDIC_CHAR_MAP[ch] !== undefined ? INDIC_CHAR_MAP[ch] : ch;
  }
  return out;
}

// Verome-API/src/services/lyrics.ts
async function getLyrics(title, artist, duration) {
  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    if (duration)
      url += `&duration=${duration}`;
    let response = await fetch(url);
    let data = await response.json();
    if (!data || data.statusCode === 404) {
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`;
      response = await fetch(searchUrl);
      const results = await response.json();
      if (Array.isArray(results) && results.length > 0) {
        // For non-Hindi songs, prefer Romanized/English results if available
        const englishResult = results.find(
          (r) =>
            (r.syncedLyrics || r.plainLyrics) &&
            /[a-zA-Z]/.test(r.syncedLyrics || r.plainLyrics) &&
            !/[\u0980-\u0D7F]/.test(r.syncedLyrics || r.plainLyrics)
        );
        data = englishResult || results[0];
      }
    }
    if (!data || data.statusCode) {
      return { success: false, error: "Lyrics not found" };
    }
    return {
      success: true,
      trackName: data.trackName,
      artistName: data.artistName,
      albumName: data.albumName,
      duration: data.duration,
      plainLyrics: formatLyricsByLang(data.plainLyrics),
      syncedLyrics: formatLyricsByLang(data.syncedLyrics)
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Verome-API/src/routes/info.ts
async function handleInfoRoutes(pathname, searchParams) {
  if (pathname === "/api/lyrics") {
    const title = searchParams.get("title"), artist = searchParams.get("artist");
    if (!title || !artist)
      return error("Missing title and artist");
    return json(await getLyrics(title, artist, searchParams.get("duration") ? parseInt(searchParams.get("duration")) : void 0));
  }
  if (pathname === "/api/artist/info") {
    const artist = searchParams.get("artist");
    if (!artist)
      return error("Missing artist");
    return json(await getArtistInfo(artist));
  }
  if (pathname === "/api/track/info") {
    const title = searchParams.get("title"), artist = searchParams.get("artist");
    if (!title || !artist)
      return error("Missing title and artist");
    return json(await getTrackInfo(title, artist));
  }
  return null;
}

// Verome-API/src/routes/feed.ts
async function handleFeedRoutes(pathname, searchParams) {
  if (pathname === "/api/feed/unauthenticated" || pathname.startsWith("/api/feed/channels=")) {
    let channelsParam = searchParams.get("channels");
    if (pathname.startsWith("/api/feed/channels=")) {
      channelsParam = pathname.replace("/api/feed/channels=", "").split("?")[0];
    }
    if (!channelsParam)
      return error("No channel IDs provided");
    const channelIds = channelsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const preview = searchParams.get("preview") === "1";
    const results = [];
    for (const channelId of channelIds) {
      results.push(...await fetchChannelVideos(channelId, preview ? 5 : void 0));
    }
    return json(results.filter((item) => !item.isShort).sort((a, b) => Number(b.uploaded) - Number(a.uploaded)));
  }
  return null;
}
async function fetchChannelVideos(channelId, limit) {
  try {
    const response = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browseId: channelId,
        context: { client: { clientName: "WEB", clientVersion: "2.20251013.01.00", hl: "en", gl: "US" } }
      })
    });
    const data = await response.json();
    const items = [];
    const channelName = data?.header?.c4TabbedHeaderRenderer?.title || data?.metadata?.channelMetadataRenderer?.title || "";
    const extractVideos = (contents) => {
      if (!contents)
        return;
      for (const item of contents) {
        const video = item?.richItemRenderer?.content?.videoRenderer || item?.videoRenderer || item?.gridVideoRenderer;
        if (video?.videoId)
          items.push(parseVideo(video, channelId, channelName));
        if (item?.shelfRenderer?.content?.expandedShelfContentsRenderer?.items)
          extractVideos(item.shelfRenderer.content.expandedShelfContentsRenderer.items);
        if (item?.itemSectionRenderer?.contents)
          extractVideos(item.itemSectionRenderer.contents);
        if (limit && items.length >= limit)
          return;
      }
    };
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    for (const tab of tabs) {
      extractVideos(tab?.tabRenderer?.content?.sectionListRenderer?.contents || tab?.tabRenderer?.content?.richGridRenderer?.contents || []);
    }
    return items.slice(0, limit || items.length);
  } catch {
    return [];
  }
}
function parseVideo(video, channelId, channelName) {
  const id = video?.videoId || "";
  const title = video?.title?.runs?.[0]?.text || video?.title?.simpleText || "";
  let duration = 0;
  const durationText = video?.lengthText?.simpleText || video?.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "";
  if (durationText) {
    const parts = durationText.split(":").map((p) => parseInt(p) || 0);
    if (parts.length === 2)
      duration = parts[0] * 60 + parts[1];
    else if (parts.length === 3)
      duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  let views = 0;
  const viewText = video?.viewCountText?.simpleText || "";
  const match = viewText.match(/([\d,\.]+)([KMB]?)/);
  if (match) {
    let num = parseFloat(match[1].replace(/,/g, ""));
    if (match[2] === "K")
      num *= 1e3;
    else if (match[2] === "M")
      num *= 1e6;
    else if (match[2] === "B")
      num *= 1e9;
    views = Math.floor(num);
  }
  let uploaded = Date.now();
  const timeText = (video?.publishedTimeText?.simpleText || "").toLowerCase();
  if (timeText.includes("hour"))
    uploaded -= parseInt(timeText.match(/(\d+)/)?.[1] || "1") * 36e5;
  else if (timeText.includes("day"))
    uploaded -= parseInt(timeText.match(/(\d+)/)?.[1] || "1") * 864e5;
  else if (timeText.includes("week"))
    uploaded -= parseInt(timeText.match(/(\d+)/)?.[1] || "1") * 6048e5;
  else if (timeText.includes("month"))
    uploaded -= parseInt(timeText.match(/(\d+)/)?.[1] || "1") * 2592e6;
  else if (timeText.includes("year"))
    uploaded -= parseInt(timeText.match(/(\d+)/)?.[1] || "1") * 31536e6;
  return {
    id,
    authorId: channelId,
    duration: duration.toString(),
    author: channelName,
    views: views.toString(),
    uploaded: uploaded.toString(),
    title,
    isShort: duration > 0 && duration <= 60,
    thumbnail: video?.thumbnail?.thumbnails?.slice(-1)[0]?.url || ""
  };
}

// Verome-API/src/routes/auth.ts
const CLOUD_DB_ID = 'ff808181a09d98f701a1b064284550e3';
const CLOUD_DB_ENDPOINT = `https://api.restful-api.dev/objects/${CLOUD_DB_ID}`;

function getDbPaths() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'data');
  const dbFile = path.resolve(dataDir, 'users.json');
  return { dataDir, dbFile };
}

var usersCache = {};
var isLoaded = false;
var lastCloudFetch = 0;

async function ensureDB(force = false) {
  const now = Date.now();
  // If memory cache was updated within last 5 seconds and force is false, it is fresh
  if (!force && isLoaded && now - lastCloudFetch < 5000) return;

  // 1. Fetch from durable cloud database first (persists across all Vercel/Render serverless restarts!)
  try {
    const res = await fetch(CLOUD_DB_ENDPOINT);
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.users && typeof json.data.users === 'object') {
        usersCache = { ...usersCache, ...json.data.users };
        isLoaded = true;
        lastCloudFetch = now;
        return;
      }
    }
  } catch (err) {
    console.warn('Cloud DB fetch failed, falling back to local storage:', err);
  }

  // 2. Fallback to local disk if cloud has network issue
  const { dataDir, dbFile } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (e) {}
  try {
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(content);
      usersCache = { ...usersCache, ...parsed };
    }
  } catch (e) {}
  isLoaded = true;
}

async function persistDB() {
  // 1. Write to local disk cache
  const { dataDir, dbFile } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbFile, JSON.stringify(usersCache, null, 2), 'utf-8');
  } catch (err) {}

  // 2. Fetch latest from cloud database to ensure no concurrent user data is ever overwritten
  let mergedUsers = { ...usersCache };
  try {
    const res = await fetch(CLOUD_DB_ENDPOINT);
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.users && typeof json.data.users === 'object') {
        mergedUsers = { ...json.data.users, ...usersCache };
        usersCache = mergedUsers;
      }
    }
  } catch (e) {
    console.warn('Pre-persist cloud fetch warning:', e);
  }

  // 3. Persist to cloud database
  try {
    await fetch(CLOUD_DB_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dhun_users_db',
        data: { users: mergedUsers },
      }),
    });
  } catch (err) {
    console.error('Failed to persist users to cloud DB:', err);
  }
}

async function handleAuthLogin(req) {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  let body = {};
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body');
  }
  const { phone, pin, name, avatar, favorites, playlists, favoriteArtists, themeMode } = body;
  if (!phone || typeof phone !== 'string') return error('Mobile number is required');
  if (!pin || typeof pin !== 'string' || pin.length !== 4) return error('4-digit PIN is required');
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return error('Please provide a valid 10-digit Indian mobile number');

  await ensureDB(true);
  let user = usersCache[cleanPhone];

  if (user) {
    if (user.pin !== pin) {
      return error('Incorrect 4-digit PIN. Please try again.', 401);
    }
    if (name && name.trim()) user.name = name.trim();
    if (avatar && avatar.trim()) user.avatar = avatar.trim();

    // Smart-merge favorites if passed from client
    if (Array.isArray(favorites) && favorites.length > 0) {
      const favMap = new Map();
      (user.favorites || []).forEach(f => { if (f && f.videoId) favMap.set(f.videoId, f); });
      favorites.forEach(f => { if (f && f.videoId) favMap.set(f.videoId, f); });
      user.favorites = Array.from(favMap.values());
    }

    // Smart-merge playlists if passed from client (guaranteeing tracks is array)
    if (Array.isArray(playlists) && playlists.length > 0) {
      const plMap = new Map();
      (user.playlists || []).forEach(p => {
        if (p && (p.id || p.title)) {
          plMap.set(p.id || p.title, {
            ...p,
            tracks: Array.isArray(p.tracks) ? p.tracks : []
          });
        }
      });
      playlists.forEach(p => {
        if (p && (p.id || p.title)) {
          const key = p.id || p.title;
          const sanitizedTracks = Array.isArray(p.tracks) ? p.tracks : [];
          const existing = plMap.get(key);
          if (existing) {
            const trackMap = new Map();
            (existing.tracks || []).forEach(t => { if (t && t.videoId) trackMap.set(t.videoId, t); });
            sanitizedTracks.forEach(t => { if (t && t.videoId) trackMap.set(t.videoId, t); });
            plMap.set(key, { ...existing, ...p, tracks: Array.from(trackMap.values()) });
          } else {
            plMap.set(key, { ...p, tracks: sanitizedTracks });
          }
        }
      });
      user.playlists = Array.from(plMap.values());
    }

    if (Array.isArray(favoriteArtists) && favoriteArtists.length > 0) {
      const artSet = new Set([...(user.favoriteArtists || []), ...favoriteArtists]);
      user.favoriteArtists = Array.from(artSet);
    }

    user.updatedAt = Date.now();
    usersCache[cleanPhone] = user;
    await persistDB();
  } else {
    const chosenAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`;
    const initialFavs = Array.isArray(favorites) ? favorites.filter(f => f && f.videoId) : [];
    const initialPlaylists = Array.isArray(playlists) && playlists.length > 0
      ? playlists.map(p => ({
          ...p,
          tracks: Array.isArray(p.tracks) ? p.tracks : []
        }))
      : [
          {
            id: `pl-${Date.now()}-1`,
            title: 'My Favorite Songs',
            description: 'Personal playlist',
            cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
            tracks: [],
            createdAt: Date.now(),
          },
        ];
    user = {
      phone: cleanPhone,
      pin,
      name: (name && name.trim()) || `User +91-${cleanPhone.slice(-4)}`,
      avatar: chosenAvatar,
      joinedAt: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      favorites: initialFavs,
      playlists: initialPlaylists,
      favoriteArtists: Array.isArray(favoriteArtists) ? favoriteArtists : [],
      themeMode: themeMode || 'dark',
      updatedAt: Date.now(),
    };
    usersCache[cleanPhone] = user;
    await persistDB();
  }

  const cleanPlaylists = (user.playlists || []).map(p => ({
    ...p,
    tracks: Array.isArray(p.tracks) ? p.tracks : []
  }));

  return json({
    success: true,
    user: {
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      joinedAt: user.joinedAt,
    },
    favorites: user.favorites || [],
    playlists: cleanPlaylists,
    favoriteArtists: user.favoriteArtists || [],
    themeMode: user.themeMode || 'dark',
  });
}

async function handleAuthSync(req) {
  if (req.method !== 'POST') return error('Method not allowed', 405);
  let body = {};
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body');
  }
  const { phone, pin, favorites, playlists, favoriteArtists, themeMode } = body;
  if (!phone || !pin) return error('Phone and PIN required for sync', 400);
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  await ensureDB(true);
  const user = usersCache[cleanPhone];
  if (!user || user.pin !== pin) {
    return error('Unauthorized sync: invalid credentials', 401);
  }
  if (Array.isArray(favorites)) {
    user.favorites = favorites.filter(f => f && f.videoId);
  }
  if (Array.isArray(playlists)) {
    user.playlists = playlists.map(p => ({
      ...p,
      tracks: Array.isArray(p.tracks) ? p.tracks : []
    }));
  }
  if (Array.isArray(favoriteArtists)) user.favoriteArtists = favoriteArtists;
  if (themeMode) user.themeMode = themeMode;
  user.updatedAt = Date.now();
  usersCache[cleanPhone] = user;
  await persistDB();
  return json({
    success: true,
    message: 'Cloud database synced successfully',
    updatedAt: user.updatedAt,
  });
}

async function handleAuthProfile(searchParams) {
  const phone = searchParams.get('phone');
  const pin = searchParams.get('pin');
  if (!phone || !pin) return error('Phone and PIN required', 400);
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  await ensureDB(true);
  const user = usersCache[cleanPhone];
  if (!user || user.pin !== pin) {
    return error('Invalid phone or PIN', 401);
  }
  return json({
    success: true,
    user: {
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      joinedAt: user.joinedAt,
    },
    favorites: user.favorites || [],
    playlists: (user.playlists || []).map(p => ({
      ...p,
      tracks: Array.isArray(p.tracks) ? p.tracks : []
    })),
    favoriteArtists: user.favoriteArtists || [],
    themeMode: user.themeMode || 'dark',
  });
}

async function handleAuthUpdateProfile(req) {
  if (req.method !== 'POST' && req.method !== 'PATCH') return error('Method not allowed', 405);
  let body = {};
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body');
  }
  const { phone, pin, name, avatar } = body;
  if (!phone || !pin) return error('Phone and PIN required', 400);
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  await ensureDB(true);
  let user = usersCache[cleanPhone];
  if (!user) {
    // Auto-create/upsert user if not existing in cache
    user = {
      phone: cleanPhone,
      pin,
      name: name?.trim() || 'Music Lover',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      joinedAt: Date.now(),
      updatedAt: Date.now(),
      playlists: [],
      favorites: [],
      favoriteArtists: [],
      themeMode: 'dark',
    };
  } else if (user.pin !== pin) {
    return error('Invalid phone or PIN', 401);
  }
  if (name && name.trim()) user.name = name.trim();
  if (avatar && avatar.trim()) user.avatar = avatar.trim();
  user.updatedAt = Date.now();
  usersCache[cleanPhone] = user;
  await persistDB();
  return json({
    success: true,
    user: {
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      joinedAt: user.joinedAt,
    },
  });
}

async function handleAdminUsers(req, searchParams) {
  const adminPin = searchParams.get('adminPin') || req.headers.get('x-admin-pin');
  if (adminPin !== '8888' && adminPin !== '1234') {
    return error('Unauthorized admin access. Please provide valid admin PIN.', 401);
  }
  await ensureDB(true);
  const usersList = Object.values(usersCache).map((u) => ({
    phone: u.phone,
    name: u.name,
    avatar: u.avatar,
    joinedAt: u.joinedAt,
    updatedAt: u.updatedAt || Date.now(),
    favoritesCount: Array.isArray(u.favorites) ? u.favorites.length : 0,
    playlistsCount: Array.isArray(u.playlists) ? u.playlists.length : 0,
    favorites: u.favorites || [],
    playlists: u.playlists || [],
    themeMode: u.themeMode || 'dark',
  }));
  return json({
    success: true,
    totalUsers: usersList.length,
    users: usersList,
    serverTime: new Date().toISOString(),
  });
}

// api/index.ts
var ytmusic = new YTMusic();
var youtubeSearch = new YouTubeSearch();
async function handleWebRequest(req) {
  const url = new URL(req.url);
  const { pathname, searchParams } = url;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    let response = null;
    if (pathname === "/health" || pathname === "/api/health") {
      return json({ status: "ok", version: "2.0.0", platform: "vercel" });
    }
    if (pathname === "/api/auth/login")
      return await handleAuthLogin(req);
    if (pathname === "/api/auth/sync")
      return await handleAuthSync(req);
    if (pathname === "/api/auth/profile")
      return await handleAuthProfile(searchParams);
    if (pathname === "/api/auth/profile/update" || pathname === "/api/auth/update")
      return await handleAuthUpdateProfile(req);
    if (pathname === "/api/admin/users")
      return await handleAdminUsers(req, searchParams);
    if (pathname === "/api/search")
      response = await handleSearch(req, searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/search/suggestions")
      response = await handleSearchSuggestions(searchParams, ytmusic, youtubeSearch);
    else if (pathname === "/api/yt_search" || pathname === "/api/yt-search")
      response = await handleYTSearch(searchParams, youtubeSearch);
    if (!response)
      response = await handleContentRoutes(pathname, searchParams, ytmusic);
    if (!response)
      response = await handleDiscoverRoutes(pathname, searchParams, ytmusic, youtubeSearch);
    if (!response && pathname === "/api/music/find")
      return await handleMusicFind(searchParams, ytmusic);
    if (!response && pathname === "/api/audio-stream")
      return await handleAudioStream(searchParams);
    if (!response && pathname === "/api/stream")
      return await handleStream(searchParams);
    if (!response && pathname === "/api/proxy")
      return await handleProxy(searchParams, req);
    if (!response)
      response = await handleInfoRoutes(pathname, searchParams);
    if (!response)
      response = await handleFeedRoutes(pathname, searchParams);
    if (response) {
      return response;
    }
    return json({ error: "Endpoint not found", path: pathname }, 404);
  } catch (err) {
    return json({ error: "Internal Server Error", message: err?.message || String(err) }, 500);
  }
}
async function handler(req, res) {
  if (res && typeof res.status === "function") {
    try {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const fullUrl = `${proto}://${host}${req.url}`;
      let bodyData = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
      const webReq = new Request(fullUrl, {
        method: req.method,
        headers: req.headers,
        body: bodyData,
      });
      const webRes = await handleWebRequest(webReq);
      res.status(webRes.status);
      webRes.headers.forEach((val, key) => res.setHeader(key, val));
      const body = await webRes.text();
      return res.end(body);
    } catch (e) {
      res.status(500).json({ error: e?.message || "Internal error" });
    }
  } else {
    return await handleWebRequest(req);
  }
}
export {
  handler as default
};
