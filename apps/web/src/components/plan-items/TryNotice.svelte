<script lang="ts">
interface Props {
	/** The fields the form cleared: a what-if cannot try them. */
	fields: readonly string[]
}

let { fields }: Props = $props()
</script>

<!-- traj replaces a path in a what-if and cannot delete one, so a cleared field is not tried; the Edit that saves the plan clears it. -->
{#if fields.length > 0}
	<p role="alert" class="text-sm text-destructive">
		A what-if cannot clear {fields.join(", ")}: traj replaces a value and cannot delete one. The other changes
		are in the what-if. To clear it, close this and use Edit, which changes the plan itself.
	</p>
{/if}
