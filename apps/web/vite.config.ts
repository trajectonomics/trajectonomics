import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type Plugin } from "vite"
import hostedConfig from "./src/hosted/overrides.json" with { type: "json" }

// Static output: the root layout prerenders one shell per route into dist/, served on loopback.
// There is no server and no hosting config ([ADR 0004](./docs/adr/0004-no-server-and-no-hosting.md)).
// Runes are forced for every file, so `export let`, `$:` and `$$props` do not compile.
//
// `TRAJ_WEB_TARGET=hosted` builds the hosted Demo instead ([ADR 0028](./docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)):
// its own output folder (`dist-hosted/`, or `TRAJ_WEB_OUT`), the base path from src/hosted/overrides.json, and the
// closed list of twins in that file swapped in. Without the variable nothing below changes the loopback build, and
// `dist/` (which `scripts/pack.ts` packs into dashboard.bin) is the same bytes.
const hosted = process.env["TRAJ_WEB_TARGET"] === "hosted"
const out = hosted ? (process.env["TRAJ_WEB_OUT"] ?? "dist-hosted") : "dist"
const SRC = join(dirname(fileURLToPath(import.meta.url)), "src")
const HOSTED = join(SRC, "hosted")
const TWINS: Readonly<Record<string, string>> = hostedConfig.modules

/**
 * Resolves every import as Vite would, then answers the twin when the file is on the closed list. A twin's own imports
 * are left alone, so it can import the module it stands in for (the layout twin renders the layout).
 */
function hostedTwins(): Plugin {
	return {
		name: "traj-hosted-twins",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (importer === undefined || importer.startsWith(HOSTED + sep)) return null
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
			const path = relative(SRC, (resolved?.id ?? "").split("?")[0] ?? "")
			const twin = path.startsWith("..") ? undefined : TWINS[path.split(sep).join("/")]
			return twin === undefined ? null : join(HOSTED, twin)
		},
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		...(hosted ? [hostedTwins()] : []),
		sveltekit({
			compilerOptions: { runes: true },
			adapter: adapter({ pages: out, assets: out, strict: true }),
			files: { assets: "public" },
			...(hosted
				? { paths: { base: hostedConfig.base as `/${string}` }, outDir: ".svelte-kit-hosted" }
				: {}),
		}),
	],
	preview: { host: "127.0.0.1", port: 4321, strictPort: true },
})
