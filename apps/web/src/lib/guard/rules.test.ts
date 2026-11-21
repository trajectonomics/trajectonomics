import { describe, expect, test } from "bun:test"
import { checkComponent } from "./check"

const FILE = "src/components/example/Example.svelte"

// Each rule has one bad example that it must refuse, and one good example, in Svelte 5, that it must pass.
const CASES: readonly { rule: string; bad: string; good: string }[] = [
	{
		rule: "legacy/export-let",
		bad: '<script lang="ts">\n\texport let name: string\n</script>',
		good: '<script lang="ts">\n\tlet { name }: { name: string } = $props()\n</script>',
	},
	{
		rule: "legacy/reactive-statement",
		bad: '<script lang="ts">\n\tlet count = $state(0)\n\t$: doubled = count * 2\n</script>',
		good: '<script lang="ts">\n\tlet count = $state(0)\n\tconst doubled = $derived(count * 2)\n</script>',
	},
	{
		rule: "legacy/event-directive",
		bad: '<script lang="ts"></script>\n<button on:click={save}>Save</button>',
		good: '<script lang="ts"></script>\n<button onclick={save}>Save</button>',
	},
	{
		rule: "legacy/slot",
		bad: '<script lang="ts"></script>\n<section><slot /></section>',
		good: '<script lang="ts">\n\tlet { children } = $props()\n</script>\n<section>{@render children()}</section>',
	},
	{
		rule: "legacy/create-event-dispatcher",
		bad: '<script lang="ts">\n\timport { createEventDispatcher } from "svelte"\n</script>',
		good: '<script lang="ts">\n\tlet { onSave }: { onSave: () => void } = $props()\n</script>',
	},
	{
		rule: "legacy/svelte-store",
		bad: '<script lang="ts">\n\timport { writable } from "svelte/store"\n</script>',
		good: '<script lang="ts">\n\timport { preferences } from "../../client/preferences.svelte.js"\n</script>',
	},
	{
		rule: "legacy/dollar-props",
		bad: '<script lang="ts">\n\tconst all = $$props\n</script>',
		good: '<script lang="ts">\n\tlet { label } = $props()\n</script>',
	},
	{
		rule: "legacy/dollar-rest-props",
		bad: '<script lang="ts">\n\tconst rest = $$restProps\n</script>',
		good: '<script lang="ts">\n\tlet { label, ...rest } = $props()\n</script>',
	},
	{
		rule: "legacy/dollar-slots",
		bad: '<script lang="ts"></script>\n{#if $$slots.footer}<footer />{/if}',
		good: '<script lang="ts">\n\tlet { footer } = $props()\n</script>\n{#if footer}{@render footer()}{/if}',
	},
	{
		rule: "legacy/svelte-component",
		bad: '<script lang="ts">\n\tlet { view } = $props()\n</script>\n<svelte:component this={view} />',
		good: '<script lang="ts">\n\tlet { view: View } = $props()\n</script>\n<View />',
	},
	{
		rule: "legacy/svelte-self",
		bad: '<script lang="ts"></script>\n<svelte:self depth={1} />',
		good: '<script lang="ts">\n\timport Tree from "./Tree.svelte"\n</script>\n<Tree depth={1} />',
	},
	{
		rule: "money/number-conversion",
		bad: '<script lang="ts">\n\tconst n = Number(amount)\n</script>',
		good: '<script lang="ts">\n\timport { formatMoney } from "../../lib/format"\n</script>\n{formatMoney(amount)}',
	},
	{
		rule: "money/number-conversion",
		bad: '<script lang="ts">\n\tconst s = value.toFixed(2)\n</script>',
		good: '<script lang="ts">\n\timport { toChartNumber } from "../../lib/chart"\n\tconst x = toChartNumber(amount)\n</script>',
	},
	{
		rule: "framework/react-or-astro",
		bad: '<script lang="ts">\n\timport { useState } from "react"\n</script>',
		good: '<script lang="ts">\n\timport { preferences } from "../../client/preferences.svelte.js"\n</script>',
	},
	{
		rule: "framework/react-or-astro",
		bad: '<script lang="ts">\n\timport Layout from "@astrojs/react"\n</script>',
		good: '<script lang="ts">\n\timport Layout from "../layouts/Layout.svelte"\n</script>',
	},
	{
		rule: "html/at-html",
		bad: '<script lang="ts">\n\tlet { note } = $props()\n</script>\n<p>{@html note}</p>',
		good: '<script lang="ts">\n\tlet { note } = $props()\n</script>\n<p>{note}</p>',
	},
	{
		rule: "browser/fetch",
		bad: '<script lang="ts">\n\tconst res = await fetch("/snapshot.json")\n</script>',
		good: '<script lang="ts">\n\timport { currentSnapshot } from "../../client/snapshot.svelte.js"\n</script>',
	},
	{
		rule: "browser/local-storage",
		bad: '<script lang="ts">\n\tconst theme = localStorage.getItem("traj.theme")\n</script>',
		good: '<script lang="ts">\n\timport { preferences } from "../../client/preferences.svelte.js"\n</script>',
	},
	{
		rule: "browser/window",
		bad: '<script lang="ts">\n\tconst where = window.location.pathname\n</script>',
		good: '<script lang="ts">\n\timport { currentPathname } from "../../client/location.svelte.js"\n</script>',
	},
	{
		rule: "browser/document",
		bad: '<script lang="ts">\n\tdocument.title = "Net worth"\n</script>',
		good: '<script lang="ts">\n\timport { applyTheme } from "../../client/browser"\n</script>',
	},
	{
		rule: "script/lang-ts",
		bad: "<script>\n\tlet count = $state(0)\n</script>",
		good: '<script lang="ts">\n\tlet count = $state(0)\n</script>',
	},
]

