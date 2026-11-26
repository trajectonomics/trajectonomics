<script lang="ts">
import type { PersonNames } from "../../lib/view/item-names"
import type { ClaimsTable } from "../../lib/view/tax-settings/claims"
import { returnLabel } from "../../lib/view/tax-settings/return-name"
import ItemWords from "../ui/ItemWords.svelte"
import MaskedAmount from "../ui/MaskedAmount.svelte"

interface Props {
	table: ClaimsTable
	/** The household's people, so a column is named by role ("You", "Your partner"), never by id. */
	people: PersonNames
	/** The recorded `claimsHolder` id, the column named "The earlier holder" when the household no longer names it. */
	claimsHolder?: string | null
}

let { table, people, claimsHolder = null }: Props = $props()
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
					{#each table.people as person (person)}
						<th scope="col" class="px-3 py-2 text-right font-medium text-muted-foreground"><ItemWords label={returnLabel(person, people, claimsHolder, table.people)} /></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each table.rows as row (row.key)}
					<tr class="border-b border-border last:border-0">
						<th scope="row" class="px-3 py-2 text-left font-normal text-muted-foreground">{row.label}</th>
						{#each row.cells as cell, index (table.people[index])}
							<td class="px-3 py-2 text-right tabular-nums">{#if cell.amount}<MaskedAmount digits={cell.amount.digits} after={cell.amount.after} />{:else}{cell.value}{/if}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if table.sharedInterest !== null}
		<p class="text-sm text-foreground">
			Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all: <span class="tabular-nums">{#if table.sharedInterest.amount}<MaskedAmount digits={table.sharedInterest.amount.digits} after={table.sharedInterest.amount.after} />{:else}{table.sharedInterest.value}{/if}</span>
		</p>
	{/if}
</section>
