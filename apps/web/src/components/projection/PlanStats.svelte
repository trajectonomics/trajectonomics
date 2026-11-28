<script lang="ts">
import type { PlanStats } from "../../lib/view/projection/plan"
import Money from "../ui/Money.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import Stat from "../ui/Stat.svelte"

interface Props {
	/** The figures the Plan opens with. A figure the Snapshot does not state is left out. */
	stats: PlanStats
}

/** The Plan's three headline figures, one row at every width, each a link to the page that explains it. */
let { stats }: Props = $props()
const link =
	"block min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const figure = "text-lg sm:text-2xl"
const warning = "text-lg sm:text-2xl text-accent"
</script>

<div class="grid grid-cols-3 gap-3 sm:gap-6">
	{#if stats.runsOut}
		{@const out = stats.runsOut}
		<Stat label="Money runs out" valueClassName={warning}>
			{#snippet value()}{out.month}{/snippet}
		</Stat>
	{:else if stats.stopWorking}
		{@const stop = stats.stopWorking}
		<SiteLink href="/fi/" class={link}>
			<Stat
				label="Stop working"
				secondary={stop.date}
				valueClassName={figure}
				secondaryClassName="hidden sm:block"
			>
				{#snippet value()}{stop.month}{/snippet}
			</Stat>
		</SiteLink>
	{/if}
	{#if stats.closing}
		{@const closing = stats.closing}
		<SiteLink href="/projection/years/" class={link}>
			<Stat label={`At the end, ${closing.year}`} secondary="Future money" valueClassName={figure}>
				{#snippet value()}<Money amount={closing.amount} compact />{/snippet}
			</Stat>
		</SiteLink>
	{/if}
	{#if stats.chance}
		<SiteLink href="/chance/" class={link}>
			<Stat label="Chance of success" valueClassName={figure}>
				{#snippet value()}{stats.chance}{/snippet}
			</Stat>
		</SiteLink>
	{/if}
</div>
