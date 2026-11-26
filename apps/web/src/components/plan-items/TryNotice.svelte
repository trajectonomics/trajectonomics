<script lang="ts">
interface Props {
	/** The fields the form cleared: a what-if cannot try them. */
	fields: readonly string[]
	/** Whether the what-if holds other changes beside this cleared field; false when the save left the Flow as it was. */
	others?: boolean
}

let { fields, others = true }: Props = $props()
/** The label a loan's Try returns when the money's withdrawal would be added or taken out. */
const MONEY = "the money"
const cleared = $derived(fields.filter((field) => field !== MONEY))
</script>

<!-- traj replaces a path in a what-if and cannot delete one, so a cleared field is not tried; the Edit that saves the plan clears it. -->
{#if cleared.length > 0}
	<p role="alert" class="text-sm text-destructive">
		A what-if cannot clear {cleared.join(", ")}: traj replaces a value and cannot delete one.
		{#if others}The other changes are in the what-if.{/if}
		To clear it, close this and use Edit, which changes the plan itself.
	</p>
{/if}
{#if fields.includes(MONEY)}
	<p role="alert" class="text-sm text-destructive">
		A what-if cannot add or take out the withdrawal that borrows the money. The other changes are in the
		what-if. To change when the money arrives, close this and use Edit, which changes the plan itself.
	</p>
{/if}
