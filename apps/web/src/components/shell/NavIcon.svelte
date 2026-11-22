<script lang="ts">
import type { IconName } from "../../lib/view/routes"
import { ICON_NODES } from "./nav-icons"

interface Props {
	/** The icon's Lucide name, such as "house". */
	name: IconName
}

let { name }: Props = $props()
const elements = $derived(ICON_NODES[name])
</script>

<!-- An icon beside a label. It is decoration, so the reader does not hear it. -->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	class="size-4.5 shrink-0"
>
	{#each elements as [tag, attrs]}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
