<script lang="ts">
interface Props {
	/** A label and the value it names. Each value is a string the CLI or the view model states. */
	facts: readonly { readonly label: string; readonly value: string }[]
}

let { facts }: Props = $props()
</script>

<!-- Labels and values in two columns on a wide screen, one under another on a phone. -->
<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-y-2">
	{#each facts as fact (fact.label)}
		<div class="contents">
			<dt class="text-muted-foreground">{fact.label}</dt>
			<dd class="break-all tabular-nums">{fact.value}</dd>
		</div>
	{/each}
</dl>
