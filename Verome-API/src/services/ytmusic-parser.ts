/**
 * YouTube Music response parsers
 * Extracts structured data from YouTube Music's internal API responses
 */

export function parseSearchResults(data: any) {
  const results: any[] = [];
  let continuationToken: string | null = null;

  // Handle direct continuationContents (YouTube Music pagination)
  if (data?.continuationContents?.musicShelfContinuation) {
    const shelf = data.continuationContents.musicShelfContinuation;
    for (const item of (shelf.contents || [])) {
      const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
      if (parsed) results.push(parsed);
    }
    continuationToken =
      shelf.continuations?.[0]?.nextContinuationData?.continuation ||
      shelf.continuations?.[0]?.reloadContinuationData?.continuation ||
      null;
    return { results, continuationToken };
  }

  // Handle continuation responses
  const actions = data?.onResponseReceivedCommands || [];
  for (const action of actions) {
    const items = action?.appendContinuationItemsAction?.continuationItems || [];
    for (const entry of items) {
      if (entry.musicShelfRenderer || entry.musicShelfContinuation) {
        const shelf = entry.musicShelfRenderer || entry.musicShelfContinuation;
        for (const item of (shelf.contents || [])) {
          const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
          if (parsed) results.push(parsed);
        }
        continuationToken = shelf.continuations?.[0]?.nextContinuationData?.continuation || continuationToken;
      }
      if (entry.itemSectionRenderer) {
        for (const item of (entry.itemSectionRenderer.contents || [])) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) results.push(parsed);
          }
        }
      }
      if (entry.continuationItemRenderer) {
        continuationToken = entry.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || continuationToken;
      }
    }
  }

  // Handle initial results
  if (results.length === 0) {
    const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      if (section.musicCardShelfRenderer) {
        const topResult = parseTopResultCard(section.musicCardShelfRenderer);
        if (topResult) results.push(topResult);

        // Parse list items directly inside the card (top songs for artist/track)
        for (const item of (section.musicCardShelfRenderer.contents || [])) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) results.push(parsed);
          }
        }
      }

      if (section.musicShelfRenderer) {
        for (const item of (section.musicShelfRenderer.contents || [])) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) results.push(parsed);
          }
        }
        continuationToken = section.musicShelfRenderer.continuations?.[0]?.nextContinuationData?.continuation || continuationToken;
      }

      // Modern YouTube Music section list format
      if (section.itemSectionRenderer) {
        for (const item of (section.itemSectionRenderer.contents || [])) {
          if (item.musicResponsiveListItemRenderer) {
            const parsed = parseMusicItem(item.musicResponsiveListItemRenderer);
            if (parsed) results.push(parsed);
          }
          if (item.musicShelfRenderer) {
            for (const shelfItem of (item.musicShelfRenderer.contents || [])) {
              if (shelfItem.musicResponsiveListItemRenderer) {
                const parsed = parseMusicItem(shelfItem.musicResponsiveListItemRenderer);
                if (parsed) results.push(parsed);
              }
            }
          }
        }
      }
    }
  }

  return { results, continuationToken };
}

export function parseTopResultCard(card: any) {
  if (!card) return null;

  const title = card.title?.runs?.[0]?.text;
  const subtitleRuns = card.subtitle?.runs || [];
  const thumbnail = card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;
  const videoId = card.onTap?.watchEndpoint?.videoId || card.buttons?.[0]?.buttonRenderer?.command?.watchEndpoint?.videoId;
  const browseId = card.onTap?.browseEndpoint?.browseId;

  const subtitleText = subtitleRuns.map((r: any) => r.text).join("");
  let resultType = "song";
  const lower = subtitleText.toLowerCase();
  if (lower.includes("video") || lower.includes("vidéo")) resultType = "video";
  else if (lower.includes("artist") || lower.includes("artiste")) resultType = "artist";
  else if (lower.includes("album")) resultType = "album";
  else if (lower.includes("playlist")) resultType = "playlist";

  const artistRun = subtitleRuns.find((r: any) =>
    r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST"
  );
  const artists = artistRun ? [{ name: artistRun.text, id: artistRun.navigationEndpoint?.browseEndpoint?.browseId }] : [];

  return { title, thumbnails: [{ url: thumbnail }], videoId, browseId, artists, resultType, isTopResult: true, subtitle: subtitleText };
}

export function parseSuggestions(data: any): string[] {
  const suggestions: string[] = [];
  const contents = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || data?.contents || [];
  for (const content of contents) {
    const runs = content?.searchSuggestionRenderer?.suggestion?.runs || [];
    const text = runs.map((r: any) => r.text).join("");
    if (text) suggestions.push(text);
  }
  return suggestions;
}

export function parseMusicItem(item: any) {
  if (!item) return null;

  const title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
  if (!title) return null;

  const thumbnail =
    item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    item.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;

  const videoId =
    item.playlistItemData?.videoId ||
    item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
    item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
    item.doubleTapCommand?.watchEndpoint?.videoId ||
    item.navigationEndpoint?.watchEndpoint?.videoId ||
    undefined;

  const browseId =
    item.navigationEndpoint?.browseEndpoint?.browseId ||
    item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    undefined;

  const subtitle = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  let artists = subtitle
    .filter((r: any) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
      ?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST")
    .map((r: any) => ({ name: r.text, id: r.navigationEndpoint?.browseEndpoint?.browseId }));

  if (artists.length === 0 && subtitle.length > 0) {
    const candidate = subtitle[0]?.text;
    if (candidate && candidate !== "•" && !candidate.match(/^\d+/) && candidate.length > 1) {
      artists = [{ name: candidate }];
    }
  }

  const duration = item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text;
  const subtitleText = subtitle.map((r: any) => r.text || "").join("").toLowerCase();

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
    thumbnails: [{ url: thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '') }],
    videoId,
    browseId,
    artists,
    duration,
    resultType,
  };
}

export function parseTwoRowItem(item: any) {
  if (!item) return null;
  return {
    title: item.title?.runs?.[0]?.text,
    subtitle: item.subtitle?.runs?.map((r: any) => r.text).join(""),
    thumbnails: item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    videoId: item.navigationEndpoint?.watchEndpoint?.videoId,
    browseId: item.navigationEndpoint?.browseEndpoint?.browseId,
    playlistId: item.navigationEndpoint?.watchEndpoint?.playlistId,
  };
}
