<script lang="ts">
interface Props {
	/** The Scenario the household belongs to. */
	name: string
	/** Whether the plan holds a household. */
	set: boolean
	/** Whether the household holds anyone, so a date can be pinned to a person. */
	hasPeople: boolean
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	/** Whether an Edit runs, which holds the buttons. */
	busy: boolean
	onPerson: () => void
	onAnchor: () => void
}

let { name, set, hasPeople, editable, busy, onPerson, onAnchor }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div>
		<h2 class="font-semibold">Household</h2>
		<p class="text-sm text-muted-foreground">
			The people whose ages pin the dates of plan {name}. Ages appear on the rows once they are set.
		</p>
	</div>
	{#if editable}
		<div class="flex flex-wrap gap-2">
			<button type="button" disabled={busy} onclick={onPerson} class={button}>
				{set ? "Add a person" : "Set up the household"}
			</button>
			{#if set && hasPeople}
				<button type="button" disabled={busy} onclick={onAnchor} class={button}>Pin a date</button>
			{/if}
		</div>
	{/if}
</div>
