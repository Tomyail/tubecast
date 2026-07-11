function isTruthy(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

export const screenshotDemoMode = isTruthy(process.env.EXPO_PUBLIC_SCREENSHOT_DEMO_MODE);
