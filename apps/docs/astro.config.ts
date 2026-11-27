import fumadocs from "@fumadocs/astro"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { restoreCodeFences } from "./src/lib/code-fences"
import { prefixDocsLinks } from "./src/lib/docs-links"
import { flowFences } from "./src/lib/flow-fence"
import { linkCards } from "./src/lib/link-cards"
import { SITE_ORIGIN } from "./src/lib/site"
import { staleRedirects } from "./src/lib/stale-redirects"
import { DOCS_BASE_PATH, TAB_ALIASES, tabUrl } from "./src/lib/tabs"
import { treeFences } from "./src/lib/tree-fence"

// The Docs Portal is served under the Site's /docs mount (ADR 0017). The build lands in dist at
// its root and Workers Static Assets serves that root at /docs through `assets.base_path`.
export default defineConfig({
	site: SITE_ORIGIN,
	base: DOCS_BASE_PATH,
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	// The audience names in the Landing Page's entries are URLs a reader may type: /operators/
	// and /builders/ reach the Tab they name instead of the 404 page (docs#113).
	redirects: Object.fromEntries(TAB_ALIASES.map((alias) => [alias.path, tabUrl(alias.tab)])),
	integrations: [
		fumadocs({
			collections: {
				docs: {
					dir: "src/content/docs",
					// The MDX components render fences as Fumadocs code blocks (copy control,
					// scroll container); they also need the fence shape src/lib/code-fences.ts restores.
					// Every plugin here runs before Fumadocs' preset: the `flow` and `tree` fences become
					// lists, and link cards are marked, so the highlighter never colours a picture.
					components: "./src/components/mdx.tsx",
					hastPlugins: (plugins) => [
						restoreCodeFences(),
						flowFences(),
						treeFences(),
						linkCards(),
						prefixDocsLinks(),
						...plugins,
					],
					// GitHub's current dark palette, not the older `github-dark` Fumadocs defaults to:
					// that theme's comment colour (#6A737D) fails WCAG AA on the dark code surface
					// (#171717, 3.7:1), and the accessibility suite fails every page with a fence.
					// The light palette stays the default; replace this once the design system owns
					// syntax colours (docs#89).
					rehypeCodeOptions: {
						themes: { light: "github-light", dark: "github-dark-default" },
					},
				},
			},
		}),
		staleRedirects(),
	],
	vite: { plugins: [tailwindcss()] },
})
