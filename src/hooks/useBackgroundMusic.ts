import { useState, useEffect } from 'react';
import { musicManager } from '../audio';
import type { TrackKey } from '../audio';

/**
 * Hook — subscribe to background music state.
 *
 * Returns:
 *   enabled   — whether music is currently on
 *   toggle    — flip on/off (with fade)
 *   setTrack  — switch to a named track ('main' | 'rush')
 */
export function useBackgroundMusic() {
  const [enabled, setEnabled] = useState<boolean>(musicManager.enabled);

  useEffect(() => {
    // Stay in sync with changes triggered by other callers (e.g., musicManager.toggle())
    return musicManager.subscribe(setEnabled);
  }, []);

  return {
    enabled,
    toggle:   ()               => musicManager.toggle(),
    setTrack: (t: TrackKey)    => musicManager.setTrack(t),
  };
}
