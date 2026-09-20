"use client";

import { useSyncExternalStore } from "react";

import {
  getAppStorageSnapshot,
  getServerAppStorageSnapshot,
  subscribeToAppStorage,
} from "@/lib/storage";

export function useAppStorage() {
  return useSyncExternalStore(
    subscribeToAppStorage,
    getAppStorageSnapshot,
    getServerAppStorageSnapshot,
  );
}
