<script lang="ts">
import type { PlanRow } from "../../lib/view/plans/rows"
import NavIcon from "../shell/NavIcon.svelte"
import Badge from "../ui/Badge.svelte"

interface Props {
	row: PlanRow
}

let { row }: Props = $props()
</script>

<!-- The marks of a plan beside its name: the Main tag, and a notes icon when it has notes. -->
{#if row.main}<Badge tone="accent">Main</Badge>{/if}
{#if row.hasNotes}
	<span title="Has notes" class="inline-flex text-muted-foreground">
		<NavIcon name="file-text" />
		<span class="sr-only">Has notes</span>
	</span>
{/if}
