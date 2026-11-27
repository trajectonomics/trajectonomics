<script lang="ts">
import type { HealthWarning } from "../../lib/view/health/warning"
import type { FocusButton } from "../../lib/view/overview/focus"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	button: FocusButton
	/** The health checks that failed, when the ledger has any. */
	warning: HealthWarning | null
}

/** The focus point's one primary action, and beside it the count of health checks worth checking. */
let { button, warning }: Props = $props()
const PRIMARY =
	"inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const CHIP =
	"inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:text-foreground"
</script>

<!-- The warning triangle is Lucide's triangle-alert (ISC), drawn here as SVG elements. -->
<div class="flex flex-wrap items-center gap-3">
	{#if button.external}
		<a data-primary-action href={button.href} class={PRIMARY}>{button.label}</a>
	{:else}
		<SiteLink data-primary-action href={button.href} class={PRIMARY}>{button.label}</SiteLink>
	{/if}
	{#if warning}
		<SiteLink href="/health/" aria-label={warning.label} class={CHIP}>
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
			<span class="tabular-nums">{warning.count}</span>
		</SiteLink>
	{/if}
</div>
