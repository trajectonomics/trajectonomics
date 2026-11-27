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
		Each figure is the most tokens we used in that window, or an estimate of what 100% would be
		from the plan's own usage meter.
	</p>
	<p>
		A measured figure shows once we have collected for the window's full length; a meter estimate
		can show sooner, with the days seen so far.
	</p>
	<p>Cache reads are counted apart because they cost far less, so they never lift a figure.</p>
	<p>
		Claude's 5 hours start at its first message. Claude and Antigravity months are the week × 30/7,
		once a full week is collected. Other tiers scale by the vendor's stated multiplier; 30 days
		use the weekly one.
	</p>
	<p>
		Highlighted: ≈ estimated from a tier we measured. – means the vendor states no multiplier.
	</p>
	<p>
		≈ at 100%: worked out from the plan's own usage meter, tokens used ÷ points the meter moved ×
		100.
	</p>
	<ul class="peaks-info-sources">
		{#each sources as source (source.url)}
			<li><a href={source.url}>{source.label}</a>, read {source.read}</li>
		{/each}
	</ul>
</div>
