<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import { type PersonNames, personText } from "../../lib/view/item-names"
import {
	addLevyCommand,
	assumptionLines,
	carryInRows,
	returnOf,
	returnsOf,
	taxBody,
	taxBodyOf,
	taxStatusWords,
} from "../../lib/view/tax"
import Badge from "../ui/Badge.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import CarryInTable from "./CarryInTable.svelte"
import TaxReturnBody from "./TaxReturnBody.svelte"

interface Props {
	name: string
	run: ProjectionRun
	/** The household's people, so a Return is named by the role the CLI states ("You", "Your partner"), never by id. */
	people: PersonNames
}

let { name, run, people }: Props = $props()
/** The Filer the person chose; empty opens on the first Return, the holder's (cli ADR-0075). */
let chosen = $state("")
const body = $derived(taxBody(run))
const returns = $derived(returnsOf(run.taxYears))
/** Two or more Filers mean the plan files separately: one Return each, and a switch between them. */
const separate = $derived(returns.length > 1)
const picked = $derived(separate ? returnOf(returns, chosen) : null)
const shown = $derived(picked === null ? body : taxBodyOf(picked.years, run.tax, run.asOf))
const options = $derived(
	returns.map((one) => ({ value: one.filer, label: personText(people, one.filer) })),
)
const years = $derived(picked?.years ?? run.taxYears)
/** The Carry-in records of the Return on screen, and every record of a plan with one Return. */
const carry = $derived(
	carryInRows(run.carryIn ?? []).filter(
		(row) => !separate || years.some((year) => year.levy === row.levy),
	),
)
const assumptions = $derived(assumptionLines(years))
</script>

<!-- One plan's projection as the Tax page shows it: one Return at a time when it files separately, else the plan's own. -->
<div class="space-y-8">
	<div class="flex flex-wrap items-center gap-2">
		<Badge>{taxStatusWords(run.tax)}</Badge>
	</div>
	{#if separate}
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">
				This plan files separately, so each person has their own Return. Choose one to read.
			</p>
			<SegmentedControl
				name="return"
				label="Return"
				{options}
				value={picked?.filer ?? ""}
				onChange={(value) => (chosen = value)}
			/>
		</div>
	{/if}
	{#if shown.kind === "no-levy"}
		<EmptyState title="No Levy in this plan">
			<p>Its figures are before tax, because the plan has no Levy. Add Thailand's with:</p>
			<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{addLevyCommand(name)}</code></pre>
		</EmptyState>
	{:else}
		<TaxReturnBody body={shown} currency={run.currency} />
	{/if}
	{#if carry.length > 0}
		<CarryInTable rows={carry} currency={run.currency} />
	{/if}
	{#if assumptions.length > 0}
		<section class="space-y-2">
			<h3 class="text-sm font-medium">Assumptions</h3>
			<p class="text-sm text-muted-foreground">Tax figures used whose source is not yet confirmed.</p>
			<ul class="list-disc space-y-1 pl-5 text-sm">
				{#each assumptions as line (line.key)}
					<li><code class="font-mono text-xs">{line.path}</code>: <span data-cli>{line.text}</span></li>
				{/each}
			</ul>
		</section>
	{/if}
	{#if run.notes.length > 0}
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			{#each run.notes as note, index (index)}
				<li data-cli>{note}</li>
			{/each}
		</ul>
	{/if}
</div>
