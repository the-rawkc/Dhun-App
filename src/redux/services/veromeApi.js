import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE } from '../../services/apiConfig';

export const veromeApi = createApi({
  reducerPath: 'veromeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
  }),
  refetchOnMountOrArgChange: false,
  keepUnusedDataFor: 600, // 10 minutes instant cache in memory
  endpoints: (builder) => ({
    getTrending: builder.query({
      query: (country = 'US') => `/api/trending?country=${country}`,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response?.tracks) return response.tracks;
        if (response?.results) return response.results;
        return [];
      },
    }),

    getCharts: builder.query({
      query: (country = 'US') => `/api/charts?country=${country}`,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response?.tracks) return response.tracks;
        if (response?.results) return response.results;
        return [];
      },
    }),

    getTopArtists: builder.query({
      query: (country = '') => (country ? `/api/top/artists?country=${country}` : '/api/top/artists'),
      transformResponse: (response) => {
        if (response?.artists) return response.artists;
        if (Array.isArray(response)) return response;
        return [];
      },
    }),

    getTopTracks: builder.query({
      query: (country = '') => (country ? `/api/top/tracks?country=${country}` : '/api/top/tracks'),
      transformResponse: (response) => {
        if (response?.tracks) return response.tracks;
        if (Array.isArray(response)) return response;
        return [];
      },
    }),

    getSearch: builder.query({
      query: ({ q, filter = '' }) => {
        const params = new URLSearchParams({ q, language: 'en', hl: 'en' });
        if (filter) params.append('filter', filter);
        return `/api/search?${params.toString()}`;
      },
      transformResponse: (response) => {
        if (response?.results) return response.results;
        if (Array.isArray(response)) return response;
        return [];
      },
    }),

    getSearchSuggestions: builder.query({
      query: (q) => `/api/search/suggestions?q=${encodeURIComponent(q)}`,
      transformResponse: (response) => response?.suggestions || [],
    }),

    getSongDetails: builder.query({
      query: (videoId) => `/api/songs/${videoId}`,
    }),

    getArtistDetails: builder.query({
      query: (browseId) => `/api/artists/${browseId}`,
    }),

    getArtistInfo: builder.query({
      query: (artistName) => `/api/artist/info?artist=${encodeURIComponent(artistName)}`,
    }),

    getAlbumDetails: builder.query({
      query: (browseId) => `/api/albums/${browseId}`,
    }),

    getPlaylistDetails: builder.query({
      query: (playlistId) => `/api/playlists/${playlistId}`,
    }),

    getRadio: builder.query({
      query: (videoId) => `/api/radio?videoId=${videoId}`,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response?.tracks) return response.tracks;
        if (response?.results) return response.results;
        return [];
      },
    }),

    getRelated: builder.query({
      query: (videoId) => `/api/related/${videoId}`,
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (response?.tracks) return response.tracks;
        if (response?.results) return response.results;
        return [];
      },
    }),

    getLyrics: builder.query({
      query: ({ title, artist }) => `/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
    }),

    getMoods: builder.query({
      query: () => '/api/moods',
      transformResponse: (response) => {
        if (!Array.isArray(response)) return [];
        // Flatten categories or return categories
        return response;
      },
    }),
  }),
});

export const {
  useGetTrendingQuery,
  useGetChartsQuery,
  useGetTopArtistsQuery,
  useGetTopTracksQuery,
  useGetSearchQuery,
  useGetSearchSuggestionsQuery,
  useGetSongDetailsQuery,
  useGetArtistDetailsQuery,
  useGetArtistInfoQuery,
  useGetAlbumDetailsQuery,
  useGetPlaylistDetailsQuery,
  useGetRadioQuery,
  useGetRelatedQuery,
  useGetLyricsQuery,
  useGetMoodsQuery,
} = veromeApi;
