const LIST_VERTICAL_PADDING = 4;
const SCREEN_BOTTOM_PADDING = 24;
const SCREEN_TOP_PADDING = 12;
const ROW_MIN_HEIGHT = 72;

export function getManageChannelsListBottomPadding(bottomInset: number): number {
  return SCREEN_BOTTOM_PADDING + Math.max(LIST_VERTICAL_PADDING, bottomInset);
}

export function getManageChannelsListContentHeight(channelCount: number, bottomInset: number): number {
  return SCREEN_TOP_PADDING
    + LIST_VERTICAL_PADDING
    + (channelCount * ROW_MIN_HEIGHT)
    + getManageChannelsListBottomPadding(bottomInset);
}

export const manageChannelsListTopPadding = LIST_VERTICAL_PADDING;
