// The Thai privacy policy and terms must follow the English ones. This does not check the
// wording. It fails when an English document gains, loses or reorders a section, or gets a new
// "Last updated" date, and the Thai file was not updated to match.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const NOTE =
  "ฉบับแปลภาษาไทยนี้จัดทำเพื่อความสะดวกในการอ่าน หากข้อความไม่ตรงกับฉบับภาษาอังกฤษ ให้ถือฉบับภาษาอังกฤษเป็นหลัก";
const REPO = "https://github.com/trajectonomics/moojot/blob/main/docs/";

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const read = (name) => readFileSync(new URL(`../../docs/${name}`, import.meta.url), "utf8");

function headingLevels(markdown) {
  return markdown
    .split("\n")
    .map((line) => /^(#{1,3}) /.exec(line))
    .filter(Boolean)
    .map((match) => match[1].length);
}

function lastUpdated(markdown, months, label) {
  const match = new RegExp(`\\*\\*${label}: (\\d{1,2}) (\\S+) (\\d{4})\\*\\*`).exec(markdown);
  assert.ok(match, `missing "${label}" line`);
  const month = months.indexOf(match[2]);
  assert.notEqual(month, -1, `unknown month "${match[2]}"`);
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

for (const doc of ["privacy-policy", "terms-of-service"]) {
  const english = read(`${doc}.md`);
  const thai = read(`${doc}.th.md`);

  test(`${doc}.th.md has the same headings as the English file`, () => {
    assert.deepEqual(headingLevels(thai), headingLevels(english));
  });

  test(`${doc}.th.md has the same "Last updated" date as the English file`, () => {
    assert.equal(
      lastUpdated(thai, MONTHS_TH, "อัปเดตล่าสุด"),
      lastUpdated(english, MONTHS_EN, "Last updated"),
    );
  });

  test(`${doc}.th.md starts with the convenience-translation note`, () => {
    const lines = thai.split("\n").filter((line) => line.trim() !== "");
    assert.ok(/^# \S/.test(lines[0]), "the first line is the Thai title");
    assert.ok(lines[1].startsWith(NOTE), "the note comes right after the title");
    assert.ok(lines[1].includes(`${REPO}${doc}.md`), "the note links to the English file");
  });
}
