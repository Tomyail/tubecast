// Network-level error types shared across API modules.
//
// AudioExpiredError is consumed via `instanceof` in features/player/context.tsx
// to surface the localized "audio expired" message, so keep it exported and
// preserve the constructor signature.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class AudioExpiredError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super("Rate limited");
  }
}
