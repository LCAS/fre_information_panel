export type AlertKey = 'bee' | 'butterfly' | 'ladybird' | 'diseased_plant' | 'unknown';
type KnownAlertKey = Exclude<AlertKey, 'unknown'>;

export type AlertTheme = {
  key: AlertKey;
  label: string;
  emoji: string;
  solidBackgroundClass: string;
  gradientColour: string;
  playIntro: boolean;
};

export type AlertDetectionShare = {
  key: AlertKey;
  theme: AlertTheme;
  count: number;
  share: number;
  rawText?: string;
};

export const ALERT_THEMES: Record<AlertKey, AlertTheme> = {
  bee: {
    key: 'bee',
    label: 'Bee',
    emoji: '🐝',
    solidBackgroundClass: 'bg-lime-600',
    gradientColour: '#65a30d',
    playIntro: true,
  },
  butterfly: {
    key: 'butterfly',
    label: 'Butterfly',
    emoji: '🦋',
    solidBackgroundClass: 'bg-yellow-300',
    gradientColour: '#fde047',
    playIntro: true,
  },
  ladybird: {
    key: 'ladybird',
    label: 'Ladybird',
    emoji: '🐞',
    solidBackgroundClass: 'bg-red-600',
    gradientColour: '#dc2626',
    playIntro: true,
  },
  diseased_plant: {
    key: 'diseased_plant',
    label: 'Diseased Plant',
    emoji: '🥀',
    solidBackgroundClass: 'bg-orange-600',
    gradientColour: '#ea580c',
    playIntro: false,
  },
  unknown: {
    key: 'unknown',
    label: '',
    emoji: '⚠️',
    solidBackgroundClass: 'bg-blue-600',
    gradientColour: '#2563eb',
    playIntro: false,
  },
};

const KNOWN_ALERT_KEYS: KnownAlertKey[] = ['bee', 'butterfly', 'ladybird', 'diseased_plant'];
const KNOWN_ALERT_KEY_SET = new Set<KnownAlertKey>(KNOWN_ALERT_KEYS);
const TOKEN_SPLIT_PATTERN = /[\n,/&|+]+/;

export function parseAlertDetections(rawAlertText: string): AlertDetectionShare[] {
  const trimmedText = rawAlertText.trim();
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

  const hasUnknownToken = normalisedTokens.some(
    (token) => !KNOWN_ALERT_KEY_SET.has(token as KnownAlertKey),
  );
  if (hasUnknownToken) {
    return [
      {
        key: 'unknown',
        theme: ALERT_THEMES.unknown,
        count: 1,
        share: 1,
        rawText: trimmedText,
      },
    ];
  }

  const tokenCounts = new Map<KnownAlertKey, number>();
  const detectionOrder: KnownAlertKey[] = [];

  for (const token of normalisedTokens) {
    const alertKey = token as KnownAlertKey;

    if (!tokenCounts.has(alertKey)) {
      detectionOrder.push(alertKey);
      tokenCounts.set(alertKey, 0);
    }

    tokenCounts.set(alertKey, (tokenCounts.get(alertKey) ?? 0) + 1);
  }

  const totalCount = Array.from(tokenCounts.values()).reduce((sum, count) => sum + count, 0);
  if (totalCount === 0) {
    return [];
  }

  return detectionOrder.map((alertKey) => {
    const count = tokenCounts.get(alertKey) ?? 0;
    return {
      key: alertKey,
      theme: ALERT_THEMES[alertKey],
      count,
      share: count / totalCount,
      rawText: undefined,
    };
  });
}

// Multiple Detection Support.
export function formatDetectionLines(detections: AlertDetectionShare[]): string[] {
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

export function buildGradientBackground(detections: AlertDetectionShare[]): string | undefined {
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
