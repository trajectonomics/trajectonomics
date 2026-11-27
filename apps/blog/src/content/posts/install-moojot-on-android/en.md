---
title: How to install MooJot on Android
description: MooJot reads the payment slips your Thai banking apps save and logs every expense on your phone. It isn't on Google Play yet, so here is the two-minute install, with a video.
type: guide
publishedOn: 2026-11-23
cover:
  src: /blog/posts/install-moojot-on-android/cover.webp
  alt: A pink banner with the MooJot pig waving beside a phone showing a month's spending by category, over the Thai line "โอนปุ๊บ มูจดให้ปั๊บ", "Free Android app, reads Thai bank slips" and moojot.trajectonomics.com.
  width: 1200
  height: 630
---

[MooJot](https://moojot.trajectonomics.com/) is a free, [open-source](https://github.com/trajectonomics/moojot) money tracker for Thai bank slips. You pay with your banking app and the app saves a slip to your phone. MooJot reads those slips and logs each expense with a category for you. It needs no account, and [your records stay on your phone](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md).

It isn't on Google Play yet, so you install it from its APK file. That takes about a minute, and the [two-minute video tutorial](https://youtu.be/OIfqAEZv6_M) shows every tap. The video is in Thai. The same steps are written out below.

<figure>
  <img src="/blog/posts/install-moojot-on-android/steps.webp" alt="Three phone screens: Chrome asking whether to download moojot-android-arm64.apk anyway, Android asking whether to install moojot, and MooJot's home screen with the pig and the month's total, with the list of transactions blurred." width="1440" height="1070" loading="lazy" />
  <figcaption>Download anyway, Install, then Moo reads your slips. The real transactions are blurred.</figcaption>
</figure>

## What you need

An Android phone on [Android 7.0 or newer, 64-bit](https://moojot.trajectonomics.com/). There is no iPhone version yet, and the [Google Play listing](https://github.com/trajectonomics/moojot/issues/35) is still to come.

## 1. Download the file

Open [moojot.trajectonomics.com](https://moojot.trajectonomics.com/) on your phone and tap **Download for Android**. The file, `moojot-android-arm64.apk`, comes straight from the project's [GitHub releases](https://github.com/trajectonomics/moojot/releases/latest).

If Chrome says "File might be harmful", tap **Download anyway**.

## 2. Allow the install

Open the finished download and tap **Install**. If Android blocks apps from unknown sources, tap **Settings**, turn on **Allow from this source**, then go back and tap **Install**. If Play Protect warns you, tap **More details**, then **Install anyway**. These are the [same steps the landing page gives](https://moojot.trajectonomics.com/#install).

## 3. Open it and let Moo read

The welcome tour asks for your language, shows what stays on your phone, and asks whether to share anonymous usage statistics. That switch is [off until you turn it on](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md#anonymous-usage-statistics). Pick a theme, then allow MooJot to see your photos.

Tap **เริ่มจดเลย** (Start) on the last screen. Moo reads the slips from your banking apps' albums for the last three months, and the month's total fills in by itself.

## Updating and checking the file

To update, download the new file from the same page and install it over the old one. Your records stay, because every release is signed with the same key. Each release also ships a [`SHA256SUMS`](https://github.com/trajectonomics/moojot/releases/latest/download/SHA256SUMS) file, and the [landing page](https://moojot.trajectonomics.com/#install) prints the signing key's fingerprint. Don't install a MooJot APK whose fingerprint is different.

## What leaves your phone

Your records, amounts and slips don't. To read slips, MooJot uses Google ML Kit on the phone, and ML Kit sends Google metrics about its own use, such as your device model. MooJot can't switch that off. The [privacy policy](https://github.com/trajectonomics/moojot/blob/main/docs/privacy-policy.md#google-ml-kit-metrics) lists exactly what is sent.

Found a step that doesn't match your phone? [Open an issue](https://github.com/trajectonomics/moojot/issues/new/choose) and we'll fix the guide.
