import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// Static output: the Dashboard is pages plus React islands, built once and previewed on loopback.
// There is no server, no adapter and no hosting config ([ADR 0004](./docs/adr/0004-no-server-and-no-hosting.md)).
export default defineConfig({
	output: "static",
	outDir: "./dist",
	trailingSlash: "always",
	integrations: [react()],
	vite: { plugins: [tailwindcss()] },
})
