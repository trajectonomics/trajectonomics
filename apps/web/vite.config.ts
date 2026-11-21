import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// Static output: the root layout prerenders one shell per route into dist/, served on loopback.
// There is no server and no hosting config ([ADR 0004](./docs/adr/0004-no-server-and-no-hosting.md)).
// Runes are forced for every file, so `export let`, `$:` and `$$props` do not compile.
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: { runes: true },
			adapter: adapter({ pages: "dist", assets: "dist", strict: true }),
			files: { assets: "public" },
		}),
	],
	preview: { host: "127.0.0.1", port: 4321, strictPort: true },
})
