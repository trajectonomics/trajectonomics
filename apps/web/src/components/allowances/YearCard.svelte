<script lang="ts">
import type { ScenarioDocument } from "../../lib/contract"
import type { YearView } from "../../lib/view/allowances"
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import Money from "../ui/Money.svelte"
import Stat from "../ui/Stat.svelte"
import LineList from "./LineList.svelte"
import YearActions from "./YearActions.svelte"

interface Props {
	year: YearView
	currency: string
	/** The plan the Edit controls write to; null when the page cannot edit. */
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
	/** The household's people, so a joint Return names each spouse's allowances. */
	people?: PersonNames
}

let { year, currency, plan, people = NO_PEOPLE }: Props = $props()
</script>

<!-- The tax year the As-of falls in: the tax due now, the tax due with every suggestion, and the saving. -->
<section aria-label="This tax year" class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
	<header>
		<h2 class="text-base font-semibold">This tax year</h2>
		<p class="text-sm text-muted-foreground">{year.levy}, {year.period}, settles {year.settles}</p>
	</header>
	<div class="grid gap-4 sm:grid-cols-3">
		<Stat label="Tax due now">{#snippet value()}<Money amount={year.dueBefore} {currency} />{/snippet}</Stat>
		<Stat label="Tax due with every suggestion">{#snippet value()}<Money amount={year.dueAfter} {currency} />{/snippet}</Stat>
		<Stat label="Tax saved">{#snippet value()}<Money amount={year.saving} {currency} />{/snippet}</Stat>
	</div>
	<LineList lines={year.lines} {currency} {people} />
	{#if plan !== null}<YearActions {year} {plan} />{/if}
</section>
