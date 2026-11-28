<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { withSearch } from "../../lib/view/links"
import type { FocusButton } from "../../lib/view/overview/focus"
import type { HeroWarning } from "../../lib/view/overview/hero"
import { PRIMARY_ACTION } from "../ui/focus"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	button: FocusButton
	/** The CLI's notes worth checking, in their order. */
	warnings: readonly HeroWarning[]
	/** "1 thing to check", "2 things to check", or null when the CLI states none. */
	warningsLabel: string | null
}

/** The focus point's one primary action, and beside it the notes the CLI asks the reader to check. */
let { button, warnings, warningsLabel }: Props = $props()
const CHIP =
	"inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:text-foreground"
/** The first note's anchor, on the FI page, with the address's query string kept before the hash. */
const noteHref = $derived(
	warnings[0] === undefined ? "" : `${withSearch("/fi/", currentSearch())}#${warnings[0].anchor}`,
)
</script>

<!-- The warning triangle is Lucide's triangle-alert (ISC), drawn here as SVG elements. -->
<div class="flex flex-wrap items-center gap-3">
	{#if button.external}
		<a data-primary-action href={button.href} class={PRIMARY_ACTION}>{button.label}</a>
	{:else}
		<SiteLink data-primary-action href={button.href} class={PRIMARY_ACTION}>{button.label}</SiteLink>
	{/if}
	{#if warnings.length > 0 && warningsLabel !== null}
		<a data-focus-chip href={noteHref} aria-label={warningsLabel} class={CHIP}>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-4"
			>
				<path d="M21.7 17.9 13.7 3.9a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1" />
				<path d="M12 9v4" />
				<path d="M12 17h.01" />
			</svg>
			<span class="tabular-nums">{warnings.length}</span>
		</a>
	{/if}
</div>
