<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import CashFlowPage from "../../components/pages/CashFlowPage.svelte"
</script>

<svelte:head>
	<title>Cash flow · Dashboard</title>
</svelte:head>

<CashFlowPage
	scenario={queryParam("scenario", "")}
	year={queryParam("year", "")}
	onYear={(value) => setQueryParam("year", value)}
/>