describe("the Svelte 5 guard: each rule refuses its bad example and passes its good one", () => {
	test.each(CASES)("$rule", ({ rule, bad, good }) => {
		const issues = checkComponent(bad, FILE).filter((issue) => issue.rule === rule)
		expect(issues.length, `${rule} flags the bad example`).toBeGreaterThan(0)
		expect(issues[0]?.message ?? "", "the message names the Svelte 5 form").not.toBe("")
		const passes = checkComponent(good, FILE).filter((issue) => issue.rule === rule)
		expect(passes, `${rule} passes the good example`).toEqual([])
	})
})

describe("the Svelte 5 guard: the file rules", () => {
	test("refuses a component of more than 100 non-blank lines, and not one of exactly 100", () => {
		const lines = Array.from({ length: 101 }, (_, index) => `<p>line ${index}</p>`).join("\n")
		const long = checkComponent(lines, FILE).filter(
			(issue) => issue.rule === "size/component-lines",
		)
		expect(long.map((issue) => issue.line)).toEqual([1])
		expect(long[0]?.message).toContain("101 non-blank lines")
		const exact = Array.from({ length: 100 }, (_, index) => `<p>${index}</p>`).join("\n\n")
		expect(checkComponent(exact, FILE).some((issue) => issue.rule === "size/component-lines")).toBe(
			false,
		)
	})

	test("the line-length rule does not apply to a .svelte.ts module, which Biome already limits", () => {
		const lines = Array.from(
			{ length: 150 },
			(_, index) => `export const v${index} = ${index}`,
		).join("\n")
		expect(checkComponent(lines, "src/client/example.svelte.ts")).toEqual([])
	})

	test("the browser rules do not apply inside src/client/", () => {
		const source = 'export const theme = localStorage.getItem("traj.theme")'
		expect(
			checkComponent(source, "src/client/preferences.svelte.ts").some(
				(issue) => issue.rule === "browser/local-storage",
			),
		).toBe(false)
		expect(
			checkComponent(source, "src/components/x/Y.svelte.ts").some(
				(issue) => issue.rule === "browser/local-storage",
			),
		).toBe(true)
	})

	test("only the brand mark may use {@html}, by its file", () => {
		const source = "<p>{@html note}</p>"
		expect(checkComponent(source, "src/components/shell/SiteBrand.svelte")).toEqual([])
		expect(
			checkComponent(source, "src/components/ui/Card.svelte").map((issue) => issue.rule),
		).toEqual(["html/at-html"])
	})

	test("reports each issue on its own line, in line order", () => {
		const source = "<script>\n\texport let a\n</script>\n<button on:click={b}>x</button>"
		const issues = checkComponent(source, FILE)
		expect(issues.map((issue) => [issue.rule, issue.line])).toEqual([
			["script/lang-ts", 1],
			["legacy/export-let", 2],
			["legacy/event-directive", 4],
		])
	})
})
