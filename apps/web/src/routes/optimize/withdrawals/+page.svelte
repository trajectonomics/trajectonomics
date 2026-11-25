<script lang="ts">
import { queryParam, setQueryParam } from "../../../client/query-param.svelte.js"
import WithdrawalsPage from "../../../components/pages/WithdrawalsPage.svelte"
</script>

<svelte:head>
	<title>Withdrawals · Dashboard</title>
</svelte:head>

<WithdrawalsPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
