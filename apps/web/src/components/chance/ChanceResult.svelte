<script lang="ts">
import type { FuturesView } from "../../lib/view/chance/futures"
import type { ChanceView } from "../../lib/view/chance/page"
import ChanceSource from "../assumptions/ChanceSource.svelte"
import Fact from "../projection/Fact.svelte"
import Provenance from "../ui/Provenance.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import ChanceFan from "./ChanceFan.svelte"
import ChanceFigures from "./ChanceFigures.svelte"
import FuturesSection from "./FuturesSection.svelte"
import RunsOutBars from "./RunsOutBars.svelte"

interface Props {
	/** The chance of one Scenario, as the page shows it. */
	view: ChanceView
	/** The argv of the read the figures come from. */
	argv: readonly string[]
	/** The plan the chance is of, and its futures when the read lists them (web ADR 0020). */
	plan: string
	futures: FuturesView | null
}

let { view, argv, plan, futures }: Props = $props()
</script>

<div class="space-y-8">
	<section aria-labelledby="chance-share" class="space-y-3">
		<h2 id="chance-share" class="sr-only">The success share</h2>
		<p class="text-5xl font-semibold tracking-tight tabular-nums">{view.share}</p>
		<p class="text-sm">
			{view.succeeded} of {view.paths} seeded Market paths never run out before {view.horizon}.
		</p>
		<dl class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
			<div>
				<dt class="text-muted-foreground">Paths</dt>
				<dd class="tabular-nums">{view.paths}</dd>
			</div>
		</dl>
	</section>
	<section aria-labelledby="chance-source" class="space-y-2">
		<h2 id="chance-source" class="sr-only">Where the Return model comes from</h2>
		<ChanceSource source={view.source} />
		<p class="text-sm text-muted-foreground">
			Change the returns, the swings, the paths or the seed on <SiteLink href="/settings/assumptions/" class="underline">Assumptions</SiteLink>.
		</p>
	</section>
	<section aria-labelledby="chance-bands" class="space-y-3">
		<h2 id="chance-bands" class="text-base font-semibold">Net worth Bands by year</h2>
		<p class="text-sm text-muted-foreground">
			The shaded areas are the 10th to 90th and the 25th to 75th Percentiles; the line is the 50th.
		</p>
		<ChanceFan label="Net worth Bands by year, from the 10th to the 90th Percentile" series={view.series} />
	</section>
	<section aria-labelledby="chance-runs-out" class="space-y-3">
		<h2 id="chance-runs-out" class="text-base font-semibold">When the failing paths run out</h2>
		<RunsOutBars bars={view.runsOut} label="Failing Market paths by the year they run out" />
	</section>
	<ChanceFigures bandRows={view.bandRows} runsOut={view.runsOut} currency={view.currency} />
	<FuturesSection {futures} {plan} currency={view.currency} />
	{#if view.notes.length > 0}
		<ul class="list-disc space-y-1 pl-5 text-sm">
			{#each view.notes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	{/if}
	<Provenance name={`Chance of success for ${plan}`} commands={[argv]}>
		{#snippet details()}
			<dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
				<Fact label="Seed"><code class="font-mono">{view.definition.seed}</code></Fact>
				<Fact label="Return model">
					<code class="font-mono break-all">{view.definition.modelId}</code>
				</Fact>
			</dl>
		{/snippet}
	</Provenance>
</div>
