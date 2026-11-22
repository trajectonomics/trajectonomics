import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { SITE_ORIGIN } from "./src/lib/site"

// The blog is the root of its own host, blog.trajectonomics.com (ADR 0002): no base, and the build
// lands in the assets root the Worker serves.
export default defineConfig({
	site: SITE_ORIGIN,
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	// Code blocks take the Theme's roles from the stylesheet, so no highlighter paints its own colours.
	markdown: { syntaxHighlight: false },
	vite: { plugins: [tailwindcss()] },
})
