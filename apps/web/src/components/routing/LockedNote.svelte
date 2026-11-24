<script lang="ts">
interface Props {
	locked: boolean
}

let { locked }: Props = $props()
</script>

<!-- Saving a change to a list the what-if also changes would put the try in the plan, so the page asks first. -->
{#if locked}
	<p class="text-xs text-muted-foreground">Apply or revert the what-if first to save a change to this list. Trying a value still works.</p>
{/if}
