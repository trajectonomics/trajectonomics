import { dirname, resolve } from "node:path"
import { transform } from "@astrojs/compiler-rs"

/**
 * The `bun test` preload that lets component tests import `.astro` files: it compiles them with the
 * same compiler Astro's Vite plugin uses, serves `?raw` imports as their file text, and stubs CSS
 * imports. Registration only — no mocks, no environment changes — so every other `bun test` run,
 * including `bun test ./test/dist`, is unaffected.
 */
Bun.plugin({
	name: "astro-test-loader",
	setup(build) {
		build.onResolve({ filter: /\?raw$/ }, (args) => ({
			path: import.meta.resolveSync(args.path.replace(/\?raw$/, ""), args.importer),
			namespace: "raw-text",
		}))
		build.onLoad({ filter: /.*/, namespace: "raw-text" }, async (args) => ({
			contents: `export default ${JSON.stringify(await Bun.file(args.path).text())}`,
			loader: "js",
		}))
		// Only stylesheets a component imports are stubbed, and the stub never reads its path;
		// anything else (e.g. Bun.resolveSync in scripts/adapters) must resolve to its real file,
		// so the default resolution continues.
		build.onResolve({ filter: /\.css$/ }, (args) => {
			if (!args.importer.endsWith(".astro")) return undefined
			return { path: args.path, namespace: "css-stub" }
		})
		build.onLoad({ filter: /.*/, namespace: "css-stub" }, () => ({ contents: "", loader: "js" }))
		build.onLoad({ filter: /\.astro$/ }, async (args) => {
			const source = await Bun.file(args.path).text()
			const result = transform(source, {
				filename: args.path,
				normalizedFilename: args.path,
				internalURL: "@astrojs/runtime/compiler-runtime",
				resultScopedSlot: true,
				resolvePath: (specifier) =>
					specifier.startsWith(".") ? resolve(dirname(args.path), specifier) : specifier,
			})
			const error = result.diagnostics.find((diagnostic) => diagnostic.severity === "error")
			if (error) throw new Error(`Astro could not compile ${args.path}: ${error.text}`)
			return { contents: result.code, loader: "js" }
		})
	},
})
