<script lang="ts">
import { queryParam, setQueryParam } from "../../../client/query-param.svelte.js"
import WithdrawalsPage from "../../../components/pages/WithdrawalsPage.svelte"
</script>

<WithdrawalsPage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
/>
