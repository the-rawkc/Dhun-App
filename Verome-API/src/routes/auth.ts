/**
/**
 * User Cloud Database & Authentication Routes
 * /api/auth/login, /api/auth/sync, /api/auth/profile
 */

import { json, error } from "../helpers/response.ts";
import { fromFileUrl } from "jsr:@std/path";

const DATA_DIR = fromFileUrl(new URL("../../data", import.meta.url));
const DB_FILE = fromFileUrl(new URL("../../data/users.json", import.meta.url));

interface UserRecord {
  phone: string;
  pin: string;
  name: string;
  avatar: string;
  joinedAt: string;
  favorites: any[];
  playlists: any[];
  favoriteArtists: any[];
  themeMode?: string;
  updatedAt: number;
}

let usersCache: Record<string, UserRecord> = {};
let isLoaded = false;

async function ensureDB(): Promise<void> {
  if (isLoaded) return;
  try {
    await Deno.mkdir(DATA_DIR, { recursive: true });
  } catch {}

  try {
    const content = await Deno.readTextFile(DB_FILE);
    usersCache = JSON.parse(content);
  } catch {
    usersCache = {};
  }
  isLoaded = true;
}

async function persistDB(): Promise<void> {
  try {
    await Deno.mkdir(DATA_DIR, { recursive: true });
    await Deno.writeTextFile(DB_FILE, JSON.stringify(usersCache, null, 2));
  } catch (err) {
    console.error("Failed to persist users database:", err);
  }
}

export async function handleAuthLogin(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { phone, pin, name } = body;
  if (!phone || typeof phone !== "string") return error("Mobile number is required");
  if (!pin || typeof pin !== "string" || pin.length !== 4) return error("4-digit PIN is required");

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) return error("Please provide a valid 10-digit Indian mobile number");

  await ensureDB();

  let user = usersCache[cleanPhone];
  if (user) {
    if (user.pin !== pin) {
      return error("Incorrect 4-digit PIN. Please try again.", 401);
    }
  } else {
    // Register new user profile in database
    user = {
      phone: cleanPhone,
      pin,
      name: (name && name.trim()) || `User +91-${cleanPhone.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanPhone}`,
      joinedAt: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      favorites: [],
      playlists: [
        {
          id: `pl-${Date.now()}-1`,
          title: "My Desi Hits",
          description: "Top Bollywood & Soulful Tracks",
          cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80",
          tracks: [],
          createdAt: Date.now(),
        },
      ],
      favoriteArtists: [],
      themeMode: "dark",
      updatedAt: Date.now(),
    };
    usersCache[cleanPhone] = user;
    await persistDB();
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
    playlists: user.playlists || [],
    favoriteArtists: user.favoriteArtists || [],
    themeMode: user.themeMode || "dark",
  });
}

export async function handleAuthSync(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { phone, pin, favorites, playlists, favoriteArtists, themeMode } = body;
  if (!phone || !pin) return error("Phone and PIN required for sync", 400);

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  await ensureDB();

  const user = usersCache[cleanPhone];
  if (!user || user.pin !== pin) {
    return error("Unauthorized sync: invalid credentials", 401);
  }

  // Update user database record
  if (Array.isArray(favorites)) user.favorites = favorites;
  if (Array.isArray(playlists)) user.playlists = playlists;
  if (Array.isArray(favoriteArtists)) user.favoriteArtists = favoriteArtists;
  if (themeMode) user.themeMode = themeMode;
  user.updatedAt = Date.now();

  usersCache[cleanPhone] = user;
  await persistDB();

  return json({
    success: true,
    message: "Cloud database synced successfully",
    updatedAt: user.updatedAt,
  });
}

export async function handleAuthProfile(searchParams: URLSearchParams): Promise<Response> {
  const phone = searchParams.get("phone");
  const pin = searchParams.get("pin");

  if (!phone || !pin) return error("Phone and PIN required", 400);

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  await ensureDB();

  const user = usersCache[cleanPhone];
  if (!user || user.pin !== pin) {
    return error("Invalid phone or PIN", 401);
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
    playlists: user.playlists || [],
    favoriteArtists: user.favoriteArtists || [],
    themeMode: user.themeMode || "dark",
  });
}
