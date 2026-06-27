export const MARQUEE_GAP = 24;
export const MARQUEE_MIN_DURATION_MS = 1500;

type MarqueeLayoutInput = {
  containerWidth: number;
  textWidth: number;
  speed: number;
};

export type MarqueeMeasurement = {
  text: string;
  width: number;
};

export type MarqueeLayout = {
  distance: number;
  duration: number;
  gap: number;
  itemWidth: number;
  shouldScroll: boolean;
};

export function getCurrentTextWidth(measurement: MarqueeMeasurement | null, text: string) {
  return measurement?.text === text ? measurement.width : 0;
}

export function getMarqueeLayout({ containerWidth, textWidth, speed }: MarqueeLayoutInput): MarqueeLayout {
  const itemWidth = Math.ceil(textWidth);
  const shouldScroll = containerWidth > 0 && itemWidth > containerWidth;
  const distance = shouldScroll ? itemWidth + MARQUEE_GAP : 0;
  const safeSpeed = speed > 0 ? speed : 30;

  return {
    distance,
    duration: shouldScroll ? Math.max(MARQUEE_MIN_DURATION_MS, (distance / safeSpeed) * 1000) : 0,
    gap: MARQUEE_GAP,
    itemWidth,
    shouldScroll,
  };
}
