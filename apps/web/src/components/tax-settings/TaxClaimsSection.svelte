<script lang="ts">
import { type PersonNames, personText } from "../../lib/view/item-names"
import type { ClaimsTable } from "../../lib/view/tax-settings/claims"

interface Props {
	table: ClaimsTable
	/** The household's people, so a column is named by role ("You", "Your partner"), never by id. */
	people: PersonNames
}

let { table, people }: Props = $props()
const columns = $derived(table.people.map((person) => personText(people, person)))
</script>

<!-- One column per Return of a separate filing: the amount that Return's profile claims, so a person sees at a glance. -->
<section aria-labelledby="tax-claims-title" class="space-y-3">
	<h3 id="tax-claims-title" class="text-sm font-semibold">Who claims each allowance</h3>
	<p class="text-sm text-muted-foreground">
		This plan files separately, so each person's Return claims its own allowances. The figures are the claims your profile stores; the tax rules apply them.
	</p>
	<div class="relative max-w-full overflow-x-auto rounded-lg border border-border">
		<table class="w-full min-w-max border-collapse text-sm">
			<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">Allowances by Return</caption>
			<thead>
				<tr class="border-b border-border">
					<th scope="col" class="px-3 py-2 text-left font-medium text-muted-foreground">Allowance</th>
					{#each columns as column, index (table.people[index])}
						<th scope="col" class="px-3 py-2 text-right font-medium text-muted-foreground">{column}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each table.rows as row (row.key)}
					<tr class="border-b border-border last:border-0">
						<th scope="row" class="px-3 py-2 text-left font-normal text-muted-foreground">{row.label}</th>
						{#each row.cells as cell, index (table.people[index])}
							<td class="px-3 py-2 text-right tabular-nums">{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if table.sharedInterest !== null}
		<p class="text-sm text-foreground">
			Shared home-loan interest, split half to each Return: <span class="tabular-nums">{table.sharedInterest}</span>
		</p>
	{/if}
</section>
