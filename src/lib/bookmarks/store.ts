"use client";

import { useSyncExternalStore } from "react";

export type BookmarkType = "article" | "repo";

export interface Bookmark {
  type: BookmarkType;
  id: string;
  title: string;
  url: string;
  /** 내부 상세 페이지 경로 (저장소는 없을 수 있음) */
  href: string | null;
  subtitle: string | null;
  tags: string[];
  savedAt: string;
}

const KEY = "issuehub:bookmarks:v1";
const EVENT = "issuehub:bookmarks";
const EMPTY: Bookmark[] = [];

let cacheRaw: string | null = null;
let cacheValue: Bookmark[] = EMPTY;

function read(): Bookmark[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cacheValue = Array.isArray(parsed) ? (parsed as Bookmark[]).filter((b) => b && typeof b.id === "string" && typeof b.title === "string") : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(list: Bookmark[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBookmarks(): Bookmark[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const isSaved = (list: Bookmark[], type: BookmarkType, id: string) => list.some((b) => b.type === type && b.id === id);

/** 저장 상태를 뒤집는다. 반환값: 저장됨(true)/해제됨(false)/실패(null) */
export function toggleBookmark(item: Omit<Bookmark, "savedAt">): boolean | null {
  const list = read();
  if (isSaved(list, item.type, item.id)) {
    return write(list.filter((b) => !(b.type === item.type && b.id === item.id))) ? false : null;
  }
  return write([{ ...item, savedAt: new Date().toISOString() }, ...list]) ? true : null;
}

export function removeBookmark(type: BookmarkType, id: string) {
  return write(read().filter((b) => !(b.type === type && b.id === id)));
}

export function clearBookmarks() {
  return write([]);
}
