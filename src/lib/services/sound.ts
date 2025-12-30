// Auto-play sound for new orders (vendor portal)
// Swiggy-style "ding dong" sound

import { logger } from "@/lib/utils/logger";

let audioContext: AudioContext | null = null;

export function playNewOrderSound() {
  // Create simple "ding dong" sound using Web Audio API
  if (typeof window === "undefined") return;

  try {
    if (!audioContext) {
      // Handle WebKitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported");
      }
      audioContext = new AudioContextClass();
    }

    // Simple beep sound (can be replaced with actual audio file)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    // Silently fail - sound is not critical
    logger.warn("Failed to play sound", error);
  }
}

// Load and play actual audio file for better UX
// Note: Currently using browser notification sound - can be enhanced with custom audio files
export async function loadAndPlaySound(audioUrl: string) {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    // Silently fail - sound is not critical
    logger.warn("Failed to play audio", error);
  }
}

