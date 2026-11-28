import svelte from "@astrojs/svelte"
import { defineConfig } from "astro/config"

// The auth pages are their own origin, so no base path: `/sign-in/` is the page and `/th/sign-in/`
// is its Thai sibling. The Worker serves the build through `assets` and runs first only for the
// auth endpoints, `/jwks` and `/.well-known/*` (ADR 0003).
export default defineConfig({
	site: "https://auth.trajectonomics.com",
	output: "static",
	outDir: "./dist-site",
	trailingSlash: "always",
	integrations: [svelte()],
})
