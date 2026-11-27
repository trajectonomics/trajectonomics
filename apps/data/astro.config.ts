import svelte from "@astrojs/svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { BASE_PATH, SITE_ORIGIN } from "./src/lib/site"

// Every static site is served under one host; the data site is the `/data` base path, and the
// assets binding mounts the build there. The build still lands in `./dist`, whose root is served at
// `/data/`; the API and ingest stay Worker routes (ADR 0001, ADR 0006).
export default defineConfig({
	site: SITE_ORIGIN,
	base: BASE_PATH,
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	integrations: [svelte()],
	vite: { plugins: [tailwindcss()] },
})
