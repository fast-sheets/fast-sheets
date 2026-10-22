<!-- SPDX-License-Identifier: MIT
      https://opensource.org/licenses/MIT -->

# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

`fast-sheets` is a small, dependency-free TypeScript library that renders huge data grids on a `<canvas>`. Only the visible viewport gets drawn. A hidden native scroll container (`elScroll` plus the `elScrollPaneX`/`elScrollPaneY` spacers) supplies the scrollbars and scroll position.

It's a **pnpm monorepo**:

| Path | Purpose |
| --- | --- |
| `packages/fast-sheets/` | The published library (npm `fast-sheets`) |
| `packages/fast-sheets/lib/core/` | Core: `FastSheets`, `Renderer`, `State`, `Font`, types, constants, utils |
| `packages/fast-sheets/lib/core/controllers/` | Reusable controllers for plugins: `InputController`, `RangeSelectionController` |
| `packages/fast-sheets/lib/core/elements/` | Reusable DOM overlays for plugins: `InputField`, `HighlightedArea`, `HighlightedCell`, `HighlightedRange` |
| `packages/fast-sheets/lib/plugins/editable/` | Editable plugin: cell input, range selection, clipboard (`fast-sheets/editable`) |
| `packages/fast-sheets/lib/plugins/search/` | Search plugin: highlighting results and scrolling to them (`fast-sheets/search`) |
| `packages/fast-sheets/tests/unit/` | Vitest unit tests (jsdom) |
| `packages/fast-sheets/tests/e2e/` | Playwright e2e tests, with their own Vite dev page (`index.html`, `vite.config.ts`) |
| `apps/*-demo/` | Integration demos (vue, react, vanilla-ts, vanilla-js) that use the lib through `workspace:*` |
| `scripts/verify-commit.js` | Commit message validator (husky `commit-msg` hook) |

## Setup and commands

Requires Node >= 18.12 (CI runs Node 26) and pnpm (`packageManager: pnpm@12.11.2`). Always use `pnpm`, never npm or yarn.

```bash
pnpm install
```

Run these from the repo root:

| Command | What it does |
| --- | --- |
| `pnpm build:lib` | Build the library with Vite into `packages/fast-sheets/dist` (3 entries: core, editable, search; ES + CJS + `.d.ts`) |
| `pnpm build` | Build the lib, then all demos |
| `pnpm dev:lib` | Rebuild the lib in watch mode |
| `pnpm dev:vue-demo` (or `react`, `vanilla-ts`, `vanilla-js`) | Watch the lib and run a demo dev server |
| `pnpm lint` | ESLint for the lib and the demos |
| `pnpm prettier:lib` / `pnpm prettier:demo` | Format with Prettier (writes files) |
| `pnpm types:check` | `tsc -b` for the packages |
| `pnpm test:lib:unit` | Vitest unit tests |
| `pnpm test:lib:e2e` | Playwright e2e tests (starts a Vite server on `localhost:4173`) |
| `pnpm test:lib:e2e:ui` | Playwright in UI mode |

To run a single test, work inside the package:

```bash
pnpm --filter fast-sheets exec vitest run tests/unit/renderer.test.ts
```

```bash
pnpm --filter fast-sheets exec playwright test tests/e2e/editable.spec.ts
```

For e2e tests on a fresh machine, install the browser first: `pnpm --filter fast-sheets exec playwright install chromium`.

The demos consume the **built** `dist`, so run `pnpm build:lib` (or `dev:lib`) before you check a change in a demo.

## Before you finish a change

The husky `pre-commit` hook runs lint-staged, `types:check`, the unit tests and the e2e tests. CI (`.github/workflows/ci.yml`) runs lint, types, build, unit and e2e. Run the same checks locally:

```bash
pnpm lint && pnpm types:check && pnpm test:lib:unit && pnpm test:lib:e2e
```

Add or update tests with any behavior change. Use unit tests for pure logic (cell/clipboard utils, renderer sizing math) and e2e tests for interaction (mouse, keyboard, clipboard, scrolling).

## Code style

- TypeScript in strict mode. Prettier settings: **no semicolons, single quotes, `printWidth: 100`**.
- Key ESLint rules (`eslint.config.ts`): `no-console` is an error, plus `camelcase`, `prefer-const`, `prefer-arrow-callback`, `no-var`, and errors for unused vars.
- Imports use the `lib/...` alias (for example `import { getCellInfo } from 'lib/core/utils/cell.ts'`) and tests use `tests/...`. Write explicit `.ts` extensions in import paths, as the existing code does.
- Use `import type` for type-only imports.
- Keep the library **free of runtime dependencies**. Don't add entries to `dependencies` in `packages/fast-sheets/package.json`.
- Shared types (including ones plugins exchange, such as `ModifiedCell`, `DomRect`, `CellsRangeWithPivot`) belong in `lib/core/types.ts`, and shared defaults (such as selection colors and the input font) in `lib/core/constants.ts`. Plugin-specific option types go in `lib/plugins/<name>/types.ts`.
- Code that more than one plugin could use (controllers, DOM overlay elements, utils) lives in `lib/core/`, not inside a plugin folder. Plugins don't import from each other.

## Architecture notes

- **`FastSheets`** (`lib/core/FastSheets.ts`) creates any DOM elements the caller doesn't pass in (container, canvas, scroll layers), merges options with `DEFAULT_OPTIONS` into `State`, binds wheel, scroll and resize events and registers plugins through `use(plugin)`. It keeps the registered plugins private: plugins call `unregister(name)` from their `destroy()`, other code checks a plugin with `hasPlugin(name)`, and the renderer gets the list through `renderer.setPlugins()`.
- **`State`** (`lib/core/State.ts`) is a plain mutable state shared by the renderer and plugins: options, viewport, row/column sizes and offsets, canvas size, `hasHeaderRow` and `numberingColumnWidth`.
- **`Renderer`** (`lib/core/Renderer.ts`): `render()` throttles through `requestAnimationFrame`, and `renderImmediate()` draws synchronously. The header row and the row-numbering column are drawn separately from the grid cells.
- **Plugins** implement `FastSheetsPlugin` (`lib/core/utils/plugins.ts`) and build their UI from the core controllers and elements (`lib/core/controllers/`, `lib/core/elements/`).
  A new plugin needs its own `lib/plugins/<name>/index.ts` entry, a matching entry in `packages/fast-sheets/vite.config.ts` and an `exports` entry in `packages/fast-sheets/package.json`.
- Plugins must clean up their DOM elements and event listeners in `destroy()`.
- Performance matters most here. Avoid per-cell allocations and DOM work inside render paths. Draw only what's inside the viewport.

## Commits and PRs

Commit messages follow `.github/commit-convention.md`, and `scripts/verify-commit.js` enforces it:

```
<type>(<scope>): <subject>
```

- **type:** `build|ci|docs|feat|fix|perf|refactor|release|style|test`
- **scope:** optional, for example `core`, `editable-plugin`, `search-plugin`, `renderer`, `vue-demo`
- **subject:** imperative mood, lowercase first letter, no trailing period, keep it to 50 characters or fewer

Work on a branch (such as `fix/...` or `feat/...`) and open a PR against `main`. Don't commit `dist/`, `test-results/` or `playwright-report/`.

Version bumps (`release:` commits) and publishing (`.github/workflows/publish.yml`) are the maintainer's job. Don't change `version` fields unless you're asked to.
