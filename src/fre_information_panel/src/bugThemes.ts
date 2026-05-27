export type BugKey = 'bee' | 'butterfly' | 'ladybird' | 'unknown';
type KnownBugKey = Exclude<BugKey, 'unknown'>;

export type BugTheme = {
  key: BugKey;
  label: string;
  emoji: string;
  solidBackgroundClass: string;
  gradientColour: string;
};

export type BugDetectionShare = {
  key: BugKey;
  theme: BugTheme;
  count: number;
  share: number;
  rawText?: string;
};

export const BUG_THEMES: Record<BugKey, BugTheme> = {
  bee: {
    key: 'bee',
    label: 'Bee',
    emoji: '🐝',
    solidBackgroundClass: 'bg-lime-600',
    gradientColour: '#65a30d',
  },
  butterfly: {
    key: 'butterfly',
    label: 'Butterfly',
    emoji: '🦋',
    solidBackgroundClass: 'bg-yellow-300',
    gradientColour: '#fde047',
  },
  ladybird: {
    key: 'ladybird',
    label: 'Ladybird',
    emoji: '🐞',
    solidBackgroundClass: 'bg-red-600',
    gradientColour: '#dc2626',
  },
  unknown: {
    key: 'unknown',
    label: '',
    emoji: '⚠️',
    solidBackgroundClass: 'bg-blue-600',
    gradientColour: '#2563eb',
  },
};

const KNOWN_BUG_KEYS: KnownBugKey[] = ['bee', 'butterfly', 'ladybird'];
const KNOWN_BUG_KEY_SET = new Set<KnownBugKey>(KNOWN_BUG_KEYS);
const TOKEN_SPLIT_PATTERN = /[\n,/&|+]+/;

export function parseBugDetections(rawBugText: string): BugDetectionShare[] {
  const trimmedText = rawBugText.trim();
  if (!trimmedText) {
    return [];
  }

  const normalisedTokens = trimmedText
    .toLowerCase()
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);

  if (normalisedTokens.length === 0) {
    return [];
  }

  const hasUnknownToken = normalisedTokens.some((token) => !KNOWN_BUG_KEY_SET.has(token as KnownBugKey));
  if (hasUnknownToken) {
    return [
      {
        key: 'unknown',
        theme: BUG_THEMES.unknown,
        count: 1,
        share: 1,
        rawText: trimmedText,
      },
    ];
  }

  const tokenCounts = new Map<KnownBugKey, number>();
  const detectionOrder: KnownBugKey[] = [];

  for (const token of normalisedTokens) {
    const bugKey = token as KnownBugKey;

    if (!tokenCounts.has(bugKey)) {
      detectionOrder.push(bugKey);
      tokenCounts.set(bugKey, 0);
    }

    tokenCounts.set(bugKey, (tokenCounts.get(bugKey) ?? 0) + 1);
  }

  const totalCount = Array.from(tokenCounts.values()).reduce((sum, count) => sum + count, 0);
  if (totalCount === 0) {
    return [];
  }

  return detectionOrder.map((bugKey) => {
    const count = tokenCounts.get(bugKey) ?? 0;
    return {
      key: bugKey,
      theme: BUG_THEMES[bugKey],
      count,
      share: count / totalCount,
      rawText: undefined,
    };
  });
}

export function formatDetectionLines(detections: BugDetectionShare[]): string[] {
  if (detections.length === 1 && detections[0].key === 'unknown') {
    return (detections[0].rawText ?? '').split('\n').filter(Boolean);
  }

  const labels = detections.map(({ rawText, theme }) => rawText ?? theme.label);

  return labels.map((label, index) => {
    const isLast = index === labels.length - 1;
    const isSecondToLast = index === labels.length - 2;

    if (isLast) {
      return label;
    }

    if (isSecondToLast) {
      return `${label} &`;
    }

    return `${label},`;
  });
}

export function buildGradientBackground(detections: BugDetectionShare[]): string | undefined {
  if (detections.length <= 1) {
    return undefined;
  }

  let runningShare = 0;
  const colourStops = detections.map(({ share, theme }) => {
    runningShare += share;
    const midpoint = (runningShare - share / 2) * 100;
    return `${theme.gradientColour} ${midpoint.toFixed(2)}%`;
  });

  const firstColour = detections[0].theme.gradientColour;
  const lastColour = detections[detections.length - 1].theme.gradientColour;

  return `linear-gradient(135deg, ${firstColour} 0%, ${colourStops.join(', ')}, ${lastColour} 100%)`;
}