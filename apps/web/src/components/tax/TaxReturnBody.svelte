<script lang="ts">
import type { TaxBody } from "../../lib/view/tax"
import TaxBracketChart from "./TaxBracketChart.svelte"
import TaxChart from "./TaxChart.svelte"
import TaxCurrent from "./TaxCurrent.svelte"
import TaxRateTable from "./TaxRateTable.svelte"
import TaxTable from "./TaxTable.svelte"

type Levies = Extract<TaxBody, { kind: "levies" }>

interface Props {
	/** One Return's tax years as the body view model states them, or the plan's one body when it does not file separately. */
	body: Levies
	currency: string
}

let { body, currency }: Props = $props()
</script>

<!-- One Return: its headline, its walk, its years and rates. The page places no figure; each is the CLI's. -->
<div class="space-y-8">
	{#if body.current}<TaxCurrent year={body.current} {currency} />{/if}
	<TaxTable rows={body.rows} {currency} />
	{#if body.chart}
		<TaxChart series={body.chart} />
	{/if}
	{#if body.brackets}<TaxBracketChart chart={body.brackets} />{/if}
	{#if body.rates.length > 0}<TaxRateTable rows={body.rates} {currency} />{/if}
</div>
