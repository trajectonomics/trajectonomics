/**
 * A `.astro` file imported from a test: the component factory Astro's Container API renders.
 * Astro's own files resolve `.astro` imports with full prop types; this declaration covers the
 * plain-`tsc` view, where only test files import components.
 */
declare module "*.astro" {
	import type { AstroComponentFactory } from "astro/runtime/server/index.js"

	const component: AstroComponentFactory
	export default component
}
