<!-- SPDX-License-Identifier: MIT
      https://opensource.org/licenses/MIT -->

# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

`fast-sheets` is a small, dependency-free TypeScript library that renders huge data grids on a `<canvas>`. Only the visible viewport gets rendered. A hidden native scroll container (`elScroll` plus the `elScrollPaneX`/`elScrollPaneY` spacers) supplies the scrollbars and scroll position.

It's a **pnpm monorepo**:

| Path | Purpose |
| --- | --- |
| `packages/fast-sheets/` | The published library (npm `fast-sheets`) |
| `packages/fast-sheets/lib/core/` | Core: `FastSheets`, `Renderer`, `State`, `Font`, `FontsManager`, types, constants, utils |
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

jsdom has no canvas, so unit tests that measure rows or fonts create the renderer with `createMeasuringRenderer` (`tests/unit/utils/renderer.ts`), which runs `init()` with a fake canvas context.

## Code style

- TypeScript in strict mode. Prettier settings: **no semicolons, single quotes, `printWidth: 100`**.
- Key ESLint rules (`eslint.config.ts`): `no-console` is an error, plus `camelcase`, `prefer-const`, `prefer-arrow-callback`, `no-var`, and errors for unused vars.
- Imports use the `lib/...` alias (for example `import { getCellInfo } from 'lib/core/utils/cell.ts'`) and tests use `tests/...`. Write explicit `.ts` extensions in import paths, as the existing code does.
- Use `import type` for type-only imports.
- Keep the library **free of runtime dependencies**. Don't add entries to `dependencies` in `packages/fast-sheets/package.json`.
- Shared types (including ones plugins exchange, such as `ModifiedCell`, `DomRect`, `CellsRangeWithPivot`) belong in `lib/core/types.ts`, and shared defaults (such as selection colors and the input font) in `lib/core/constants.ts`. Plugin-specific option types go in `lib/plugins/<name>/types.ts`.
- Code that more than one plugin could use (controllers, DOM overlay elements, utils) lives in `lib/core/`, not inside a plugin folder. Plugins don't import from each other.

## Architecture notes

- **`FastSheets`** (`lib/core/FastSheets.ts`) creates any DOM elements the caller doesn't pass in (container, canvas, scroll layers), merges options with `DEFAULT_OPTIONS` into `State`, binds wheel, scroll, resize, mouse, pointer and keyboard events and registers plugins through `use(plugin)`. It passes the events to the plugin hooks and applies data changes through `setCells()`, which runs the `beforeCellsChange` and `afterCellsChange` hooks and writes `data`. It keeps the registered plugins private: plugins call `unregister(name)` from their `destroy()`, other code checks a plugin with `hasPlugin(name)`, and the renderer gets the hooks through `renderer.setPluginHooks()`.
- **`State`** (`lib/core/State.ts`) is a plain mutable state shared by the renderer and plugins: options, viewport, row/column sizes and offsets, canvas size, `hasHeaderRow` and `numberingColumnWidth`.
- **`Renderer`** (`lib/core/Renderer.ts`): `render()` throttles through `requestAnimationFrame`, and `renderImmediate()` renders synchronously. It does nothing before the first layout (`init()`), which the resize observer starts. A frame renders the corner, the header-row, the numbering-column and the data cells in one pass, then the borders in a second pass, so that they go on top of content that spills outside a cell.
- **`FontsManager`** (`lib/core/FontsManager.ts`) measures fonts once the first layout gives it a canvas context, and caches them until the next layout. A `cellStyle` hook gets a font for `style.font` through `renderer.getFont()`.
- **Cells** are `{ rowIndex, columnIndex }`. A column-heading has `rowIndex` -1, a row-numbering cell has `columnIndex` -1, and the top-left corner has both. Use the helpers in `lib/core/utils/cell.ts` (`isDataCell`, `isColumnHeading`, `isRowNumbering`, `isCornerCell`) instead of comparing indexes.
- **Plugins** implement `FastSheetsPlugin` (`lib/core/utils/plugins.ts`), customize the grid through its hooks and build their UI from the core controllers and elements (`lib/core/controllers/`, `lib/core/elements/`).
  Hooks run in the order plugins are registered with `use()`, so a later plugin overrides and renders over the earlier ones. Input hooks and `beforeCellsChange` run from the last registered plugin first, and a plugin can call `stop()` on the event to keep it from the plugins below. The style and rendering hooks run for every visible cell in every frame, and the cells and contexts they get are reused, so they're valid only during the call.
  A new plugin needs its own `lib/plugins/<name>/index.ts` entry, a matching entry in `packages/fast-sheets/vite.config.ts` and an `exports` entry in `packages/fast-sheets/package.json`.
- Plugins must clean up their DOM elements and event listeners in `destroy()`.
- Performance and customization matter most here. Avoid per-cell allocations and DOM work inside render paths. Render only what's inside the viewport.

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
