<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { catalogSources } from "../lib/plan-catalog"

const sources = catalogSources()

/** Opens the panel just under its icon, kept inside the viewport, instead of the page's centre. */
function place(event: ToggleEvent): void {
	if (event.newState !== "open") return
	const panel = event.currentTarget as HTMLElement
	const icon = document.querySelector(`[popovertarget="${panel.id}"]`)
	if (icon === null) return
	const rect = icon.getBoundingClientRect()
	const gutter = 16
	const left = Math.min(Math.max(rect.left, gutter), window.innerWidth - panel.offsetWidth - gutter)
	panel.style.inset = "auto"
	const below = rect.bottom + 8
	const fits = below + panel.offsetHeight <= window.innerHeight - gutter
	const top = fits ? below : Math.max(gutter, rect.top - 8 - panel.offsetHeight)
	panel.style.top = `${top}px`
	panel.style.left = `${Math.max(left, gutter)}px`
	panel.style.margin = "0"
}
</script>

<div id="peaks-info-panel" class="peaks-info-panel" popover ontoggle={place}>
	<p>
		≥ the most tokens we used in any 5 hours, 7 days or 30 days on that tier. The plan gives at
		least this much.
	</p>
	<p>
		Highlighted: estimated from a tier we measured × the vendor's stated multiplier. 30 days follow
		the weekly multiplier.
	</p>
	<p>– means the vendor states no multiplier for that window.</p>
	<ul class="peaks-info-sources">
		{#each sources as source (source.url)}
			<li><a href={source.url}>{source.label}</a>, read {source.read}</li>
		{/each}
	</ul>
</div>
