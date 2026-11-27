import { defineConfig } from "tsdown"

export default defineConfig({
	entry: { index: "src/index.ts", mark: "src/mark/decorative-mark.ts" },
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
})
