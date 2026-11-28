<script lang="ts">
interface Props {
	topRate: string | null
	shareOfIncome: string | null
}

let { topRate, shareOfIncome }: Props = $props()
</script>

<!-- The two rates, each with the sentence that says what it is. -->
<dl class="grid gap-4 sm:grid-cols-2">
	{#if topRate !== null}
		<div class="rounded-lg border border-border p-4">
			<dt class="text-sm text-muted-foreground">Top rate</dt>
			<dd class="mt-1 text-lg font-semibold tabular-nums">{topRate}</dd>
			<dd class="mt-1 text-sm text-muted-foreground">
				The rate on the last baht of your taxable income: what one more baht of income, or one baht less
				through an allowance, is worth in tax.
			</dd>
		</div>
	{/if}
	{#if shareOfIncome !== null}
		<div class="rounded-lg border border-border p-4">
			<dt class="text-sm text-muted-foreground">Share of income paid in tax</dt>
			<dd class="mt-1 text-lg font-semibold tabular-nums">{shareOfIncome}</dd>
			<dd class="mt-1 text-sm text-muted-foreground">
				The tax due as a share of all your assessable income, before expenses and allowances.
			</dd>
		</div>
	{/if}
</dl>
