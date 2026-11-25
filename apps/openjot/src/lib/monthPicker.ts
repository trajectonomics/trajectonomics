/**
 * Month offsets shown in the "Go to month" sheet, newest first, with this
 * month (offset 0) in date order between next month and last month.
 */
export function monthPickerOffsets(future = 1, past = 12): number[] {
  const offsets: number[] = [];
  for (let i = future; i >= -past; i--) offsets.push(i);
  return offsets;
}
