# Percentage Deductions and Donation Caps Floor to the Satang

Owner ruling 2026-11-22 (trajectonomics/trajectonomics#52): percentage expense deductions and donation caps floor to the satang, not the whole baht, so more income never lowers tax.

Before this ruling, the Section 40 standard deductions, the entertainer tiers and the Section 47(7) donation caps floored `amount × rate` to a whole baht with `floorByRate`. A whole-baht floor can add a full baht to a deduction for a few satang of extra income, so a raise of under 3 baht could lower total tax by a few satang. `floorByRateToSatang` floors to the satang instead, using exact BigInt arithmetic on the amount's written decimal value and the rate's exact fraction. The levy graph (`src/th/levy/graph-rates.ts`) mirrors it with one scale-and-floor on integer satang measures, so the golden corpus still matches `calculateThTax` to the satang. Stage units stay THB major units.
