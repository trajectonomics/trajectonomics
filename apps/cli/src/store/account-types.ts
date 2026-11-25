import type { AccountType } from "@trajectonomics/core/ledger"
import type { AccountRow } from "./rows"

export type NewAccount = { name: string; type: AccountType; currency: string; parentId?: string }
export type AccountCreated =
	| { status: "created"; account: AccountRow }
	| { status: "name_taken"; account: AccountRow }
export type AccountClosed =
	| { status: "archived" | "already_archived"; account: AccountRow }
	| { status: "not_found" }
export type AccountDeleted =
	| { status: "deleted" | "has_postings" | "has_children"; account: AccountRow }
	| { status: "not_found" }
