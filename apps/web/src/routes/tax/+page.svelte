<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import TaxPage from "../../components/pages/TaxPage.svelte"
</script>

<svelte:head>
	<title>Tax · Dashboard</title>
</svelte:head>

<TaxPage scenario={queryParam("scenario", "")} onScenario={selectPlan} />
