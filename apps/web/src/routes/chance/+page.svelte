<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import ChancePage from "../../components/pages/ChancePage.svelte"
</script>

<ChancePage
	scenario={queryParam("scenario", "")}
	onScenario={selectPlan}
/>
