---
title: "CI เร็วขึ้น Agent ก็เร็วขึ้น: ลดเวลา Monorepo Check จาก 7 นาทีเหลือ 4 นาที 40 วินาที"
description: "เมื่อ AI coding agent รันชุดทดสอบวันละหลายสิบรอบ check ที่ช้าจะกลายเป็นต้นทุนของทุกรอบการแก้โค้ด เล่าเบื้องหลัง 3 PR ที่ทำให้ root lint เร็วขึ้น 6.3 เท่า, web typecheck เร็วขึ้น 2.4 เท่า และ CI รวมลดจาก 425 วินาทีเหลือ 279 วินาทีโดยไม่ลดกฎตรวจแม้แต่ข้อเดียว"
type: essay
publishedOn: 2026-11-28
cover:
  src: /blog/posts/faster-ci-and-local-checks/cover.webp
  alt: หุ่นยนต์สีครีมสามตัวตาสีส้มเรืองแสงก้าวเดินขนานกันบนรางแสงสีส้มสามเส้นกลางเนินทรายลายไม้ใต้ท้องฟ้าสีเข้ม ใต้หัวข้อ "Faster CI, Faster Agents — 3 PRS · 425S → 279S"
  width: 1024
  height: 1024
---

ในระบบ [Software Factory](/blog/th/essays/software-factory/) ชุดตรวจอย่าง `lint`, `typecheck`, `test` และ CI ไม่ใช่ขั้นตอนที่รันแค่รอบเดียวก่อนเปิด PR แต่เป็นสิ่งที่ AI coding agent เรียกซ้ำตลอดทั้งวัน ทุกครั้งที่ agent ต้องรอ Biome 20 วินาที หรือรอ GitHub Actions นาน 7 นาที เวลานั้นจะทวีคูณไปกับทุก branch ที่กำลังรันพร้อมกัน

