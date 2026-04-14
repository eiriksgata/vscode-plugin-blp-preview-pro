# Repository Guidelines

This repository is a VS Code extension for Warcraft III assets previewing, exploration, and conversion.

## Project Identity

- Project: blp-preview-pro
- Primary goal: provide custom editors and explorer tools for Warcraft III asset formats (BLP/TGA/MDX/W3X and related resources).
- Core stack: TypeScript, VS Code Extension API, Webpack, custom webview runtime under `media/`.
- Runtime note: package manifest requires Node `>=20`.

## Project Structure

- `src/extension.ts`: extension activation entry; wires status bar entries, custom editors, tree providers, and commands.
- `src/custom-editor/`: webview editor framework and format-specific viewers (BLP, model, map, SLK, audio).
- `src/custom-editor/mapPreview/`: map and terrain preview/editor pipeline.
- `src/command/`: command registration and format conversion commands.
- `src/tree-provider/`: MPQ/W3X explorers and related view data providers.
- `src/mpq-manager/`: MPQ loading and archive lifecycle logic.
- `src/common/`: shared utilities (fs/config/task/logger/error handling, etc.).
- `media/`: webview-side scripts/styles loaded by preview editors.
- `bind/`: native runtime helpers/binaries by platform.
- `docs/`: feature docs and implementation notes.

## Build And Validation Commands

Use scripts from `package.json` only:

- `npm run compile`: development webpack compile.
- `npm run watch`: incremental webpack watch.
- `npm run package`: production webpack bundle (`hidden-source-map`).
- `npm run lint`: eslint for `src/**/*.ts`.
- `npm run test-compile`: TypeScript compile for tests.
- `npm run test`: run extension tests (includes `pretest`: compile + lint).

Notes:

- `bun run <script>` also works in this repo if Bun is installed, but script names and behavior are defined by `package.json`.
- For routine agent validation after edits, prefer `npm run compile`. Run `npm run lint` when touching TypeScript logic. Run `npm run test` for behavioral changes.

## Implementation Constraints

- Keep command IDs, view IDs, and custom editor `viewType` values aligned with `package.json` contributions.
- Preserve compatibility with the existing extension engine baseline (`vscode` `^1.58.0`) unless a deliberate upgrade is requested.
- Do not rename or move webview entry files in `media/` without updating all URI references in corresponding preview classes.
- Preserve existing i18n flow (`package.nls.json`, `package.nls.zh-cn.json`, and `src/localize.ts`) when changing user-facing strings.
- Maintain strict TypeScript settings from `tsconfig.json`; avoid weakening strictness flags to bypass errors.

## Webview And Preview Safety

- Ensure each preview type resolves CSS/JS asset names that actually exist under `media/`.
- Keep message protocol changes synchronized between extension side (`src/custom-editor/**`) and webview runtime (`media/**`).
- Prefer small, isolated changes for map preview/editor code; it has heavy rendering and interaction coupling.
- When adding new webview features, verify disposal/cleanup paths to avoid leaked listeners or stale editor state.

## Native/Binary And Platform Rules

- Do not modify binaries under `bind/` unless explicitly requested.
- If native binding load fails, diagnose platform/arch mismatch first before code changes.

## Common Failure Checks

- Compile fails: run `npm run compile` and fix TypeScript or webpack resolution issues.
- Lint fails: run `npm run lint` and resolve eslint violations in touched files.
- Webview blank/partial render: verify contributed webview resource paths and built asset names in `media/`.
- Explorer data missing: verify MPQ location/config and manager initialization flow in `src/mpq-manager/`.
- Custom editor not opening: verify `package.json` `customEditors.selector` patterns and provider registration in `src/custom-editor/`.

## Documentation And References

- Project overview and user-facing usage: `README.md`.
- Feature and implementation details: `docs/`.
- Migration/maintenance context: `MIGRATION_REPORT.md`, `REFACTORING_GUIDE.md`.

## Collaboration And Safety Rules

- Do not run destructive git commands unless explicitly requested.
- Do not revert unrelated local changes.
- Keep edits scoped to the requested task.
- Prefer small, reviewable commits with task-focused messages.

## File Reference Convention In Chat

- Use repository-root relative paths when referencing files.
- Include line numbers when discussing specific code locations.
