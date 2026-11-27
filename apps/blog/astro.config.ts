import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { BLOG_BASE, SITE_ORIGIN } from "./src/lib/site"

// The blog is served under the Site's /blog/ path (ADR 0004): Astro builds the pages at the assets
// root, and the Worker's `assets.base_path` serves that root under the prefix.
export default defineConfig({
	site: SITE_ORIGIN,
	base: BLOG_BASE,
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	// Code blocks take the Theme's roles from the stylesheet, so no highlighter paints its own colours.
	markdown: { syntaxHighlight: false },
	vite: { plugins: [tailwindcss()] },
})
