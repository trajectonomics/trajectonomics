<script lang="ts">
import { householdHref } from "../../lib/view/household/model"
import Field from "./Field.svelte"

interface Props {
	id: string
	label: string
	value?: string
	problem?: string | undefined
	/** The household's label of this date when it pins it ("at me, age 60"), or null. */
	anchor: string | null
	/** The plan's name, which the household link names. */
	plan: string
}

let { id, label, value = $bindable(""), problem, anchor, plan }: Props = $props()
</script>

<!-- A date: typed as YYYY-MM-DD, or read-only with the household's label when the household pins it. -->
<Field {id} {label} hint="YYYY-MM-DD" bind:value {problem} disabled={anchor !== null} />
{#if anchor !== null}
	<p class="-mt-3 text-sm text-muted-foreground">Set by the household {anchor}: <a class="underline" href={householdHref(plan, "")}>change it there</a>.</p>
{/if}
