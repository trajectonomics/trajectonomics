<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { CollectorsState } from "../client/collectors.svelte"
import { collectorsGeometry, exactMinute } from "../lib/collectors"
import { SIGN_IN_PATH, SIGN_OUT_PATH } from "../lib/site"
import CollectorsChart from "./CollectorsChart.svelte"

const state = new CollectorsState()

$effect(() => {
	void state.load(window.location.search)
})

const geometry = $derived(
	state.status === "ready" ? collectorsGeometry(state.collectors, state.nowMs) : null,
)
</script>

{#snippet signOut()}
	<form class="collectors-signout" method="post" action={SIGN_OUT_PATH}>
		<button class="collectors-secondary" type="submit">Sign out</button>
	</form>
{/snippet}

<section class="overview collectors-page" aria-labelledby="collectors-title">
	<header class="masthead masthead-lite">
		<h1 id="collectors-title" class="masthead-title">Your collectors</h1>
	</header>

	{#if state.status === "loading"}
		<!-- The title alone is the whole loading state. -->
	{:else if state.status === "signed_out"}
		{#if state.signInFailed}
			<p class="collectors-note">Sign-in did not finish. Try again.</p>
		{/if}
		<a class="collectors-action" href={SIGN_IN_PATH}>Sign in</a>
	{:else if state.status === "error"}
		<p class="collectors-note">Could not load your collectors.</p>
		<button
			class="collectors-secondary"
			type="button"
			onclick={() => void state.load(window.location.search)}>Retry</button
		>
	{:else if state.collectors.length === 0}
		<p class="collectors-empty">
			No collector has sent from this account yet. Run the collector's <code>login</code> on
			each machine.
		</p>
		{@render signOut()}
	{:else if geometry !== null}
		<CollectorsChart {geometry} />

		<details class="collectors-details">
			<summary>Details</summary>
			<div class="table-frame">
				<div class="table-scroll">
					<table class="usage-table collectors-table">
						<thead>
							<tr>
								<th scope="col">Machine</th>
								<th scope="col">First day</th>
								<th scope="col">Last day</th>
								<th scope="col" class="number">Rows</th>
								<th scope="col">Last send</th>
							</tr>
						</thead>
						<tbody>
							{#each state.collectors as collector (collector.machine)}
								<tr>
									<th scope="row">{collector.machine}</th>
									<td>{collector.firstDay}</td>
									<td>{collector.lastDay}</td>
									<td class="number">{collector.rows.toLocaleString("en-US")}</td>
									<td>{exactMinute(collector.lastSendAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</details>

		{@render signOut()}
	{/if}
</section>
