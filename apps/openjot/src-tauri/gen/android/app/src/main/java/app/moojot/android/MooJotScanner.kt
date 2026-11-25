package app.moojot.android

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.EnumMap

object MooJotScanner {

    private val latinRecognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    /**
     * Scans Thai bank slip albums via Android MediaStore.
     *
     * Privacy & Non-Slip Gatekeeper:
     * - When [includeSharedAlbum] is FALSE, ONLY dedicated bank folders matching [albumKeywords]
     *   are opened. `Pictures/`, `DCIM/`, `Camera/`, `Screenshots/`, and `Download/` are NEVER read.
     * - When [includeSharedAlbum] is TRUE (for Krungthai NEXT / MyMo by GSB on devices that save
     *   to root `Pictures/` or `Download/`):
     *   1. `DCIM/Camera` and `Screenshots` are ALWAYS excluded.
     *   2. MediaStore metadata (portrait aspect ratio + size <= 4MB) filters out non-slips BEFORE
     *      opening image bytes.
     *   3. A valid BOT Slip Verify Mini-QR (`000001`) or TrueMoney Slip QR is REQUIRED before
     *      running OCR or saving any thumbnail — non-slip photos are discarded in ~10ms.
     */
    fun scanBankAlbums(
        context: Context,
        albumKeywords: List<String>,
        includeSharedAlbum: Boolean,
        skipIds: Set<String> = emptySet(),
        sinceSec: Long = 0L,
        batchSize: Int = 8,
        onBatch: ((JSONArray, JSONArray, Boolean) -> Unit)? = null
    ): JSONArray {
        val results = JSONArray()
        val lowerKeywords = albumKeywords.map { it.lowercase() }.filter { it.isNotBlank() }

        val projection = mutableListOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            projection.add(MediaStore.Images.Media.RELATIVE_PATH)
        }

