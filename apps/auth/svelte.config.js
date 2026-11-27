import { vitePreprocess } from "@astrojs/svelte"

/** Svelte 5 runes and TypeScript in every island. */
export default {
	preprocess: vitePreprocess(),
	compilerOptions: { runes: true },
}
