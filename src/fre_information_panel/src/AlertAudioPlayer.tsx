import { useEffect, useRef, useState } from 'react';
import type { AlertDetectionShare } from './alertThemes';

// Intro tracks are like "this is a ...." or "this is called ..."
const INTRO_TRACKS = [
  '/sounds/intro1.ogg',
  '/sounds/intro2.ogg',
  '/sounds/intro3.ogg',
  '/sounds/intro4.ogg',
];

// Error tracks are played when an unknown alert is detected.
const ERROR_TRACKS = ['/sounds/error1.ogg', '/sounds/error2.ogg'];

type Direction = 'left' | 'right' | undefined;

type AlertAudioPlayerProps = {
  detections: AlertDetectionShare[];
  isActive: boolean;
  direction?: Direction;
};

type RuntimeConfig = {
  alertAnnouncementWithIntroduction?: boolean;
};

function pickRandomTrack(tracks: string[]): string {
  return tracks[Math.floor(Math.random() * tracks.length)];
}

function selectPrimaryDetection(detections: AlertDetectionShare[]): AlertDetectionShare {
  return detections.reduce((current, next) => {
    if (next.count > current.count) {
      return next;
    }

    return current;
  }, detections[0]);
}

function isPlaybackCurrent(activeTokenRef: { current: number }, token: number): boolean {
  return activeTokenRef.current === token;
}

function buildRetryTrackList(tracks: string[]): string[] {
  const firstTrack = pickRandomTrack(tracks);
  const fallbackTrack = tracks.find((track) => track !== firstTrack);

  return fallbackTrack ? [firstTrack, fallbackTrack] : [firstTrack];
}

function shouldPlayIntroForDetections(detections: AlertDetectionShare[]): boolean {
  return detections.some((detection) => detection.theme.playIntro);
}

function resolveAlertTracks(detections: AlertDetectionShare[]): string[] {
  const hasUnknownDetection = detections.some((detection) => detection.key === 'unknown');

  if (hasUnknownDetection) {
    return buildRetryTrackList(ERROR_TRACKS);
  }

  if (detections.length > 1) {
    return detections.map((detection) => `/sounds/${detection.key}.ogg`);
  }

  return [`/sounds/${selectPrimaryDetection(detections).key}.ogg`];
}

async function playTrack(
  src: string,
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<boolean> {
  // Ignore stale playback requests after the active alert set has changed.
  if (!isPlaybackCurrent(activeTokenRef, token)) {
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

async function playFirstAvailableTrack(
  tracks: string[],
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<boolean> {
  for (const track of tracks) {
    const didPlay = await playTrack(track, audio, activeTokenRef, token);
    if (didPlay || !isPlaybackCurrent(activeTokenRef, token)) {
      return didPlay;
    }
  }

  return false;
}

async function playIntroIfNeeded(
  detections: AlertDetectionShare[],
  isAlertAnnouncementWithIntroductionEnabled: boolean,
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<boolean> {
  if (!isAlertAnnouncementWithIntroductionEnabled || !shouldPlayIntroForDetections(detections)) {
    return true;
  }

  return playFirstAvailableTrack(buildRetryTrackList(INTRO_TRACKS), audio, activeTokenRef, token);
}

async function playDirectionIfPresent(
  direction: Direction,
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<void> {
  if (!direction || !isPlaybackCurrent(activeTokenRef, token)) {
    return;
  }

  await playTrack(`/sounds/${direction}.ogg`, audio, activeTokenRef, token);
}

async function playAlertTrackSequence(
  tracks: string[],
  direction: Direction,
  audio: HTMLAudioElement,
  activeTokenRef: { current: number },
  token: number,
): Promise<void> {
  for (const track of tracks) {
    await playTrack(track, audio, activeTokenRef, token);
    await playDirectionIfPresent(direction, audio, activeTokenRef, token);

    if (!isPlaybackCurrent(activeTokenRef, token)) {
      return;
    }
  }
}

export function AlertAudioPlayer({ detections, isActive, direction }: AlertAudioPlayerProps) {
  const activeTokenRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [
    isAlertAnnouncementWithIntroductionEnabled,
    setIsAlertAnnouncementWithIntroductionEnabled,
  ] = useState(true);

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
    let isMounted = true;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/config.json', {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok) {
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          return;
        }

        const config = (await response.json()) as RuntimeConfig;
        if (isMounted && typeof config.alertAnnouncementWithIntroduction === 'boolean') {
          setIsAlertAnnouncementWithIntroductionEnabled(config.alertAnnouncementWithIntroduction);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          'Runtime config unavailable, using default alert announcement setting:',
          message,
        );
      }
    }

    void loadRuntimeConfig();

    return () => {
      isMounted = false;
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
      const didCompleteIntro = await playIntroIfNeeded(
        detections,
        isAlertAnnouncementWithIntroductionEnabled,
        audio,
        activeTokenRef,
        token,
      );
      if (!didCompleteIntro || !isPlaybackCurrent(activeTokenRef, token)) {
        return;
      }

      await playAlertTrackSequence(
        resolveAlertTracks(detections),
        direction,
        audio,
        activeTokenRef,
        token,
      );
    }

    void playSequence();

    return () => {
      activeTokenRef.current += 1;
      audio.pause();
      audio.currentTime = 0;
    };
  }, [detections, isActive, isAudioEnabled, direction, isAlertAnnouncementWithIntroductionEnabled]);

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
