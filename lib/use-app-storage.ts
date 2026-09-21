"use client";

import { useSyncExternalStore } from "react";

import {
  getAgentStorageSnapshot,
  getServerAgentStorageSnapshot,
  subscribeToAgentStorage,
} from "@/lib/storage";

export function useAppStorage() {
  return useSyncExternalStore(
    subscribeToAgentStorage,
    getAgentStorageSnapshot,
    getServerAgentStorageSnapshot,
  );
}
