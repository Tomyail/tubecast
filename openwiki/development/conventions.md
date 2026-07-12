# Development Conventions

This document covers commit message conventions, version management, and development guidelines for TubeCast.

## Commit Message Format

TubeCast uses **Conventional Commits** with automated version bumping.

### Format

```
type(scope): subject
```

- **`type`** (required) - Must be from the whitelist below
- **`scope`** (optional) - Area affected (e.g., `mobile`, `player`, `release`)
- **`subject`** - Short description (Chinese or English, ≤100 characters)

### Commit Types

The commit type is determined by **which files are changed**, not how you feel about the change.

| Scenario | Type | Example |
|----------|------|---------|
| **App source code changes** (`src/`, `App.tsx`, `assets/`, `ios-share-extension/`) — user-facing features | `feat` | `feat(player): add lock-screen progress scrubbing` |
| **App source code changes** — bug fixes | `fix` | `fix(share): dismiss share sheet after creating moment` |
| **App source code** — performance or refactor (no behavior change) | `perf` / `refactor` | `perf(list): virtualize playlist rendering` |
| **Documentation** | `docs` | `docs: add fastlane release guide` |
| **Tests** | `test` | `test: cover job polling logic` |
| **Build system / dependencies / release scripts / fastlane / expo prebuild config** | `build` | `build: fastlane switch to API Key auth` |
| **CI configuration** (`.github/workflows`) | `ci` | `ci: add worker image build workflow` |
| **Other miscellaneous changes** | `chore` | `chore: upgrade dependencies` |

### Critical Rule

> ❌ **Never use `feat:` or `fix:` for toolchain, CI, release scripts, or configuration changes.**

**Wrong examples** (these incorrectly bump the version number):
- `feat: integrate fastlane` → Should be `build: integrate fastlane`
- `feat: split TestFlight flow` → Should be `build: split TestFlight flow` (changed `scripts/release.mjs`)
- `fix: fix release script bug` → Should be `build:` or `chore:`

The commit type guard (`scripts/commit-type-guard.mjs`) automatically blocks these mistakes. When you use `feat`/`fix` but only have toolchain files staged (`scripts/`, `fastlane/`, `.github/`, configs, docs), the commit is rejected with a corrected suggestion.

Source: `/AGENTS.md`

## Version Bumping

### How Versions Are Determined

Versions are bumped automatically by `commit-and-tag-version` (`pnpm release:version`) based on commit types:

| Type | Bump | Example |
|------|------|---------|
| `feat` | **minor** | 1.0.0 → 1.1.0 |
| `fix` / `perf` | **patch** | 1.0.0 → 1.0.1 |
| `BREAKING CHANGE` or `!` | **major** | 1.0.0 → 2.0.0 |
| Other (`build`, `ci`, `chore`, `docs`, `refactor`, `style`, `test`) | **no bump** | — |

**This is why incorrect `feat` usage is dangerous:** it releases a minor version bump even though users get no new features.

Source: `/scripts/release.mjs`, `/AGENTS.md`

### Manual Version Override

To force a specific version:

```bash
RELEASE_AS=1.0.1 pnpm release:version
```

### Pre-Commit Checklist

Before committing, ask:

1. **Did I change app source code?**
   - Yes → Can use `feat`, `fix`, `perf`, `refactor`
   - No (only scripts/config/CI/docs) → Must use `build`, `ci`, `chore`, `docs`, `test`

2. **Is the type in the whitelist?**
   - If not, commitlint will block the commit

3. **Is the header ≤100 characters?**

The `.husky/commit-msg` hook runs commitlint and the commit-type-guard to enforce these rules automatically.

Source: `/.husky/commit-msg`, `/scripts/commit-type-guard.mjs`

## Commitlint Configuration

The project uses `commitlint` with a custom configuration (`/commitlint.config.cjs`) to enforce Conventional Commits.

### Allowed Types

- `feat` - New user-facing feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `chore` - Miscellaneous tasks
- `style` - Code style changes (no logic change)
- `refactor` - Code refactoring (no behavior change)
- `perf` - Performance improvements
- `test` - Test additions or changes
- `build` - Build system changes
- `ci` - CI configuration changes

### Configuration

```javascript
// /commitlint.config.cjs
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'chore', 'style',
      'refactor', 'perf', 'test', 'build', 'ci'
    ]],
    'subject-case': [0], // Allow Chinese subjects
  },
};
```

