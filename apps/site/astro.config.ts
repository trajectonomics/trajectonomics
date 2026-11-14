import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// The router mounts the Site at `/`, so there is no `base` and the build lands in the assets
// root the Worker serves ([ADR 0002](./docs/adr/0002-site-worker-with-static-assets.md)).
export default defineConfig({
	output: "static",
	outDir: "./dist",
	// Always a trailing slash, so a later Locale URL such as `/th/` can be a directory.
	trailingSlash: "always",
	vite: { plugins: [tailwindcss()] },
})
