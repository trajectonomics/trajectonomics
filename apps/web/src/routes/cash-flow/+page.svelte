<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import CashFlowPage from "../../components/pages/CashFlowPage.svelte"
</script>

<CashFlowPage
	scenario={queryParam("scenario", "")}
	year={queryParam("year", "")}
	onYear={(value) => setQueryParam("year", value)}
/>
