---
title: "Review Proof, Not Code: Poteto Pyramid กับการเชื่อใจ AI Agent"
description: "สรุปทอล์ก All Code Is Slop (Except Mine) ของ Lauren Tan: Poteto Pyramid 5 ชั้นที่บอกว่าควรจับความผิดพลาดของ agent ตรงไหน ทำไม verification คือขั้นที่สำคัญที่สุด และ 4 ข้อ Software Factory ของผมวางอยู่ตรงไหนบน pyramid นี้"
type: essay
publishedOn: 2026-11-23
cover:
  src: /blog/posts/review-proof-not-code/cover.webp
  alt: หุ่นยนต์สีครีมตาสีส้มยืนเอามือแตะคางทำท่าครุ่นคิดข้างพีระมิดสีส้มเรืองแสงบนเนินทรายลายไม้ใต้ท้องฟ้าสีเข้ม ใต้หัวข้อ "Review Proof, Not Code — POTETO PYRAMID"
  width: 1024
  height: 1024
---

คำถามที่ทุกคนที่ทำ AI Agent ต้องเจอคือ "จะเชื่อโค้ดที่ agent เขียนได้ยังไง" คำตอบของ Lauren Tan (poteto) จากทีม Grok Bot ในทอล์ก [All Code Is Slop (Except Mine)](https://www.youtube.com/watch?v=O_zcc6Xl12g) ที่งาน AI Engineer Code Summit คือ **ไม่ใช่เชื่อแบบหลับหูหลับตา แต่[ลงทุนกับสภาพแวดล้อมของ agent](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=92s) จนมันทำสิ่งที่ถูกเป็นค่าเริ่มต้น แล้วรีวิวหลักฐาน ไม่ใช่รีวิวโค้ด**

ที่ควรฟังเธอเพราะตัวเลข: เดือนที่แล้วเธอ [ship 3,000 PR เข้า production คนเดียว](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=42s) ทั้งทีม [ship 11,000 PR ในเดือนเดียว](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=817s) แต่สัดส่วน PR ที่ถูก revert [คงที่อยู่ราวครึ่งเปอร์เซ็นต์](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=861s)

โพสต์นี้คือ guide ที่สัญญาไว้ในคลิป "4 ข้อก่อนเริ่มทำ Software Factory" ครับ

## Poteto Pyramid: ยิ่งจับได้เร็ว ยิ่งถูก

ไอเดียหลักของทอล์กอยู่ในภาพเดียว เธอเรียกว่า [Poteto Pyramid](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=120s) เป็นสามเหลี่ยมหัวกลับ 5 ชั้นที่บอกว่าควรลงแรงกับสภาพแวดล้อมของ agent ตรงไหน ชั้นบนถูกที่สุด ยิ่งลงล่างยิ่งแพง เป้าหมายคือจับความผิดพลาดให้ได้ที่ชั้นบนให้มากที่สุด

<figure>
  <img src="/blog/posts/review-proof-not-code/poteto-pyramid.webp" alt="สามเหลี่ยมหัวกลับ 5 ชั้น เรียงจากบนลงล่าง: codebase, static analysis, verification (ไฮไลต์สีส้มว่าเป็นขั้นที่สำคัญที่สุด), prose และ human review ลูกศรด้านซ้ายบอกว่ายิ่งลงล่างยิ่งแพง" width="1600" height="900" loading="lazy" />
</figure>

[2 ชั้นบนเป็นแบบ deterministic](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=129s) คือใช้ตัวโค้ดเองบังคับ agent ทั้ง API design, architecture, การ refactor, lint rule, type system, compiler และ test เมื่อใช้ 2 ชั้นนี้ร่วมกัน agent จะถูกบังคับให้ทำสิ่งที่ถูกเป็นค่าเริ่มต้น ส่วน prose อย่าง rules, skills และ `AGENTS.md` อยู่เกือบล่างสุด เพราะเป็น[สิ่งที่ต้องใช้วิจารณญาณ](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=168s) agent จะทำตามหรือไม่ก็ได้

กฎของเธอคือ [ทุกครั้งที่ต้องแก้ agent ให้เปลี่ยนเป็น check ที่ deterministic](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=192s) แทนการเพิ่มบรรทัดใหม่ใน `AGENTS.md` และถ้าทำได้ให้[กำจัดปัญหานั้นทิ้งไปทั้งหมวด](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=550s)ด้วย API design หรือ architecture ที่ดีขึ้น ทำแบบนี้ไปเรื่อย ๆ สิ่งที่ต้องคอยดูตอนรีวิวจะน้อยลง จนถึงจุดที่ปล่อยให้ agent merge PR ส่วนใหญ่ของตัวเองได้

ที่ codebase สำคัญขนาดนี้เพราะ[โค้ดคือ input ที่ใหญ่ที่สุดของ agent](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=263s) workaround หรือ anti-pattern ที่หลงเหลืออยู่จะถูก agent ตัวต่อไปก๊อปต่อ เพราะมันดูเหมือนเป็น pattern ปกติของ repo

## Review proof, not code: verification คือขั้นที่สำคัญที่สุด

สไลด์ของเธอเขียนตรง ๆ ว่า [**"verification is the most important step"**](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=583s) การรีวิวโค้ดของทีมเธอ[หดลงจนเหลือแค่การดู verification artifact](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=590s) เช่น วิดีโอ ภาพหน้าจอ diagram และผล formal verification

- **Runtime verification:** [ให้ agent รันโค้ดเอง](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=602s) และใช้ debugging tool แบบที่ dev ใช้ เช่น Chrome DevTools Protocol ทีมทำ [feature map](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=617s) ที่เป็นเหมือน site map ของทุกฟีเจอร์จากมุมของผู้ใช้ agent จึงไม่ต้องเดาว่า "ปุ่มนั้นใน sidebar ซ้าย" หมายถึงอะไร และยังมี CLI ที่ agent เรียกใช้ซ้ำได้ ซึ่งช่วยประหยัด token และเขียน test ได้
- **Formal verification:** [ใช้ TLA+ ทำ model checking](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=651s) กับ flow การแจ้งเตือนข้ามหลายอุปกรณ์ และใช้ Lean พิสูจน์ว่า virtualization library ที่ทีมเขียนเองไม่กระพริบหรือกระตุก เธอบอกว่าเจอ bug ไปหลายตัวแล้ว แต่[มันไม่ใช่ silver bullet](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=685s) เป็นแค่อีกชั้นหนึ่ง
- **UI property-based testing:** [ใช้ library ชื่อ Bombadil](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=697s) ซึ่งจับ UI bug ได้แล้วหลายตัว

ทำไมต้องลงทุนตรงนี้ เธอยกตัวอย่าง [ทวีตของ Cindy Sridharan](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=720s) เมื่อ 6 เดือนก่อน ที่บอกว่า PR ของ AI หลายอันมี bug เนียน ๆ หลุดเข้าไป และต้องใช้เวลาเพิ่มหลายวันกับการ verify ด้วยมือกว่าจะแก้เสร็จ วันนี้[ราว 70% ของ token ต่อวันของ Cindy](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=730s)ไปอยู่ที่การ verify และ Lauren บอกว่าของเธอก็เป็นแบบเดียวกัน เทคนิคพวกนี้ไม่ใช่ของใหม่ แค่เมื่อก่อนแพงเกินไป ตอนนี้ agent ทำให้ถูกลงมาก เธอเลยเรียกยุคนี้ว่า ["golden age of software testing and verification"](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=763s)

ประโยคที่คนอยากทำ Software Factory ควรจำ: ["If your inner coding loop produces slop, then automating that loop just produces more slop"](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=936s) [ลำดับที่เธอแนะนำ](https://www.youtube.com/watch?v=O_zcc6Xl12g&t=911s)ก่อนจะ automate คือ

1. เขียน lint rule กัน anti-pattern ไม่ให้เกิดขึ้นใหม่
2. เก็บกวาด pattern เก่าที่ค้างอยู่
3. ทำ verification ให้แข็งแรง
4. ค่อยสร้าง factory บนฐานนี้ แล้วปล่อยให้ agent merge PR เอง

## 4 ข้อ Software Factory ของผม อยู่ตรงไหนบน pyramid

ทั้ง 4 ข้อในคลิปของผมตรงกับ 4 ชั้นของ Poteto Pyramid และเราเห็นตรงกันว่า **ข้อสุดท้าย (validation) สำคัญที่สุด** ตัวอย่างในตารางมาจาก Factory ที่ผมใช้จริง ([เล่าไว้ในโพสต์นี้](/blog/th/essays/software-factory/)) ซึ่งเปิดเป็น open source ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory)

| ชั้นใน pyramid | ข้อในคลิป | ที่ Factory ของผมทำจริง |
| --- | --- | --- |
| codebase | 1. Clean Code | ทุก PR ต้องผ่าน Standards Review ตาม `CODING_STANDARDS.md` ของ repo ([Gate](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md)) |
| static analysis | 2. ใส่ Linting rule | `bun run check` ที่รวม lint, typecheck, test และ build ต้องผ่านก่อน merge ([package.json](https://github.com/trajectonomics/factory/blob/main/package.json)) |
| verification ★ | 4. Validation ที่แข็งแรง | โมเดลที่เขียนโค้ดไม่มีสิทธิ์รีวิวงานตัวเอง: DeepSeek เขียน ส่วน Grok 4.7 กับ Gemini 4 Hydrogen รีวิว ([ADR 0028](https://github.com/trajectonomics/factory/blob/main/docs/adr/0028-reviews-run-on-hydrogen-and-grok.md)) |
| prose | 3. อัปเดต Instruction เสมอ | `AGENTS.md` กับ [ADR](https://github.com/trajectonomics/factory/tree/main/docs/adr) ที่ทำให้ agent ทุกตัวทำตามกฎชุดเดียวกัน |
| human review | (ไม่ได้พูดในคลิป) | งานที่คนมองเห็นต้องแนบภาพหน้าจอ และผมต้องอนุมัติก่อน merge ([ADR 0017](https://github.com/trajectonomics/factory/blob/main/docs/adr/0017-surface-design-gate.md)) |

สิ่งที่ผมจะเปลี่ยนหลังดูทอล์กนี้คือข้อ 3 instruction เป็นชั้นที่ agent ข้ามได้ ถ้าต้องแก้เรื่องเดิมซ้ำเกินหนึ่งครั้ง ผมจะย้ายกฎนั้นไปเป็น lint rule (ข้อ 2) แทน

## สรุป

อยากเชื่อใจ agent ให้ลงทุนกับสภาพแวดล้อมของมัน ไม่ใช่นั่งอ่านโค้ดให้มากขึ้น เริ่มจากชั้นบนของ pyramid ที่ถูกที่สุด แล้วทำ verification ให้แข็งแรงก่อนสร้าง Software Factory

อยากอ่านต่อว่าทำไม validation คือหัวใจ ดูข้อ 3 ของ [7 สิ่งที่ควรรู้ ก่อนเริ่มทำ Software Factory](/blog/th/essays/software-factory-7-things/) ส่วนทอล์กเต็มของ Lauren ยาว 17 นาที [ดูได้ที่ YouTube](https://www.youtube.com/watch?v=O_zcc6Xl12g) ถ้ามีเพื่อนที่กำลังทำ AI Agent อยู่ ส่งต่อให้เขาได้เลยครับ
