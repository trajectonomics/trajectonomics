import type { LineRule } from "./line-rule"

/** Stores are Svelte 4's shared state. A static or a dynamic import of them is refused. */
export const STORE_RULE: LineRule = {
	rule: "legacy/svelte-store",
	pattern: /["']svelte\/store["']/,
	message:
		"Svelte stores are not used. Share reactive state through a `.svelte.ts` module under `src/client/` with `$state`.",
}

/** Svelte 4 syntax. It compiles in Svelte 5 with the runes mode off, so the guard refuses it by name. */
export const SYNTAX_RULES: readonly LineRule[] = [
	{
		rule: "legacy/export-let",
		pattern: /\bexport\s+let\b/,
		message: "Svelte 4 `export let`. Declare the props with `let { name } = $props()`.",
	},
	{
		rule: "legacy/reactive-statement",
		pattern: /(^|[\s;{}])\$:/,
		message:
			"Svelte 4 `$:`. For a value write `const x = $derived(…)`; for a side effect write `$effect(() => …)`.",
	},
	{
		rule: "legacy/event-directive",
		pattern: /\son:[a-z][a-z-]*(\|[a-z]+)*(?=[\s=/>])/,
		message: "Svelte 4 `on:` directive. Write an event attribute instead: `onclick={handler}`.",
	},
	{
		rule: "legacy/slot",
		pattern: /<slot[\s/>]/,
		message:
			"Svelte 4 `<slot>`. Take a snippet prop: `children: Snippet` and `{@render children()}`.",
	},
	{
		rule: "legacy/create-event-dispatcher",
		pattern: /\bcreateEventDispatcher\b/,
		message:
			"Svelte 4 `createEventDispatcher`. Pass a callback prop, such as `onSave: (value: string) => void`.",
	},
	STORE_RULE,
	{
		rule: "legacy/dollar-props",
		pattern: /\$\$props\b/,
		message: "Svelte 4 `$$props`. Destructure the props you take: `let { a, b } = $props()`.",
	},
	{
		rule: "legacy/dollar-rest-props",
		pattern: /\$\$restProps\b/,
		message: "Svelte 4 `$$restProps`. Use a rest pattern: `let { a, ...rest } = $props()`.",
	},
	{
		rule: "legacy/dollar-slots",
		pattern: /\$\$slots\b/,
		message: "Svelte 4 `$$slots`. Take an optional snippet prop and test it: `{#if children}`.",
	},
	{
		rule: "legacy/svelte-component",
		pattern: /<svelte:component[\s>]/,
		message:
			"Svelte 4 `<svelte:component>`. Render the component variable directly: `<Current />`.",
	},
	{
		rule: "legacy/svelte-self",
		pattern: /<svelte:self[\s>]/,
		message: "Svelte 4 `<svelte:self>`. Import the component by its file name and render it.",
	},
]
