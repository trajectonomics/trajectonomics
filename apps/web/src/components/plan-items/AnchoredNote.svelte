<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { householdHref } from "../../lib/view/household/model"

interface Props {
	/** The household's label of the date ("at me, age 60"). */
	anchor: string
	/** The plan's name, which the household link names. */
	plan: string
}

let { anchor, plan }: Props = $props()
</script>

<!-- The link keeps the address's other parameters (the terms, the Demo), so it lands on the same view of the plan. -->
<p class="-mt-3 text-sm text-muted-foreground">Set by the household {anchor}: <a class="underline" href={householdHref(plan, currentSearch())}>change it there</a>.</p>
