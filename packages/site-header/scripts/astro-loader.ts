import { dirname, resolve } from "node:path"
import { transform } from "@astrojs/compiler-rs"

/**
 * Whether the plugin is resolving a `?raw` specifier right now. Bun runs the plugin chain again for
 * the stripped specifier, so without this the CSS stub below would answer a raw stylesheet import
 * with a `css-stub:` name that no file answers to.
 */
let readingRaw = false

/**
 * The `bun test` preload that lets component tests import `.astro` files: it compiles them with the
 * same compiler Astro's Vite plugin uses, serves `?raw` imports as their file text, and stubs CSS
 * imports. Registration only — no mocks, no environment changes.
 */
Bun.plugin({
	name: "astro-test-loader",
	setup(build) {
		build.onResolve({ filter: /\?raw$/ }, (args) => {
			readingRaw = true
			try {
				return {
					path: import.meta.resolveSync(args.path.replace(/\?raw$/, ""), args.importer),
					namespace: "raw-text",
				}
			} finally {
				readingRaw = false
			}
		})
		build.onLoad({ filter: /.*/, namespace: "raw-text" }, async (args) => ({
			contents: `export default ${JSON.stringify(await Bun.file(args.path).text())}`,
			loader: "js",
		}))
		// Only stylesheets a component imports are stubbed, and the stub never reads its path;
		// anything else (e.g. a direct CSS import in a test) must resolve to its real file.
		build.onResolve({ filter: /\.css$/ }, (args) => {
			if (readingRaw) return undefined
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
