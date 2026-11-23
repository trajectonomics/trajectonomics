<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import ChancePage from "../../components/pages/ChancePage.svelte"
</script>

<svelte:head>
	<title>Chance of success · Dashboard</title>
</svelte:head>

<ChancePage
	scenario={queryParam("scenario", "")}
	onScenario={selectPlan}
/>
