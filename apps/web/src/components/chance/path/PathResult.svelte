<script lang="ts">
import { currentItemNames } from "../../../client/item-names.svelte.js"
import type { ProjectionChance, ProjectionPath } from "../../../lib/contract"
import { pathHeaderOf, pathRowsOf, returnAccounts } from "../../../lib/view/chance/path-view"
import { parseTerms } from "../../../lib/view/projection/terms"
import Provenance from "../../ui/Provenance.svelte"
import PathChart from "./PathChart.svelte"
import PathHeader from "./PathHeader.svelte"
import PathTable from "./PathTable.svelte"

interface Props {
	path: ProjectionPath
	chance: ProjectionChance
	plan: string
	/** The name of each Account by its id, from the accounts Read. */
	names: ReadonlyMap<string, string>
	terms: string
	onTerms: (value: string) => void
	/** The argv of the read of the path, shown as the figures' provenance. */
	argv: readonly string[]
}

/** One future: its header, its net worth by year, and each year's returns, income, spending and net worth. */
let { path, chance, plan, names, terms, onTerms, argv }: Props = $props()
const header = $derived(pathHeaderOf(path, chance))
const rows = $derived(pathRowsOf(path, header.lowest?.day ?? null, currentItemNames()))
const accounts = $derived(returnAccounts(path).map((id) => names.get(id) ?? id))
</script>

<div class="space-y-6">
	<PathHeader {header} {plan} />
	<PathChart {path} {terms} {onTerms} />
	<section aria-labelledby="path-table" class="space-y-2">
		<h3 id="path-table" class="text-base font-semibold">Year by year</h3>
		<p class="text-sm text-muted-foreground">
			Each return is the market's growth of that Account from the first day of the year through its last, so it covers one day
			more than the closing net worth, and it is free of what was paid in or taken out.
		</p>
		<PathTable {rows} {accounts} terms={parseTerms(terms)} currency={path.currency} />
	</section>
	<Provenance {argv} />
</div>
