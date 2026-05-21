/**
 * useFormDirty — Track unsaved form changes via deep comparison
 *
 * API:
 *   const { isDirty, resetDirty, markClean } = useFormDirty(currentValues)
 *
 * - Captures initial snapshot on mount (or after resetDirty/markClean)
 * - Deep-compares current vs snapshot
 * - No external library needed
 */

import { useState, useRef, useCallback, useMemo } from "react";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

function cloneDeep<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

export function useFormDirty<T extends Record<string, unknown>>(
  currentValues: T
) {
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const snapshotRef = useRef<T>(cloneDeep(currentValues));

  // Re-capture snapshot when version bumps
  // We use version to trigger re-snapshot without needing currentValues in deps
  const isDirty = useMemo(() => {
    return !deepEqual(snapshotRef.current, currentValues);
  }, [currentValues, snapshotVersion]);

  /** Reset snapshot to current values (call after successful save) */
  const resetDirty = useCallback(() => {
    snapshotRef.current = cloneDeep(currentValues);
    setSnapshotVersion((v) => v + 1);
  }, [currentValues]);

  /** Alias for resetDirty — marks form as clean */
  const markClean = useCallback(() => {
    snapshotRef.current = cloneDeep(currentValues);
    setSnapshotVersion((v) => v + 1);
  }, [currentValues]);

  return { isDirty, resetDirty, markClean };
}
