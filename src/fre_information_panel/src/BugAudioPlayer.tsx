import { useEffect, useRef, useState } from 'react';
import type { BugDetectionShare } from './bugThemes';

// Intro tracks are like "this is a ...." or "this is called ..."
const INTRO_TRACKS = ['/sounds/intro1.ogg', '/sounds/intro2.ogg'];

/// Error tracks are played when an unknown bug is detected.
const ERROR_TRACKS = ['/sounds/error1.ogg', '/sounds/error2.ogg'];

type BugAudioPlayerProps = {
  detections: BugDetectionShare[];
  isActive: boolean;
};

function pickRandomTrack(tracks: string[]): string {
  return tracks[Math.floor(Math.random() * tracks.length)];
}

function selectPrimaryDetection(detections: BugDetectionShare[]): BugDetectionShare {
  return detections.reduce((current, next) => {
    if (next.count > current.count) {
      return next;
    }

    return current;
  }, detections[0]);
}

async function playTrack(
  src: string,
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<boolean> {
  if (activeTokenRef.current !== token) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    audio.pause();
    audio.currentTime = 0;
    audio.src = src;
    audio.load();

    const clearHandlers = () => {
      audio.onended = null;
      audio.onerror = null;
    };

    audio.onended = () => {
      clearHandlers();
      resolve(true);
    };

    audio.onerror = () => {
      clearHandlers();
      resolve(false);
    };

    void audio.play().catch(() => {
      clearHandlers();
      resolve(false);
    });
  });
}

export function BugAudioPlayer({ detections, isActive }: BugAudioPlayerProps) {
  const activeTokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    const audio = audioRef.current;

    if (!isAudioEnabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (!isActive || detections.length === 0) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    activeTokenRef.current += 1;
    const token = activeTokenRef.current;

    audio.pause();
    audio.currentTime = 0;

    async function playSequence() {
      const hasUnknownDetection = detections.some((detection) => detection.key === 'unknown');

      if (hasUnknownDetection) {
        const firstErrorTrack = pickRandomTrack(ERROR_TRACKS);
        const fallbackErrorTrack = ERROR_TRACKS.find((track) => track !== firstErrorTrack);
        const errorTracks = fallbackErrorTrack
          ? [firstErrorTrack, fallbackErrorTrack]
          : [firstErrorTrack];

        for (const track of errorTracks) {
          const didPlay = await playTrack(track, audio, activeTokenRef, token);
          if (didPlay || activeTokenRef.current !== token) {
            return;
          }
        }

        return;
      }

      const firstIntroTrack = pickRandomTrack(INTRO_TRACKS);
      const fallbackIntroTrack = INTRO_TRACKS.find((track) => track !== firstIntroTrack);
      const introTracks = fallbackIntroTrack
        ? [firstIntroTrack, fallbackIntroTrack]
        : [firstIntroTrack];
      const primaryDetection = selectPrimaryDetection(detections);
      const bugTrack = `/sounds/${primaryDetection.key}.ogg`;

      let didPlayIntro = false;
      for (const track of introTracks) {
        didPlayIntro = await playTrack(track, audio, activeTokenRef, token);
        if (didPlayIntro || activeTokenRef.current !== token) {
          break;
        }
      }

      if (!didPlayIntro || activeTokenRef.current !== token) {
        return;
      }

      void playTrack(bugTrack, audio, activeTokenRef, token);
    }

    void playSequence();

    return () => {
      activeTokenRef.current += 1;
      audio.pause();
      audio.currentTime = 0;
    };
  }, [detections, isActive, isAudioEnabled]);

  if (isAudioEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <button
        type="button"
        onClick={() => {
          setIsAudioEnabled(true);
        }}
        className="rounded-full border border-zinc-100/50 bg-zinc-900/80 px-4 py-2 text-sm font-semibold tracking-wide text-zinc-50 shadow-lg backdrop-blur-sm transition hover:scale-[1.02] hover:bg-zinc-800/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100/80"
      >
        Enable Sounds
      </button>
    </div>
  );
}
