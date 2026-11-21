import { fileURLToPath } from "node:url"
import { defineConfig, type UserConfig } from "tsdown"

// Each internal package is bundled from its source, so the build does not wait on the four
// packages' own builds, and every subpath shares one copy of each module. `alias` and
// `alwaysBundle` make sure no `@trajectonomics/*` specifier survives into `dist/`.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const sourceOf = (name: string) => here(`./${name}/src/index.ts`)

const config: UserConfig = defineConfig({
	entry: {
		"money/index": sourceOf("money"),
		"ledger/index": sourceOf("ledger"),
		"tax/index": here("./tax/src/index.ts"),
		"tax/th/index": here("./tax/src/th/index.ts"),
		"tax/us/index": here("./tax/src/us/index.ts"),
		"sim/index": sourceOf("sim"),
	},
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
	alias: {
		"@trajectonomics/money": sourceOf("money"),
		"@trajectonomics/ledger": sourceOf("ledger"),
		"@trajectonomics/tax": here("./tax/src/index.ts"),
		"@trajectonomics/sim": sourceOf("sim"),
	},
	deps: {
		alwaysBundle: [/^@trajectonomics\//],
	},
})

export default config
