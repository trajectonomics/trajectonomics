<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the components it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { planLogo } from "../lib/plan-logos"

let { plan, name, size = 28 }: { plan: string; name: string; size?: number } = $props()

const logo = $derived(planLogo(plan))
const initial = $derived(name.slice(0, 1).toUpperCase())
const box = $derived(`--plan-mark-size: ${size}px`)
</script>

{#if logo !== null}
	<span class="plan-mark" style={box}>
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
			<path d={logo.path} />
		</svg>
	</span>
{:else}
	<span class="plan-mark plan-mark-initial" style={box} aria-hidden="true">{initial}</span>
{/if}
