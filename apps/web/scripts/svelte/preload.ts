// Registered by bunfig.toml for `bun test`. It compiles `.svelte` components and `.svelte.ts` modules
// with svelte/compiler, for server rendering with `render` from `svelte/server`, and resolves SvelteKit's
// `$app/*` modules to a stub. The compiled output is the server build, so `$effect` does not run in tests.

import { fileURLToPath } from "node:url"
import { plugin } from "bun"
import { compile, compileModule } from "svelte/compiler"

// Every `traj` a test spawns runs for a test, never for a person, so it must not count in the usage
// telemetry that goal G1 is measured by (root AGENTS.md, "Owner"). Set once here: a helper that builds
// its own `env` spreads `process.env`, so it inherits this. A spawn must pass `env` (`process.env`, or
// a spread of it) to inherit `DO_NOT_TRACK`.
process.env["DO_NOT_TRACK"] = "1"

const APP_STUB = fileURLToPath(new URL("./app-stub.ts", import.meta.url))

/**
 * Points every `$app/…` import at the stub. The rewrite is on the compiled text, because an import made
 * from a module that a plugin loaded is not reliably passed to `onResolve`.
 */
function stubApp(code: string): string {
	return code.replace(/(["'])\$app\/[a-z-]+\1/g, JSON.stringify(APP_STUB))
}

plugin({
	name: "svelte-components",
	setup(build) {
		build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
			const source = await Bun.file(path).text()
			const { js } = compile(source, { filename: path, generate: "server", runes: true })
			return { contents: stubApp(js.code), loader: "js" }
		})

		build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
			const source = await Bun.file(path).text()
			const plain = new Bun.Transpiler({ loader: "ts" }).transformSync(source)
			const { js } = compileModule(plain, { filename: path, generate: "server" })
			return { contents: stubApp(js.code), loader: "js" }
		})
	},
})
