<script lang="ts">
import type { AccountList, Balance, Read } from "../../lib/contract"
import { accountGroups } from "../../lib/view/ledger/account-tree"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import AccountTable from "./AccountTable.svelte"
import ReportSection from "./ReportSection.svelte"

interface Props {
	accounts: Read<AccountList>
	balance: Read<Balance>
}

let { accounts, balance }: Props = $props()

// A failed balance Read leaves the tree without amounts.
const rows = $derived(balance.ok ? balance.data.rows : [])
const groups = $derived(accounts.ok ? accountGroups(accounts.data.accounts, rows) : [])
</script>

<!-- The chart of accounts with each leaf's balance. A failed balance Read leaves the tree without amounts. -->
<ReportSection
	id="accounts"
	title="Accounts and balances"
	intro="Assets and expenses are positive; liabilities, equity and income are negative. These are the signs the ledger holds, shown as the CLI prints them. A header account takes no amount of its own."
>
	{#if !balance.ok}
		<ReadView read={balance} label="Balances">
			{#snippet children()}{/snippet}
		</ReadView>
	{/if}
	<ReadView read={accounts} label="The chart of accounts">
		{#snippet children()}
			<div class="space-y-6">
				{#if groups.length === 0}
					<p class="text-sm text-muted-foreground">The ledger has no accounts yet.</p>
				{:else}
					{#each groups as group (group.type)}
						<AccountTable {group} />
					{/each}
				{/if}
				<Provenance
					name="Accounts and balances"
					commands={balance.ok ? [accounts.argv, balance.argv] : [accounts.argv]}
				/>
			</div>
		{/snippet}
	</ReadView>
</ReportSection>
