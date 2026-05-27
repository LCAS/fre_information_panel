import { useState } from 'react';
import { BugAudioPlayer } from './BugAudioPlayer';
import { BugEmojiBackground } from './BugEmojiBackground';
import { buildGradientBackground, formatDetectionLines, parseBugDetections } from './bugThemes';
import { useDetectedBugs } from './useDetectedBugs';

export default function App() {
  const [isBugActive, setIsBugActive] = useState(false);
  const bugText = useDetectedBugs({
    onEnter: () => {
      setIsBugActive(true);
    },
    onExit: () => {
      setIsBugActive(false);
    },
  });
  const detections = parseBugDetections(bugText);
  const activeDetections = isBugActive ? detections : [];
  const titleLines = formatDetectionLines(activeDetections);
  const gradientBackground = buildGradientBackground(activeDetections);
  const backgroundClass =
    activeDetections.length === 1 ? activeDetections[0].theme.solidBackgroundClass : 'bg-black';
  const backgroundStyle = gradientBackground ? { backgroundImage: gradientBackground } : undefined;
  const isVisible = activeDetections.length > 0;
  const titleShiftClass =
    titleLines.length <= 1
      ? ''
      : titleLines.length === 2
        ? '-translate-y-[0.5em]'
        : titleLines.length === 3
          ? '-translate-y-[1em]'
          : '-translate-y-[1.5em]';

  return (
    <main
      className={[
        'relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 font-sans text-zinc-50 transition-[background-color,filter] duration-500 sm:px-8',
        isVisible ? 'saturate-[1.02]' : 'saturate-[0.92]',
        backgroundClass,
      ].join(' ')}
      style={backgroundStyle}
    >
      <BugEmojiBackground detections={activeDetections} isActive={isVisible} />
      <BugAudioPlayer detections={activeDetections} isActive={isVisible} />
      {isVisible ? (
        <div
          className={[
            'relative z-10 transform transition-transform duration-300',
            titleShiftClass,
          ].join(' ')}
        >
          <h1
            className={[
              'text-center text-[clamp(3.75rem,10vw,8rem)] font-black leading-[0.9] tracking-[0.22em] text-zinc-50 transition-all duration-300',
              '[text-shadow:0_0_18px_rgba(255,255,255,0.18),0_8px_30px_rgba(0,0,0,0.6)]',
              activeDetections.length > 1 ? 'motion-safe:animate-pulse' : '',
              'scale-100 opacity-100',
            ].join(' ')}
          >
            {titleLines.map((line) => (
              <span key={line} className="block pl-[0.22em]">
                {line}
              </span>
            ))}
          </h1>
        </div>
      ) : null}
    </main>
  );
}
