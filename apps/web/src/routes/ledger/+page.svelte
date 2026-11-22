<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import LedgerPage from "../../components/pages/LedgerPage.svelte"

// A route file alone reads the address bar: the account filter is passed down as a prop.
const account = $derived(queryParam("account", ""))
</script>

<svelte:head>
	<title>Ledger · Dashboard</title>
</svelte:head>

<LedgerPage {account} onAccount={(value) => void setQueryParam("account", value)} />