พอ agent ใน monorepo เริ่มส่งสัญญาณว่า `lint` บนเครื่องและ CI เริ่มช้าลง เราจึงไล่ตรวจทั้ง pipeline ตั้งแต่ระดับ test file ไปจนถึง workflow บน GitHub Actions แล้วทยอยส่ง 3 PR ต่อเนื่องกันคือ [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804), [PR #808](https://github.com/trajectonomics/trajectonomics/pull/808) และ [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) โดยยังคงกฎ lint, typecheck, unit test, build check และ Playwright browser test ไว้ครบทุกข้อ

<figure>
  <img src="/blog/posts/faster-ci-and-local-checks/before-after-th.webp" alt="กราฟแท่งแนวนอนเทียบเวลาก่อนและหลังแก้จาก PR #804, #808 และ #811: เวลา CI รวมลดจาก 425 เหลือ 279 วินาที, Check web browser ลดจาก 387 เหลือ 250 วินาที, Check web scripts ลดจาก 341 เหลือ 166 วินาที, Check packages ลดจาก 171 เหลือ 81 วินาที, Check web ลดจาก 57 เหลือ 27 วินาที; บนเครื่อง sim test ลดจาก 57.4 เหลือ 13.4 วินาที, web typecheck ลดจาก 56.0 เหลือ 23.0 วินาที, data typecheck ลดจาก 33.5 เหลือ 10.4 วินาที, CLI dump test ลดจาก 27.6 เหลือ 3.7 วินาที และ root turbo lint ลดจาก 20.4 เหลือ 3.3 วินาที" width="1600" height="900" loading="lazy" />
  <figcaption>เวลาที่วัดจริงบน GitHub Actions (<a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046">#46028422046</a> เทียบกับ <a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596">#46041970596</a> และ <a href="https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982">#46046018982</a>) และบนเครื่อง dev แท่งกราฟทุกแท่งเริ่มจากศูนย์</figcaption>
</figure>

## ทำไมชุดตรวจถึงค่อย ๆ ช้าลง

ความช้าไม่ได้มาจาก bug ใหญ่ตัวเดียว แต่สะสมจากค่าเริ่มต้น 4 จุดที่ไม่มีใครสังเกตตอน repo ยังเล็ก:

1. **งานที่ไม่ได้พึ่งกัน แต่ถูกจับต่อคิวกัน:** `turbo.json` ผูก `lint` ไว้กับ `^build` ทำให้แค่สั่ง `bun run lint` ที่ root ก็ต้อง build แพ็กเกจต้นน้ำถึง 9 ตัวก่อนที่ Biome จะเริ่มตรวจไฟล์ และในแต่ละแพ็กเกจ `tsc`, `astro check`, `svelte-check`, `lint` และ `test` ก็รันเรียงคิวทีละตัว
2. **สร้างข้อมูลตั้งต้นซ้ำ ๆ ในทุก test:** ไฟล์ทดสอบ snapshot scripts 15 ไฟล์ต่างสร้าง SQLite Demo ledger ใหม่จากศูนย์ซ้ำกันทุกรอบ ส่วน scratch browser test ก็เรียก `bun run apps/cli/src/index.ts` แทนที่จะใช้ไบนารี `apps/cli/dist/traj` ที่ compile ไว้แล้ว
3. **รัน test แบบคอร์เดียวบนเครื่องหลายคอร์:** Bun 1.4.4 รองรับ `--parallel --no-isolate` แล้ว แต่ชุดทดสอบที่หนักที่สุด (`packages/core/sim`, `apps/cli`, `apps/web`) ยังรันทีละไฟล์เรียงกัน
4. **ใช้เครื่อง CI ไม่เต็มกำลังและ build ซ้ำสองรอบ:** GitHub Actions runner ขนาด 4 vCPU ถูกจำกัดไว้ที่ `--concurrency=2` และ Playwright `workers: 2`, ชุด `Check web browser` ทั้งหมดรันบน runner ตัวเดียว (`387` วินาที) และ workflow ตรวจเบราว์เซอร์ของ Site build ตัวเว็บซ้ำสองรอบพร้อมโหลด Chromium ใหม่แม้ cache จะ hit อยู่แล้ว

## แก้ทีละชั้น ผ่าน 3 PR

เราแยกงานออกเป็น 3 PR เล็ก ๆ ที่ย้อนกลับได้อิสระ เพื่อให้วัดผลของแต่ละชั้นได้ชัดเจน

### 1. เร่งความเร็วชุดทดสอบและเปิด parallelism ([PR #804](https://github.com/trajectonomics/trajectonomics/pull/804))

- **จำกัด concurrency แบบมีขอบเขตใน snapshot scripts:** เพิ่ม worker pool ขนาด 4 ช่อง ([`run-pool.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/scripts/run-pool.ts)) ในตัวรัน stage, allowance, path และ tax-note โดยยังรักษาลำดับ key ใน JSON และผลลัพธ์ deterministic ตรงกันทุก byte
- **แชร์ต้นแบบ Demo ledger:** สร้าง SQLite Demo ledger แค่ครั้งเดียวต่อ process แล้วคัดลอกไปใส่โฟลเดอร์ชั่วคราวของแต่ละ test ([`demo-ledger.test-support.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/scripts/demo-ledger.test-support.ts)) ครอบคลุม 15 จุดที่เรียกใช้
- **ใช้ไบนารี CLI ที่ compile แล้วใน scratch e2e:** เพิ่ม [`scratch-cli.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/browser/scratch-cli.ts) ให้เรียก `apps/cli/dist/traj` โดยตรงเมื่อไฟล์ใหม่กว่า `apps/cli/src`
- **ลดลูป stress ที่เกินจำเป็น:** ปรับลูป concurrent SQLite writer ใน [`dump.test.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/src/store/dump.test.ts) จาก 2,000 รอบเหลือ 250 รอบ (`27.6` วินาที → `3.69` วินาที) โดยยังทดสอบการอ่านเขียน WAL พร้อมกันครบเหมือนเดิม
- **เปิด Bun parallel test:** เพิ่ม `--parallel --no-isolate` ใน `packages/core/sim` (`57.39` → `13.37` วินาที), `apps/cli` และ `apps/web`

### 2. ปรับ CI workflow และชุดทดสอบเบราว์เซอร์ ([PR #808](https://github.com/trajectonomics/trajectonomics/pull/808))

- **ใช้กำลัง runner ให้สมส่วน:** เพิ่ม Turbo concurrency บน CI จาก `2` เป็น `4` ใน [`.github/workflows/ci.yml`](https://github.com/trajectonomics/trajectonomics/blob/main/.github/workflows/ci.yml) และเพิ่ม Playwright `workers` บน CI จาก `2` เป็น `4` ใน [`apps/web/playwright.config.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/playwright.config.ts) กับ [`apps/site/playwright.config.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/playwright.config.ts) ส่วนกฎใน `AGENTS.md` บนเครื่อง dev ยังคง `--concurrency=2` ไว้เพื่อไม่ให้เครื่องที่รัน agent หลายตัวพร้อมกันแย่ง RAM จน swap
- **แตก shard ตรงจุดที่เป็นคอขวด:** ขยาย `Check web scripts` จาก 4 เป็น 6 shard (shard ที่ช้าที่สุดลดจาก `341` เหลือ `166–168` วินาที) และแบ่ง `Check web browser` เป็น 2 shard (`387` → `249–250` วินาที)
- **จัดลำดับ cache และ build เว็บ Site แค่รอบเดียว:** เพิ่ม fallback restore-key ของ Turbo, ให้ดึง cache ฝั่ง `-packages-` (ที่มี `cli#build`, `web#build:hosted` และ `web#demo`) ก่อน `-web-`, ข้ามการดาวน์โหลด Chromium เมื่อ Playwright cache hit และแก้ [`.github/workflows/browser.yml`](https://github.com/trajectonomics/trajectonomics/blob/main/.github/workflows/browser.yml) ให้ build `@trajectonomics/site#build` แค่ครั้งเดียว ลดเวลาตรวจเบราว์เซอร์ของ Site จาก [273 วินาที](https://github.com/trajectonomics/trajectonomics/actions/runs/46036536078) เหลือ [160–168 วินาที](https://github.com/trajectonomics/trajectonomics/actions/runs/46052307647)

### 3. แยก `lint` ออกจาก build และรัน `typecheck` / `check` แบบขนาน ([PR #811](https://github.com/trajectonomics/trajectonomics/pull/811))

- **ปลด `lint` ออกจาก `^build`:** ถอด `"dependsOn": ["^build"]` ออกจาก `lint` ใน [`turbo.json`](https://github.com/trajectonomics/trajectonomics/blob/main/turbo.json) และ [`apps/site/turbo.json`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/turbo.json) พร้อมผูกคำสั่ง `bun run format` ที่ root ผ่าน Turbo ทำให้การรัน `turbo run lint --force --concurrency=4` แบบไม่ใช้ cache ลดจาก **20.44 วินาที** (27 task) เหลือ **3.26 วินาที** (18 task) หรือเร็วขึ้น **6.3 เท่า**
- **ตัวรันคำสั่งขนานแบบ buffer log:** เขียน [`tooling/scripts/run-parallel.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/tooling/scripts/run-parallel.ts) เพื่อรันคำสั่งอิสระพร้อมกัน เก็บ stdout/stderr ของแต่ละตัวไว้พิมพ์เรียงลำดับไม่ให้ปนกัน แสดงแบนเนอร์เมื่อมีตัวใดพัง และส่งต่อ `SIGINT`/`SIGTERM` ไปยัง child process
- **รัน compiler และขั้นตรวจพร้อมกัน:** รัน `tsc`, `svelte-check` และ `astro check` ขนานกันใน `typecheck` (ลด `apps/web` จาก `55.96` เหลือ `23.00` วินาที และ `apps/data` จาก `33.51` เหลือ `10.39` วินาที) และรัน `lint`, `typecheck` กับ `test` พร้อมกันใน `check` ก่อนเข้าสู่ขั้น build และ verify
- **เร่ง guard ตรวจลิงก์ repo เก่า:** เปลี่ยน [`tooling/guards/archived-links.test.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/tooling/guards/archived-links.test.ts) จากเดิมที่อ่านไฟล์ที่ git track ทุกไฟล์ (รวมรูปและฟอนต์) ซ้ำสองรอบเรียงกัน มาเป็นการคัดไฟล์ข้อความที่เข้าข่ายด้วย `git grep -I -l -F -z` แล้ว memoize ผลลัพธ์ เปลี่ยน test ที่เคย timeout 5 วินาทีตอนโหลดสูงให้เหลือ **44.5 มิลลิวินาที**

## 4 ปัญหาจริงที่โผล่เมื่อเปิดรันแบบขนาน

การเร่งความเร็วจะมีประโยชน์ก็ต่อเมื่อผลลัพธ์ยังนิ่งและทำซ้ำได้เหมือนเดิม พอเราเปิดรันขนานจริง มี bug ซ่อนอยู่ 4 ตัวที่การรันทีละขั้นตอนเคยกลบไว้:

1. **`FORCE_COLOR=1` พ่นรหัสสี ANSI ปนลง JSON ใน stderr:** เมื่อ Turbo รันใน PTY, `console.error` ของ Bun จะใส่รหัสสีแดงครอบ error envelope ทำให้ test ที่ parse JSON จาก stderr พังเมื่อรัน `--parallel` แก้ด้วยการเขียน stderr ตรงผ่าน `writeSync(2, ...)` ใน [`apps/cli/src/index.ts`](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/src/index.ts)
2. **ห้ามแทน `console.log` ด้วย `process.stdout.write` ก่อน `process.exit()`:** ตอนแก้ stderr เราเผลอเปลี่ยน stdout ไปด้วย และเจอทันทีว่า JSON ที่ใหญ่กว่า 64 KB จาก `traj projection run --json` ถูกตัดขาดกลางทางเมื่อ pipe ปิด การเก็บ `console.log` ไว้กับ stdout (และใช้ `process.exitCode` แทน `process.exit()`) ปิดปัญหานี้สนิท
3. **`astro check --no-sync` ไม่ได้ปิด sync จริง:** ตัว parse flag `mri` ใน Astro 7.4 แปลง `--no-sync` เป็น `{ sync: false }` แต่โค้ดของ `astro check` ดันเช็ก `flags.noSync` ทำให้ `astro check` ยังเขียนทับ `.astro/types.d.ts` กลางคันระหว่างที่ `tsc` กำลังอ่านอยู่ พอเปลี่ยนเป็น `--noSync` (camelCase) หลังสั่ง `astro sync` รอบเดียวล่วงหน้า ทั้ง race condition และเวลา sync ซ้ำ 2–6 วินาทีต่อแอปก็หายไปพร้อมกัน
4. **test ที่ช้าจะแอบซ่อนจนกว่าจะแย่ง CPU กัน:** การอ่านไฟล์ทั้ง repo สองรอบใน `archived-links.test.ts` เคยรอดฉิวเฉียดตอน `--concurrency=2` แต่พอรัน 4 แพ็กเกจพร้อมกันก็ชนเพดาน timeout 5 วินาทีของ Bun ทันที การคัดกรองด้วย `git grep -I` ทำให้ guard นี้เร็วขึ้นกว่า 150 เท่า

## สรุปตัวเลขที่วัดได้จริง

| คำสั่ง / งานบน CI | ก่อนแก้ | หลังแก้ | เร็วขึ้น | อ้างอิง |
| --- | ---: | ---: | ---: | --- |
| Root `turbo run lint` (ไม่ใช้ cache) | 20.44 วิ | **3.26 วิ** | **6.3×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `apps/web` `typecheck` | 55.96 วิ | **23.00 วิ** | **2.4×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `apps/data` `typecheck` | 33.51 วิ | **10.39 วิ** | **3.2×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| `packages/core/sim` `test` (บนเครื่อง) | 57.39 วิ | **13.37 วิ** | **4.3×** | [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804) |
| `apps/cli` `dump.test.ts` | 27.6 วิ | **3.69 วิ** | **7.5×** | [PR #804](https://github.com/trajectonomics/trajectonomics/pull/804) |
| `tooling/guards` `archived-links.test.ts` | >7 วิ (timeout) | **44.5 มิลลิวินาที** | **>150×** | [PR #811](https://github.com/trajectonomics/trajectonomics/pull/811) |
| CI `Check packages` (warm cache) | 171 วิ | **81 วิ** | **2.1×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |
| CI `Check web` | 57 วิ | **27–31 วิ** | **~2.0×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |
| CI `Check web scripts` (shard ช้าสุด) | 341 วิ | **166–168 วิ** | **2.0×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46046018982](https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982) |
| CI `Check web browser` (shard ช้าสุด) | 387 วิ | **249–250 วิ** | **1.55×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46046018982](https://github.com/trajectonomics/trajectonomics/actions/runs/46046018982) |
| CI `Browser checks (site)` | 273 วิ | **160–168 วิ** | **1.6–1.7×** | [#46036536078](https://github.com/trajectonomics/trajectonomics/actions/runs/46036536078) → [#46052307647](https://github.com/trajectonomics/trajectonomics/actions/runs/46052307647) |
| เวลา CI รวม (`ci.yml`) | 425 วิ (7 นาที 05 วิ) | **279–280 วิ (4 นาที 40 วิ)** | **1.52×** | [#46028422046](https://github.com/trajectonomics/trajectonomics/actions/runs/46028422046) → [#46041970596](https://github.com/trajectonomics/trajectonomics/actions/runs/46041970596) |

## ลองรันวัดด้วยตัวเอง

ใครอยากลองจับเวลาบนเครื่อง สามารถรันคำสั่งชุดนี้บน [`trajectonomics/trajectonomics`](https://github.com/trajectonomics/trajectonomics) ได้เลย:

```sh
DO_NOT_TRACK=1 bunx turbo run lint --force --concurrency=4
DO_NOT_TRACK=1 bun run --cwd apps/web typecheck
DO_NOT_TRACK=1 bun run --cwd packages/core/sim test
DO_NOT_TRACK=1 bun run --cwd tooling/guards test
```

ชุดตรวจที่เร็วคือสิ่งที่ทำให้ทีมเล็ก ๆ—และฝูง coding agent ที่ช่วยทำงานอยู่ข้างหลัง—ยังคงด่านตรวจเข้มงวดไว้ได้ทุกข้อโดยไม่ต้องจ่ายภาษีรอคอย 7 นาทีในทุกการแก้โค้ด อ่านต่อเรื่องการจัดลำดับด่านตรวจสำหรับ agent ได้ใน [Review Proof, Not Code](/blog/th/essays/review-proof-not-code/)
