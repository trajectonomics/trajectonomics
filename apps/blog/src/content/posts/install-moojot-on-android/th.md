---
title: วิธีติดตั้ง MooJot บน Android
description: MooJot อ่านสลิปโอนเงินที่แอปธนาคารไทยเซฟไว้ แล้วบันทึกรายจ่ายทุกยอดลงในเครื่องให้เอง ตอนนี้ยังไม่มีใน Google Play นี่คือวิธีติดตั้งใน 2 นาที พร้อมวิดีโอสอน
type: guide
publishedOn: 2026-11-23
cover:
  src: /blog/posts/install-moojot-on-android/cover.webp
  alt: แบนเนอร์สีชมพูมีรูปหมูของ MooJot โบกมือข้างหน้าจอมือถือที่แสดงยอดใช้จ่ายรายเดือนแยกตามหมวดหมู่ เหนือข้อความภาษาไทย "โอนปุ๊บ มูจดให้ปั๊บ", "แอป Android ฟรี อ่านสลิปธนาคารไทย" และ moojot.trajectonomics.com
  width: 1200
  height: 630
---

[MooJot](https://moojot.trajectonomics.com/) เป็นแอปบันทึกรายจ่ายฟรีและเป็น [open-source](https://github.com/trajectonomics/moojot) สำหรับสลิปธนาคารไทย เวลาคุณโอนเงินผ่านแอปธนาคาร แล้วแอปเซฟรูปสลิปลงเครื่อง MooJot จะอ่านสลิปพวกนั้นแล้วจดรายจ่ายแต่ละรายการพร้อมแยกหมวดหมู่ให้เลย ไม่ต้องสมัครบัญชี และ [บันทึกรายจ่ายของคุณจะอยู่แค่ในเครื่องของคุณ](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md)

ตอนนี้แอปยังไม่ได้ขึ้น Google Play จึงต้องติดตั้งจากไฟล์ APK แทน ใช้เวลาประมาณ 1 นาที และมี [วิดีโอสอนความยาว 2 นาที](https://youtu.be/OIfqAEZv6_M) ที่ทำให้ดูทุกขั้นตอนที่ต้องกด ตัววิดีโอเป็นภาษาไทย ส่วนขั้นตอนเดียวกันทั้งหมดแบบอ่านก็อยู่ด้านล่างนี้

<figure>
  <img src="/blog/posts/install-moojot-on-android/steps.webp" alt="ภาพหน้าจอมือถือ 3 หน้า: หน้าจอ Chrome ที่ถามว่าจะดาวน์โหลดไฟล์ moojot-android-arm64.apk ต่อไปหรือไม่, หน้าจอ Android ที่ถามว่าจะติดตั้ง moojot หรือไม่ และหน้าแรกของ MooJot ที่มีรูปหมูกับยอดรวมประจำเดือน โดยเบลอรายการธุรกรรมจริงไว้" width="1440" height="1070" loading="lazy" />
  <figcaption>กด Download anyway (ดาวน์โหลดต่อไป), กด Install (ติดตั้ง) แล้วมูก็จะอ่านสลิปให้เลย รายการธุรกรรมจริงถูกเบลอไว้</figcaption>
</figure>

## สิ่งที่ต้องมี

มือถือที่ใช้ [Android 7.0 ขึ้นไป แบบ 64-bit](https://moojot.trajectonomics.com/) ตอนนี้ยังไม่มีเวอร์ชันสำหรับ iPhone และ [หน้าแอปบน Google Play](https://github.com/trajectonomics/moojot/issues/35) ก็ยังไม่มา

## 1. ดาวน์โหลดไฟล์

เปิดเว็บ [moojot.trajectonomics.com](https://moojot.trajectonomics.com/) บนมือถือแล้วกด **Download for Android** ไฟล์ `moojot-android-arm64.apk` นี้โหลดตรงมาจากหน้า [GitHub releases](https://github.com/trajectonomics/moojot/releases/latest) ของโปรเจกต์เลย

ถ้า Chrome เตือนว่า "File might be harmful" (ไฟล์อาจเป็นอันตราย) ให้กด **Download anyway** (ดาวน์โหลดต่อไป)

## 2. อนุญาตการติดตั้ง

พอโหลดเสร็จแล้วให้เปิดไฟล์ขึ้นมาแล้วกด **Install** (ติดตั้ง) ถ้า Android บล็อกแอปจากแหล่งที่ไม่รู้จัก ให้กด **Settings** (การตั้งค่า), เปิดสวิตช์ **Allow from this source** (อนุญาตจากแหล่งที่มานี้) แล้วย้อนกลับมากด **Install** (ติดตั้ง) แต่ถ้า Play Protect ขึ้นเตือน ให้กด **More details** (รายละเอียดเพิ่มเติม) แล้วกด **Install anyway** (ติดตั้งต่อไป) ขั้นตอนทั้งหมดนี้เป็น [ชุดเดียวกับที่เขียนไว้บนหน้าเว็บของ MooJot](https://moojot.trajectonomics.com/#install)

## 3. เปิดแอปแล้วให้มูอ่านสลิป

หน้าแนะนำตอนเปิดแอปครั้งแรกจะให้เลือกภาษา, แสดงให้ดูว่าข้อมูลอะไรบ้างที่เก็บไว้ในเครื่อง และถามว่าจะแชร์สถิติการใช้งานแบบไม่ระบุตัวตนไหม ซึ่งสวิตช์นี้ [ปิดอยู่จนกว่าคุณจะกดเปิดเอง](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md#anonymous-usage-statistics) จากนั้นเลือกธีม แล้วกดอนุญาตให้ MooJot เข้าถึงรูปภาพของคุณ

กด **เริ่มจดเลย** ในหน้าสุดท้าย มูจะอ่านสลิปจากอัลบั้มของแอปธนาคารย้อนหลัง 3 เดือน แล้วสรุปยอดรวมของเดือนนี้ขึ้นมาให้เอง

## การอัปเดตและการตรวจสอบไฟล์

เวลาอัปเดต ให้ดาวน์โหลดไฟล์ใหม่จากหน้าเดิมแล้วติดตั้งทับของเดิมได้เลย ข้อมูลที่จดไว้จะยังอยู่ครบ เพราะทุกเวอร์ชันถูกเซ็นด้วยคีย์เดียวกัน นอกจากนี้แต่ละ release ยังมีไฟล์ [`SHA256SUMS`](https://github.com/trajectonomics/moojot/releases/latest/download/SHA256SUMS) มาให้ด้วย และ[หน้าเว็บของ MooJot](https://moojot.trajectonomics.com/#install) ก็มีค่า fingerprint ของคีย์ที่ใช้เซ็นแสดงไว้ อย่าติดตั้งไฟล์ APK ของ MooJot ที่มีค่า fingerprint ไม่ตรงกัน

## อะไรบ้างที่ถูกส่งออกจากเครื่อง

รายการบันทึก ยอดเงิน และรูปสลิปของคุณไม่ได้ถูกส่งออกไปไหน ในการอ่านสลิป MooJot ใช้ Google ML Kit บนมือถือ ซึ่งตัว ML Kit เองจะส่งข้อมูลการใช้งานของตัวมันให้ Google เช่น รุ่นมือถือของคุณ โดย MooJot ไม่สามารถปิดส่วนนี้ได้ ใน [นโยบายความเป็นส่วนตัว](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md#google-ml-kit-metrics) มีระบุรายการที่ถูกส่งไปไว้ทั้งหมด

ถ้าเจอขั้นตอนไหนที่ไม่ตรงกับมือถือของคุณ [เปิด issue แจ้งเราได้เลย](https://github.com/trajectonomics/moojot/issues/new/choose) แล้วเราจะแก้คู่มือให้
