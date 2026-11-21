---
status: accepted
---

# Svelte 5 on SvelteKit replaces Astro and React

The owner chose Svelte 5 for the Dashboard. React stays in this repository only in `apps/docs`, where Fumadocs needs it. The Dashboard is built with SvelteKit 3 in static output: every route is prerendered as a shell, and the Snapshot is read in the browser. [ADR 0003](0003-astro-with-react-islands-and-no-chart-library.md) is superseded by this decision. Its other choice still holds: no chart library, and the chart functions live in `src/lib/chart/`.

## Decision

- **Svelte 5 in runes mode, on SvelteKit 3, with `@sveltejs/adapter-static`.** `vite build` writes `dist/`. Each of the eight routes has a `dist/<route>/index.html` shell, and any static file server serves them with no fallback rule. The routes keep their addresses, and the trailing slash is always present.
- **No server-side rendering of data.** The root layout exports `prerender = true`, `ssr = false` and `trailingSlash = "always"`. The shell is static; the page renders in the browser after the Snapshot is read. There is no adapter other than the static one and no hosting config ([ADR 0004](0004-no-server-and-no-hosting.md) still holds).
- **Configuration is in `vite.config.ts`.** SvelteKit 3 no longer reads `svelte.config.js`. The `sveltekit()` plugin takes the adapter, the static folder and `compilerOptions.runes: true`. `tsconfig.json` extends `$app/tsconfig` and `tsconfig.base.json`, so every strict option of the base still applies.
- **Shared reactive state lives in `.svelte.ts` modules under `src/client/`.** Stores are not used. A module that touches the browser is the only place that does: storage, the address bar, `fetch` and the document.
- **Pure view models stay in `src/lib/view/`.** A component takes props and renders. It does not compute a figure, and it never calls `$app/state` unless it is a route file or part of the shell.

## The guards

Agents write Svelte from memory, and a weaker model writes Svelte 3 or 4 syntax or puts logic in the wrong place. Each guard turns that mistake into a failing `bun run check` with the Svelte 5 form to write.

1. **Runes mode is forced** in `vite.config.ts`. `export let`, `$:`, `$$props`, `$$restProps` and `$$slots` do not compile.
2. **`svelte-check --fail-on-warnings`** in `typecheck`. The deprecated forms that still compile, such as `<slot>` and `on:click`, fail the check as warnings.
3. **A source guard under `bun test`** (`src/lib/guard/`, run over every component by `scripts/svelte-guard.test.ts`). It refuses Svelte 4 syntax, a component script without `lang="ts"`, a component longer than 100 non-blank lines, a money string turned into a number, React or Astro imports, `{@html}` outside the brand mark, and `fetch`, `localStorage`, `window` and `document` outside `src/client/`.
4. **A dependency guard**, `scripts/dependency-guard.test.ts`, that refuses `react`, `react-dom`, `astro` and `@astrojs/*` in the Dashboard's `package.json`. It is a `test.todo` until the last React page is ported, because the React pages still in the tree need React.
5. **Component tests under `bun test`.** `bunfig.toml` preloads `scripts/svelte/preload.ts`, which compiles `.svelte` and `.svelte.ts` with `svelte/compiler`, in the server form, so `render` from `svelte/server` renders a component to a string. The official `bun-plugin-svelte` 0.0.6 was checked and does not support server-side imports, so it cannot provide this.

Biome 2.6.3 lints and formats `.svelte` files, but only their scripts. It flags an import used only in the markup as unused, so the `.svelte` override turns off `noUnusedImports` and `noUnusedVariables`, as the `.astro` override did before. `svelte-check` checks those with the template in view, under the base `noUnusedLocals`.

## Considered Options

- **Keep Astro with Svelte islands.** Rejected. It keeps two component models in the Dashboard, and the owner's decision is one.
- **SvelteKit 2 with `svelte.config.js`.** Rejected. SvelteKit 2 is the previous major, and the current stable line is 3.
- **Vite and Svelte without SvelteKit.** Rejected. The routes, the prerendered shells and the trailing-slash rule are what SvelteKit gives for free.
- **`bun-plugin-svelte` for the component tests.** Rejected, as above: it does not render on the server.

## Consequences

- A component is a `.svelte` file with `<script lang="ts">`, props from `$props()`, snippets for children, and event attributes. Its page's logic is a pure view model.
- A new page starts from a route file that sets `<svelte:head>` with `<Name> · Dashboard`, and renders a component.
- The static shell has no markup of its own, so the first paint is empty until the script runs. The theme is still set before the first paint by the inline script in `src/app.html`.
- React stays in `src/components/` only for the pages not yet ported. It is deleted with the last port, and then `react` and `react-dom` leave `apps/web/package.json` and the dependency guard is turned on.