        val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"
        val selection = if (sinceSec > 0L) "${MediaStore.Images.Media.DATE_ADDED} >= ?" else null
        val selectionArgs = if (sinceSec > 0L) arrayOf(sinceSec.toString()) else null
        val cursor = context.contentResolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection.toTypedArray(),
            selection,
            selectionArgs,
            sortOrder
        ) ?: run {
            onBatch?.invoke(JSONArray(), JSONArray(), true)
            return results
        }

        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val bucketCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
            val dateCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val mimeCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
            val sizeCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
            val widthCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
            val heightCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)
            val relCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                c.getColumnIndex(MediaStore.Images.Media.RELATIVE_PATH)
            } else -1

            var batchCandidates = JSONArray()
            var batchSeen = JSONArray()
            val batchLimit = batchSize.coerceIn(1, 20)
            fun emitBatch(done: Boolean) {
                if (onBatch == null) return
                if (!done && batchSeen.length() == 0) return
                onBatch.invoke(batchCandidates, batchSeen, done)
                batchCandidates = JSONArray()
                batchSeen = JSONArray()
            }

            // Read every photo in the range. A cap here once stopped a 1-year scan after
            // about 3 months of slips (#71). Results stream out in batches, so a long
            // scan doesn't hold them all in memory.
            while (c.moveToNext()) {
                val bucket = c.getString(bucketCol) ?: ""
                val relPath = if (relCol >= 0) (c.getString(relCol) ?: "") else ""
                val combinedPath = "$bucket $relPath".lowercase()

                // Never inspect Camera or Screenshots in auto-scan
                if (bucket.equals("Camera", ignoreCase = true) ||
                    bucket.equals("Screenshots", ignoreCase = true) ||
                    combinedPath.contains("dcim/camera")
                ) {
                    continue
                }

                val isBankAlbum = lowerKeywords.any { kw -> combinedPath.contains(kw) }
                val isShared = includeSharedAlbum && (
                    bucket.equals("Pictures", ignoreCase = true) ||
                    bucket.equals("Download", ignoreCase = true)
                )

                if (!isBankAlbum && !isShared) continue

                // Gate 1 (Zero-byte metadata filter for Shared Album)
                if (!isBankAlbum && isShared) {
                    val fileSize = c.getLong(sizeCol)
                    val w = c.getInt(widthCol)
                    val h = c.getInt(heightCol)
                    if (fileSize <= 2048 || fileSize > 4_000_000) continue
                    if (w > 0 && h > 0) {
                        val ratio = h.toFloat() / w.toFloat()
                        if (ratio < 1.15f || ratio > 3.2f) continue
                    }
                }

                val id = c.getLong(idCol)
                val mediaId = id.toString()
                if (skipIds.contains(mediaId)) continue
                val dateAdded = c.getLong(dateCol)
                val mime = c.getString(mimeCol) ?: "image/jpeg"
                val contentUri = ContentUris.withAppendedId(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    id
                )

                batchSeen.put(mediaId)
                val candidate = inspectSingleImage(
                    context = context,
                    uri = contentUri,
                    mediaStoreId = mediaId,
                    albumName = bucket,
                    dateAddedSec = dateAdded,
                    mimeType = mime,
                    requireSlipQr = (!isBankAlbum && isShared)
                )
                if (candidate != null) {
                    if (onBatch == null) results.put(candidate) else batchCandidates.put(candidate)
                }
                if (batchSeen.length() >= batchLimit) emitBatch(false)
            }
            emitBatch(true)
        }
        return results
    }

    fun inspectSingleImage(
        context: Context,
        uri: Uri,
        mediaStoreId: String,
        albumName: String,
        dateAddedSec: Long,
        mimeType: String,
        requireSlipQr: Boolean = false
    ): JSONObject? {
        return try {
            val rawBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return null
            if (rawBytes.size < 2048 || rawBytes.size > 15_000_000) return null

            val sha256 = sha256Hex(rawBytes)

            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, opts)
            var sampleSize = 1
            while (opts.outWidth / sampleSize > 1400 || opts.outHeight / sampleSize > 2200) {
                sampleSize *= 2
            }
            val decodeOpts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, decodeOpts)
                ?: return null

            // Gate 2: Fast on-device ZXing QR check BEFORE OCR
            val qrRaw = decodeQrCode(bitmap)
            if (requireSlipQr && !isLikelySlipQr(qrRaw)) {
                bitmap.recycle()
                return null
            }

            // 100% On-device Hybrid OCR: ML Kit Latin (fast EN + line boxes) + local AksonOCR-Lite ONNX (Thai)
            val ocrText = runLocalHybridOcr(context, bitmap)

            // Save crisp slip copy to app-private files/slips/<sha256>.jpg so user can view attached slip
            val imagePath = saveSlipCopy(context, bitmap, sha256)

            val obj = JSONObject().apply {
                put("mediaStoreId", mediaStoreId)
                put("contentSha256", sha256)
                put("albumName", albumName)
                put("qrRaw", qrRaw ?: JSONObject.NULL)
                put("ocrText", ocrText)
                put("mimeType", mimeType)
                put("dateAddedSec", dateAddedSec)
                put("imagePath", imagePath ?: JSONObject.NULL)
                put("imageBase64", JSONObject.NULL)
            }
            bitmap.recycle()
            obj
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Backfills attached slip images + local Thai OCR for already-imported slips via mediaStoreId.
     */
    fun backfillSlipFromMediaId(
        context: Context,
        mediaStoreId: String,
        sha256: String,
        runLocalThaiOcr: Boolean
    ): JSONObject? {
        val id = mediaStoreId.toLongOrNull() ?: return null
        val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
        return try {
            val rawBytes = context.contentResolver.openInputStream(contentUri)?.use { it.readBytes() }
                ?: return null
            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, opts)
            var sampleSize = 1
            while (opts.outWidth / sampleSize > 1400 || opts.outHeight / sampleSize > 2200) {
                sampleSize *= 2
            }
            val bitmap = BitmapFactory.decodeByteArray(
                rawBytes,
                0,
                rawBytes.size,
                BitmapFactory.Options().apply { inSampleSize = sampleSize }
            ) ?: return null

            val imagePath = saveSlipCopy(context, bitmap, sha256)
            val ocrText = if (runLocalThaiOcr) runLocalHybridOcr(context, bitmap) else null
            bitmap.recycle()

            JSONObject().apply {
                put("contentSha256", sha256)
                put("imagePath", imagePath ?: JSONObject.NULL)
                put("ocrText", ocrText ?: JSONObject.NULL)
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun saveSlipCopy(context: Context, bitmap: Bitmap, sha256: String): String? {
        return try {
            val slipsDir = File(context.filesDir, "slips").apply { mkdirs() }
            val relPath = "slips/$sha256.jpg"
            val outFile = File(context.filesDir, relPath)
            if (!outFile.exists() || outFile.length() < 1024L) {
                val maxW = 1080
                val toSave = if (bitmap.width > maxW) {
                    val newH = (bitmap.height.toFloat() * maxW / bitmap.width).toInt().coerceAtLeast(1)
                    Bitmap.createScaledBitmap(bitmap, maxW, newH, true)
                } else {
                    bitmap
                }
                FileOutputStream(outFile).use { fos ->
                    toSave.compress(Bitmap.CompressFormat.JPEG, 82, fos)
                }
                if (toSave !== bitmap) toSave.recycle()
            }
            relPath
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Quick check for BOT Slip Verify Mini-QR (000001) or TrueMoney Slip QR (00.00=01, 00.01=01),
     * rejecting PromptPay Payment QRs (00=01 + tag 63).
     */
    private fun isLikelySlipQr(qr: String?): Boolean {
        if (qr.isNullOrBlank() || qr.length < 24) return false
        val s = qr.trim()
        // Reject PromptPay payment QR ("000201...")
        if (s.startsWith("000201")) return false
        // BOT Slip Verify Mini-QR: tag 00 -> inner 0006000001
        if (s.startsWith("00") && s.contains("0006000001")) return true
        // TrueMoney Slip QR: tag 00 -> inner 000201010201
        if (s.startsWith("00") && s.contains("000201010201")) return true
        return false
    }

    /**
     * 100% On-Device Hybrid OCR:
     * 1. Runs bundled ML Kit Latin to get text + exact line bounding boxes (~40ms).
     * 2. If any line looks like misread Thai script (extended-Latin mojibake or garbled Thai
     *    baht/month markers), crops that exact line box and recognizes it locally via
     *    Apache-2.0 AksonOCR-Lite ONNX (`rec.onnx`, 4.3 MB, Thai+English grapheme CTC).
     */
    private fun runLocalHybridOcr(context: Context, bitmap: Bitmap): String {
        return try {
            val image = InputImage.fromBitmap(bitmap, 0)
            val result = Tasks.await(latinRecognizer.process(image))

            // Collect all lines sorted top-to-bottom, left-to-right
            val allLines = result.textBlocks
                .flatMap { it.lines }
                .sortedWith(compareBy({ (it.boundingBox?.top ?: 0) / 18 }, { it.boundingBox?.left ?: 0 }))

            if (allLines.isEmpty()) return result.text ?: ""

            // Count how many lines look garbled Thai; if >=2, treat the whole slip as Thai-heavy
            val garbledFlags = allLines.map { AksonLocalOcr.looksLikeGarbledThai(it.text) }
            val thaiSlip = garbledFlags.count { it } >= 2

            val outLines = ArrayList<String>(allLines.size)
            for (i in allLines.indices) {
                val line = allLines[i]
                val box = line.boundingBox
                val shouldRunThai = box != null && (garbledFlags[i] || thaiSlip)
                if (shouldRunThai && box != null) {
                    val thai = AksonLocalOcr.recognizeLine(context, bitmap, box)
                    outLines.add(if (!thai.isNullOrBlank()) thai else line.text)
                } else {
                    outLines.add(line.text)
                }
            }
            outLines.joinToString("\n")
        } catch (_: Throwable) {
            ""
        }
    }

    private fun decodeQrCode(bitmap: Bitmap): String? {
        tryDecodeBitmapQr(bitmap)?.let { return it }
        if (bitmap.height > 400) {
            val crop = Bitmap.createBitmap(
                bitmap,
                0,
                bitmap.height / 2,
                bitmap.width,
                bitmap.height - bitmap.height / 2
            )
            val found = tryDecodeBitmapQr(crop)
            crop.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun tryDecodeBitmapQr(bitmap: Bitmap): String? {
        return try {
            val width = bitmap.width
            val height = bitmap.height
            val pixels = IntArray(width * height)
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
            val source = RGBLuminanceSource(width, height, pixels)
            val binaryBitmap = BinaryBitmap(HybridBinarizer(source))
            val hints = EnumMap<DecodeHintType, Any>(DecodeHintType::class.java).apply {
                put(DecodeHintType.TRY_HARDER, true)
                put(DecodeHintType.POSSIBLE_FORMATS, listOf(BarcodeFormat.QR_CODE))
            }
            MultiFormatReader().decode(binaryBitmap, hints)?.text
        } catch (_: Throwable) {
            null
        }
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { "%02x".format(it) }
    }
}
