import svelte from "@astrojs/svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { SITE_ORIGIN } from "./src/lib/site"

// The data site is the root of its own host, data.trajectonomics.com. The build lands in the
// assets root the Worker serves; the API and ingest stay Worker routes (ADR 0001).
export default defineConfig({
	site: SITE_ORIGIN,
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	integrations: [svelte()],
	vite: { plugins: [tailwindcss()] },
})
