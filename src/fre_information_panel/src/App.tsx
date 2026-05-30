import { useState } from 'react';
import { ArrowBigLeft, ArrowBigRight } from 'lucide-react';
import { AlertAudioPlayer } from './AlertAudioPlayer';
import { AlertEmojiBackground } from './AlertEmojiBackground';
import { buildGradientBackground, formatDetectionLines, parseAlertDetections } from './alertThemes';
import { useDetectedAlerts } from './useDetectedAlerts';

type Direction = 'left' | 'right' | undefined;

function getTitleShiftClass(lineCount: number): string {
  if (lineCount <= 1) {
    return '';
  }

  if (lineCount === 2) {
    return '-translate-y-[0.5em]';
  }

  if (lineCount === 3) {
    return '-translate-y-[1em]';
  }

  return '-translate-y-[1.5em]';
}

function getBackgroundClass(detectionCount: number, solidBackgroundClass?: string): string {
  if (detectionCount === 1 && solidBackgroundClass) {
    return solidBackgroundClass;
  }

  return 'bg-black';
}

function parseDirection(text: string): { alert: string; direction: Direction } {
  const match = text.match(/^(.+?)@(left|right)$/i);
  if (match) {
    return { alert: match[1].trim(), direction: match[2].toLowerCase() as 'left' | 'right' };
  }
  return { alert: text, direction: undefined };
}

function DirectionIcon({ direction }: { direction: Exclude<Direction, undefined> }) {
  const Icon = direction === 'left' ? ArrowBigLeft : ArrowBigRight;

  return (
    <Icon
      className="block h-[clamp(4.5rem,14vw,8rem)] w-[clamp(4.5rem,14vw,8rem)] [filter:drop-shadow(0_0_18px_rgba(255,255,255,0.18))_drop-shadow(0_8px_30px_rgba(0,0,0,0.6))]"
      strokeWidth={2.75}
    />
  );
}

export default function App() {
  const soundParam = new URLSearchParams(window.location.search).get('sound');
  const isSoundDisabled = soundParam?.toLowerCase() === 'off';
  const [isAlertActive, setIsAlertActive] = useState(false);
  const alertText = useDetectedAlerts({
    onEnter: () => {
      setIsAlertActive(true);
    },
    onExit: () => {
      setIsAlertActive(false);
    },
  });
  const { alert: alertPart, direction } = parseDirection(alertText);
  const detections = parseAlertDetections(alertPart);
  const activeDetections = isAlertActive ? detections : [];
  const titleLines = formatDetectionLines(activeDetections);
  const gradientBackground = buildGradientBackground(activeDetections);
  const backgroundClass = getBackgroundClass(
    activeDetections.length,
    activeDetections[0]?.theme.solidBackgroundClass,
  );
  const backgroundStyle = gradientBackground ? { backgroundImage: gradientBackground } : undefined;
  const isVisible = activeDetections.length > 0;
  const titleShiftClass = getTitleShiftClass(titleLines.length);

  return (
    <main
      className={[
        'relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 font-sans text-zinc-50 transition-[background-color,filter] duration-500 sm:px-8',
        isVisible ? 'saturate-[1.02]' : 'saturate-[0.92]',
        backgroundClass,
      ].join(' ')}
      style={backgroundStyle}
    >
      <AlertEmojiBackground detections={activeDetections} isActive={isVisible} />
      {isSoundDisabled ? null : (
        <AlertAudioPlayer
          detections={activeDetections}
          isActive={isVisible}
          direction={direction}
        />
      )}
      {isVisible ? (
        <div
          className={[
            'relative z-10 transform transition-transform duration-300',
            titleShiftClass,
          ].join(' ')}
        >
          <h1
            className={[
              'text-center text-[clamp(3.75rem,10vw,8rem)] font-black leading-[0.9] tracking-[0.22em] text-zinc-50 transition-all duration-300 scale-100 opacity-100',
              '[text-shadow:0_0_18px_rgba(255,255,255,0.18),0_8px_30px_rgba(0,0,0,0.6)]',
              activeDetections.length > 1 ? 'motion-safe:animate-pulse' : '',
            ].join(' ')}
          >
            {titleLines.map((line) => (
              <span key={line} className="block pl-[0.22em]">
                {line}
              </span>
            ))}
          </h1>
          {direction && (
            <div className="mt-[clamp(1.875rem,5vw,4rem)] flex justify-center text-zinc-50 transition-all duration-300">
              <DirectionIcon direction={direction} />
            </div>
          )}
        </div>
      ) : null}
    </main>
  );
}
