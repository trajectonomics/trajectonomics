import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { SITE_ORIGIN } from "./src/lib/site"

// The blog is served under /blog through the router (ADR 0002). Workers Static Assets resolves files
// by request path, so the build lands in dist/blog and the Worker serves ./dist.
export default defineConfig({
	site: SITE_ORIGIN,
	base: "/blog",
	output: "static",
	outDir: "./dist/blog",
	trailingSlash: "always",
	vite: { plugins: [tailwindcss()] },
})
