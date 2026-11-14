import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { faviconSet } from "./scripts/favicon-set"

// The router mounts the Site at `/`, so there is no `base` and the build lands in the assets
// root the Worker serves ([ADR 0002](./docs/adr/0002-site-worker-with-static-assets.md)).
export default defineConfig({
	output: "static",
	outDir: "./dist",
	// Always a trailing slash, so a Locale URL such as `/th/` is a directory.
	trailingSlash: "always",
	// `preserve` keeps `th/index.html` and `th/404.html`: the assets handler finds the nearest
	// `404.html`, and `directory` would build `th/404/index.html` instead ([ADR 0003]).
	build: { format: "preserve" },
	integrations: [faviconSet()],
	vite: { plugins: [tailwindcss()] },
})
