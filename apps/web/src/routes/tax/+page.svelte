<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import TaxPage from "../../components/pages/TaxPage.svelte"
</script>

<TaxPage
	scenario={queryParam("scenario", "")}
	onScenario={selectPlan}
	returned={queryParam("return", "")}
	onReturn={(value) => setQueryParam("return", value)}
/>
