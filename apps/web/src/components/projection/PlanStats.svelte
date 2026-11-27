<script lang="ts">
import type { PlanStats } from "../../lib/view/projection/plan"
import Money from "../ui/Money.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import Stat from "../ui/Stat.svelte"

interface Props {
	/** The figures the Plan opens with. A figure the Snapshot does not state is left out. */
	stats: PlanStats
}

/** The Plan's three headline figures, each a link to the page that explains it. */
let { stats }: Props = $props()
const link =
	"block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
</script>

<div class="grid gap-6 sm:grid-cols-3">
	{#if stats.stopWorking}
		{@const stop = stats.stopWorking}
		<SiteLink href="/fi/" class={link}>
			<Stat label="Stop working" secondary={stop.date}>
				{#snippet value()}{stop.month}{/snippet}
			</Stat>
		</SiteLink>
	{/if}
	{#if stats.closing}
		{@const closing = stats.closing}
		<SiteLink href="/projection/years/" class={link}>
			<Stat label={`At the end, ${closing.year}`} secondary="Future money">
				{#snippet value()}<Money amount={closing.amount} compact />{/snippet}
			</Stat>
		</SiteLink>
	{/if}
	{#if stats.chance}
		<SiteLink href="/chance/" class={link}>
			<Stat label="Chance of success">
				{#snippet value()}{stats.chance}{/snippet}
			</Stat>
		</SiteLink>
	{/if}
</div>
