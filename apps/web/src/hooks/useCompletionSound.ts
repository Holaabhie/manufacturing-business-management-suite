"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Howl } from "howler";

export type CompletionSoundType = "general" | "payment";

export const SOUND_STORAGE_KEY = "ind-manager-sound-enabled";
export const SOUND_EVENT_KEY = "ind-manager-sound-toggle";
const FIXED_VOLUME = 0.35;
const DEBOUNCE_MS = 800;

const SOUND_SOURCES: Record<CompletionSoundType, string> = {
  general: "/sounds/success-general.mp3",
  payment: "/sounds/success-payment.mp3",
};

// Cached Howl instances (client-side only)
const howlInstances: Partial<Record<CompletionSoundType, Howl>> = {};

// Debounce timestamps tracker per sound type
const lastPlayedTimes: Record<CompletionSoundType, number> = {
  general: 0,
  payment: 0,
};

/**
 * Check whether sound effects are enabled in localStorage.
 * Defaults to true if unset.
 */
export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const item = localStorage.getItem(SOUND_STORAGE_KEY);
    return item === null ? true : item === "true";
  } catch {
    return true;
  }
}

/**
 * Persist sound effects setting to localStorage and notify listeners.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent(SOUND_EVENT_KEY, { detail: { enabled } }));
  } catch (err) {
    console.warn("[CompletionSound] Failed to set sound state:", err);
  }
}

/**
 * Get or create cached Howl instance for a sound type.
 */
function getHowl(type: CompletionSoundType): Howl | null {
  if (typeof window === "undefined") return null;

  if (!howlInstances[type]) {
    howlInstances[type] = new Howl({
      src: [SOUND_SOURCES[type]],
      volume: FIXED_VOLUME,
      preload: true,
      html5: false, // Use Web Audio API for fast responsiveness & Capacitor compatibility
      onloaderror: (_id, err) => {
        console.warn(`[CompletionSound] Could not load sound file "${SOUND_SOURCES[type]}":`, err);
      },
      onplayerror: (_id, err) => {
        console.warn(`[CompletionSound] Error playing sound "${type}":`, err);
        // Howler will unlock on next user interaction automatically
      },
    });
  }

  return howlInstances[type]!;
}

/**
 * Play a completion sound of type 'general' or 'payment'.
 * - Respects global mute toggle in localStorage ('ind-manager-sound-enabled')
 * - Debounces rapid calls within 800ms for the same type
 * - Plays at fixed volume 0.35
 */
export function playCompletionSound(type: CompletionSoundType): void {
  if (typeof window === "undefined") return;

  // 1. Global mute check
  if (!getSoundEnabled()) {
    console.log(`[CompletionSound] Suppressed "${type}" sound (sound disabled in settings)`);
    return;
  }

  // 2. Debounce check (800ms window per type)
  const now = Date.now();
  const timeSinceLast = now - (lastPlayedTimes[type] || 0);
  if (timeSinceLast < DEBOUNCE_MS) {
    console.log(
      `[CompletionSound] Debounced "${type}" sound (${timeSinceLast}ms < ${DEBOUNCE_MS}ms)`
    );
    return;
  }

  lastPlayedTimes[type] = now;

  // 3. Play audio
  try {
    const sound = getHowl(type);
    if (sound) {
      sound.volume(FIXED_VOLUME);
      sound.play();
      console.log(`[CompletionSound] Playing "${type}" sound (volume: ${FIXED_VOLUME})`);
    }
  } catch (err) {
    console.warn(`[CompletionSound] Failed to play sound "${type}":`, err);
  }
}

/**
 * React hook to access sound effects settings and trigger sound.
 */
export function useCompletionSound() {
  const [enabled, setEnabledState] = useState<boolean>(true);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    setEnabledState(getSoundEnabled());

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === "boolean") {
        setEnabledState(customEvent.detail.enabled);
      } else {
        setEnabledState(getSoundEnabled());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === SOUND_STORAGE_KEY) {
        setEnabledState(e.newValue === null ? true : e.newValue === "true");
      }
    };

    window.addEventListener(SOUND_EVENT_KEY, handleToggle);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted.current = false;
      window.removeEventListener(SOUND_EVENT_KEY, handleToggle);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateSoundEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    setSoundEnabled(value);
  }, []);

  return {
    soundEnabled: enabled,
    setSoundEnabled: updateSoundEnabled,
    playCompletionSound,
  };
}