Source: `/commitlint.config.cjs`

## Commit Type Guard

The commit type guard (`scripts/commit-type-guard.mjs`) prevents incorrect `feat`/`fix` usage for toolchain changes.

### What It Does

When you commit with `feat:` or `fix:`, it checks if any staged files are app source code (`src/`, `App.tsx`, `index.ts`, `assets/`, `ios-share-extension/`). If not, it blocks the commit and suggests using `build`, `ci`, `chore`, or `docs`.

### Why It Exists

Incorrect commit types cause unwanted version bumps. This guard ensures `feat` and `fix` are only used for actual app changes, not for scripts, configs, or CI.

Source: `/scripts/commit-type-guard.mjs`

## Code Organization

### Feature Modules

Each feature in `/src/features/` follows a consistent structure:

```
features/
├── player/          # Audio playback
│   ├── context.tsx  # React Context + state
│   ├── state.ts     # Reducer, types
│   └── hooks.ts     # Custom hooks
├── playlist/        # Local library
│   ├── storage.ts   # AsyncStorage backend
│   ├── context.tsx  # React Context
│   └── hooks.ts     # Custom hooks
├── youtubeFeed/     # YouTube subscriptions
│   ├── api.ts       # Backend API
│   ├── storage.ts   # Channel persistence
│   └── hooks.ts     # React Query hooks
└── jobs/            # Conversion jobs
    ├── api.ts       # Job status API
    ├── cache.ts     # Local cache management
    └── progress.ts  # Progress calculations
```

### Shared Modules

Common utilities are in `/src/shared/`:

- `apiClient.ts` - Axios client configuration
- `errors.ts` - Error types and handlers
- `imageSource.ts` - Image source utilities

### Screen Components

Screens are in `/src/screens/` and follow naming convention: `<Name>Screen.tsx`.

## Testing

### Test Framework

- **Vitest** - Test runner (`vitest.config.ts`)
- **React Test Renderer** - Component testing (where applicable)

### Test Structure

Tests mirror source structure:

```
test/
├── discover/
│   └── api.test.ts
├── jobs/
│   └── progress.test.ts
├── remoteConfig/
│   └── config.test.ts
├── shareLinks/
│   ├── links.test.ts
│   └── matching.test.ts
└── youtubeFeed/
    ├── api.test.ts
    └── input.test.ts
```

### Running Tests

```bash
pnpm test
```

## Development Workflow

### Making Changes

1. Create a feature branch from `main`
2. Make changes following code organization patterns
3. Write tests for new logic
4. Commit with Conventional Commits format
5. Run tests: `pnpm test`
6. Push and create a pull request

### Before Committing

1. Check changed files to determine correct commit type
2. Ensure commit message follows format: `type(scope): subject`
3. Verify subject ≤ 100 characters
4. Let commit hooks validate the commit

## Git Hooks

### Pre-Commit Hook

```bash
.husky/pre-commit
```

Runs before each commit to ensure code quality.

### Commit-Message Hook

```bash
.husky/commit-msg
```

Runs commitlint and commit-type-guard to validate commit message format.

Source: `/.husky/commit-msg`, `/.husky/pre-commit`

## Style Guide

### TypeScript

- Use strict type checking
- Avoid `any` types
- Prefer interfaces for object shapes
- Use proper null checks (`null` vs `undefined`)

### React

- Use functional components with hooks
- Follow React Query patterns for data fetching
- Keep components focused and single-purpose
- Use proper dependency arrays in `useEffect`/`useMemo`

### File Naming

- Components: `PascalCase.tsx` (e.g., `PlayerScreen.tsx`)
- Utilities: `camelCase.ts` (e.g., `apiClient.ts`)
- Hooks: `camelCase.ts` (e.g., `usePlayer.ts`)
- Types: Prefer co-location with implementation files

### Imports

Group imports in this order:

1. React/React Native
2. Third-party libraries
3. Internal modules (absolute paths)
4. Relative imports
5. Types-only imports

## References

- **Commit conventions:** `/AGENTS.md`
- **Commitlint config:** `/commitlint.config.cjs`
- **Type guard script:** `/scripts/commit-type-guard.mjs`
- **Git hooks:** `/.husky/`
- **Release workflow:** `/openwiki/operations/release.md`
