#!/usr/bin/env bash
# Prints the demo Scenario for the ledger that TRAJ_HOME holds. A Scenario names
# each Baseline account by its ledger id, and those ids are generated per ledger,
# so the document is built from `traj account list` rather than written by hand.
# Rates and inflation are basis points; money is satang (1 THB = 100).
set -euo pipefail

id_of() {
  traj account list --json | jq -r --arg name "$1" '.accounts[] | select(.name == $name) | .id'
}

savings=$(id_of Savings)
index=$(id_of "Index fund")
loan=$(id_of "Car loan")

jq -n --arg savings "$savings" --arg index "$index" --arg loan "$loan" '{
  schemaVersion: 4,
  currency: "THB",
  economy: { inflation: 200 },
  accounts: [
    { id: $savings, kind: "asset", rate: 200 },
    { id: $index, kind: "asset", rate: 500 },
    { id: $loan, kind: "liability", rate: 0 }
  ],
  flows: [
    { id: "salary", kind: "income", earned: true, amount: 9000000, frequency: "monthly", start: "2026-01-01", growth: "inflation" },
    { id: "living", kind: "expense", amount: 4000000, frequency: "monthly", start: "2026-01-01", growth: "inflation" }
  ],
  cashflow: {
    surplus: [ { account: $index } ],
    contribute: [],
    withdraw: [ $savings, $index ]
  }
}'
