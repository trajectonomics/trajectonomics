// Optimistic home and summary updates while a swipe-delete waits for Undo.
// Amounts stay in integer satang.

import type { ComparePayload, HomePayload, RecordItem, SummaryPayload } from "./types";

export function omitRecord(home: HomePayload, recordId: string): HomePayload {
  let removed: RecordItem | null = null;
  const dayGroups = home.dayGroups
    .map((group) => {
      const records = group.records.filter((record) => {
        if (record.id === recordId) {
          removed = record;
          return false;
        }
        return true;
      });
      if (records.length === group.records.length) return group;
      return {
        ...group,
        records,
        spendingSatang: sumKind(records, "spending"),
        incomeSatang: sumKind(records, "income"),
        transferCount: records.filter((record) => record.kind === "transfer").length,
      };
    })
    .filter((group) => group.records.length > 0);

  if (!removed) return home;
  const record = removed as RecordItem;
  const spending =
    home.totalSpendingSatang - (record.kind === "spending" ? record.amountSatang : 0);
  const income = home.totalIncomeSatang - (record.kind === "income" ? record.amountSatang : 0);
  const transfer =
    home.totalTransferSatang - (record.kind === "transfer" ? record.amountSatang : 0);

  return {
    ...home,
    dayGroups,
    totalSpendingSatang: spending,
    totalIncomeSatang: income,
    totalTransferSatang: transfer,
    remainingSatang: income - spending,
    needsReviewCount: Math.max(
      0,
      home.needsReviewCount - (record.parseStatus !== "ok" ? 1 : 0)
    ),
  };
}

export function omitFromSummary(
  summary: SummaryPayload,
  record: RecordItem,
  summaryKind: RecordItem["kind"]
): SummaryPayload {
  const income = summary.incomeSatang - (record.kind === "income" ? record.amountSatang : 0);
  const spending = summary.spendingSatang - (record.kind === "spending" ? record.amountSatang : 0);
  const transfer = summary.transferSatang - (record.kind === "transfer" ? record.amountSatang : 0);
  const sameKind = record.kind === summaryKind;
  const denom = summaryKind === "income" ? income : summaryKind === "transfer" ? transfer : spending;

  const byCategory = !sameKind
      ? summary.byCategory
      : summary.byCategory
          .map((row) => {
            if ((row.categoryId ?? null) !== (record.categoryId ?? null)) return row;
            return {
              ...row,
              amountSatang: row.amountSatang - record.amountSatang,
              count: Math.max(0, row.count - 1),
            };
          })
          .filter((row) => row.amountSatang > 0 && row.count > 0)
          .map((row) => ({
            ...row,
            percentage: percent(row.amountSatang, denom),
          }));

  const tagIds = new Set(record.tagIds);
  const byTag = !sameKind
      ? summary.byTag
      : summary.byTag
          .map((row) => {
            if (!tagIds.has(row.tagId)) return row;
            return {
              ...row,
              amountSatang: row.amountSatang - record.amountSatang,
              count: Math.max(0, row.count - 1),
            };
          })
          .filter((row) => row.amountSatang > 0 && row.count > 0)
          .map((row) => ({
            ...row,
            percentage: percent(row.amountSatang, denom),
          }));

  return {
    ...summary,
    incomeSatang: income,
    spendingSatang: spending,
    transferSatang: transfer,
    remainingSatang: income - spending,
    byCategory,
    byTag,
  };
}

export function omitFromCompare(compare: ComparePayload, amountSatang: number): ComparePayload {
  const bars = compare.bars.map((bar) =>
    bar.isCurrent
      ? { ...bar, amountSatang: Math.max(0, bar.amountSatang - amountSatang) }
      : bar
  );
  const current = bars.find((bar) => bar.isCurrent)?.amountSatang ?? compare.currentSatang;
  return {
    ...compare,
    bars,
    currentSatang: current,
    deltaVsAverageSatang: current - compare.averageSatang,
  };
}

function sumKind(records: RecordItem[], kind: RecordItem["kind"]): number {
  return records.filter((record) => record.kind === kind).reduce((sum, record) => sum + record.amountSatang, 0);
}

function percent(amount: number, denom: number): number {
  if (denom <= 0) return 0;
  return Math.round((amount / denom) * 1000) / 10;
}
