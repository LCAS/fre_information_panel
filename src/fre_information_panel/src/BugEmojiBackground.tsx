import { type CSSProperties } from 'react';
import type { BugDetectionShare } from './bugThemes';

const EMOJI_POSITIONS = [
  { top: '8%', left: '10%', size: '4.5rem', duration: '11s', delay: '-2s', rotate: '-8deg' },
  { top: '14%', left: '78%', size: '5.25rem', duration: '13s', delay: '-6s', rotate: '10deg' },
  { top: '26%', left: '24%', size: '3.75rem', duration: '10s', delay: '-3s', rotate: '7deg' },
  { top: '32%', left: '62%', size: '4.75rem', duration: '12s', delay: '-8s', rotate: '-12deg' },
  { top: '48%', left: '8%', size: '5.5rem', duration: '14s', delay: '-5s', rotate: '5deg' },
  { top: '58%', left: '84%', size: '4rem', duration: '10.5s', delay: '-1s', rotate: '-6deg' },
  { top: '68%', left: '20%', size: '4.5rem', duration: '12.5s', delay: '-7s', rotate: '14deg' },
  { top: '78%', left: '72%', size: '5rem', duration: '11.5s', delay: '-4s', rotate: '-9deg' },
  { top: '84%', left: '42%', size: '3.75rem', duration: '9.5s', delay: '-9s', rotate: '4deg' },
];

type BugEmojiBackgroundProps = {
  detections: BugDetectionShare[];
  isActive: boolean;
};

function buildSlotCounts(detections: BugDetectionShare[], slotCount: number): number[] {
  const exactCounts = detections.map(({ share }) => share * slotCount);
  const baseCounts = exactCounts.map(Math.floor);
  let remainingSlots = slotCount - baseCounts.reduce((sum, count) => sum + count, 0);

  const rankedRemainders = exactCounts
    .map((exactCount, index) => ({ index, remainder: exactCount - baseCounts[index] }))
    .sort((left, right) => right.remainder - left.remainder);

  for (const { index } of rankedRemainders) {
    if (remainingSlots === 0) {
      break;
    }

    baseCounts[index] += 1;
    remainingSlots -= 1;
  }

  return baseCounts;
}

function distributeEmojis(detections: BugDetectionShare[]) {
  const slotCounts = buildSlotCounts(detections, EMOJI_POSITIONS.length);
  const remaining = detections.map((detection, index) => ({
    detection,
    remainingSlots: slotCounts[index],
  }));
  const assignedDetections: BugDetectionShare[] = [];

  while (assignedDetections.length < EMOJI_POSITIONS.length) {
    remaining.sort((left, right) => right.remainingSlots - left.remainingSlots);

    let assigned = false;
    for (const entry of remaining) {
      if (entry.remainingSlots === 0) {
        continue;
      }

      assignedDetections.push(entry.detection);
      entry.remainingSlots -= 1;
      assigned = true;
    }

    if (!assigned) {
      break;
    }
  }

  return assignedDetections;
}

export function BugEmojiBackground({ detections, isActive }: BugEmojiBackgroundProps) {
  if (!isActive || detections.length === 0) {
    return null;
  }

  const assignedDetections = distributeEmojis(detections);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {EMOJI_POSITIONS.map((position, index) => {
        const detection = assignedDetections[index] ?? detections[index % detections.length];

        return (
        <span
          key={`${detection.key}-${position.top}-${position.left}-${index}`}
          className="absolute block leading-none motion-safe:animate-pulse transition-all duration-500"
          style={{
            top: position.top,
            left: position.left,
            fontSize: position.size,
            opacity: isActive ? 0.28 : 0,
            transform: isActive
              ? `translate3d(0, 0, 0) rotate(${position.rotate}) scale(1)`
              : `translate3d(0, 18px, 0) rotate(${position.rotate}) scale(0.94)`,
            filter: 'drop-shadow(0 12px 28px rgba(15, 23, 42, 0.16))',
            animationDelay: position.delay,
            animationDuration: position.duration,
          } as CSSProperties}
        >
          {detection.theme.emoji}
        </span>
        );
      })}
    </div>
  );
}