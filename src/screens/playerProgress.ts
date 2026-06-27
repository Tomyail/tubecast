export function getSeekTimeFromDrag(startX: number, dx: number, width: number, duration: number) {
  if (duration <= 0 || width <= 0) return 0;

  const x = startX + dx;
  const percentage = Math.min(1, Math.max(0, x / width));
  return percentage * duration;
}

export function getProgressXFromPageX(pageX: number, progressLeft: number) {
  return pageX - progressLeft;
}

export function getDisplayedProgressTime(currentTime: number, scrubTime: number | null, optimisticSeekTime: number | null) {
  return scrubTime ?? optimisticSeekTime ?? currentTime;
}
