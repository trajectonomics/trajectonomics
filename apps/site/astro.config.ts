import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import { faviconSet } from "./scripts/favicon-set"

// The Site owns `/` on its own host, so there is no `base` and the build lands in the assets
// root the Worker serves ([ADR 0033](./docs/adr/0033-one-host-serves-the-site-docs-blog-and-data.md)).
export default defineConfig({
	output: "static",
	outDir: "./dist",
	// Always a trailing slash, so a Language build path such as `/th/` is a directory.
	trailingSlash: "always",
	// `preserve` keeps `th/index.html` and `index.html` at the paths the Worker reads them from;
	// `directory` would build `th/index/index.html` instead (ADR 0020).
	build: { format: "preserve" },
	integrations: [faviconSet()],
	vite: { plugins: [tailwindcss()] },
})
