package app.moojot.android

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Rect
import org.json.JSONObject
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min

/**
 * 100% On-Device Local Thai + English Text-Line Recognizer powered by
 * Apache-2.0 Remtir/AksonOCR-Lite (SVTR_LCNet grapheme-cluster CTC, 4.3 MB ONNX).
 *
 * Runs completely offline on Android CPU with zero API keys and zero network traffic.
 */
object AksonLocalOcr {

    private const val INPUT_HEIGHT = 48
    private const val MAX_WIDTH = 1600
    private const val ASSET_MODEL = "akson_ocr/rec.onnx"
    private const val ASSET_CHARSET = "akson_ocr/rec_charset.json"

    @Volatile
    private var initialized = false
    private var env: OrtEnvironment? = null
    private var session: OrtSession? = null
    private var inputName: String = "x"
    private var chars: List<String> = emptyList()

    @Synchronized
    private fun ensureInit(context: Context): Boolean {
        if (initialized) return session != null
        initialized = true
        return try {
            val charsetStr = context.assets.open(ASSET_CHARSET).bufferedReader(Charsets.UTF_8).use {
                it.readText()
            }
            val arr = JSONObject(charsetStr).getJSONArray("chars")
            val list = ArrayList<String>(arr.length())
            for (i in 0 until arr.length()) {
                list.add(arr.getString(i))
            }
            chars = list

            // Copy ONNX model once from APK assets to app-private cache for memory-mapped loading
            val modelFile = File(context.noBackupFilesDir, "akson_rec_v1.onnx")
            if (!modelFile.exists() || modelFile.length() < 1_000_000L) {
                context.assets.open(ASSET_MODEL).use { inp ->
                    modelFile.outputStream().use { out -> inp.copyTo(out) }
                }
            }

            val ortEnv = OrtEnvironment.getEnvironment()
            val opts = OrtSession.SessionOptions().apply {
                setIntraOpNumThreads(2)
                setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
            }
            val ortSession = ortEnv.createSession(modelFile.absolutePath, opts)
            env = ortEnv
            session = ortSession
            inputName = ortSession.inputNames.firstOrNull() ?: "x"
            true
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * Heuristic: returns true if ML Kit Latin output looks like misread Thai script
     * (diacritic/extended-Latin mojibake or garbled Thai-symbol artifacts).
     */
    fun looksLikeGarbledThai(latinLine: String): Boolean {
        if (latinLine.isBlank()) return true
        var weird = 0
        for (ch in latinLine) {
            val code = ch.code
            if (code in 0x0080..0x02AF || code in 0x1E00..0x1EFF || ch == '\uFFFD') {
                weird++
            }
        }
        if (weird >= 1) return true
        val lower = latinLine.lowercase()
        // Common ML Kit Latin misreads of Thai baht ("un"/"unn"), Thai months ("w.a.", "n.e."), etc.
        if (Regex("""\b\d+[\.,]\d{2}\s+(un|unn|u\.|um|unn)\b""").containsMatchIn(lower)) return true
        if (Regex("""\b\d{1,2}\s+[a-z]\.[a-z]\.?\s+25\d{2}\b""").containsMatchIn(lower)) return true
        return false
    }

    fun recognizeLine(context: Context, fullBitmap: Bitmap, box: Rect): String? {
        if (!ensureInit(context)) return null
        val ortEnv = env ?: return null
        val ortSession = session ?: return null
        if (chars.isEmpty()) return null

        return try {
            // Pad slightly above/below so Thai tone marks & vowels never clip
            val boxH = max(box.height(), 12)
            val padTop = (boxH * 0.25f).toInt()
            val padBottom = (boxH * 0.20f).toInt()
            val padX = max(6, (boxH * 0.15f).toInt())

            val left = max(0, box.left - padX)
            val top = max(0, box.top - padTop)
            val right = min(fullBitmap.width, box.right + padX)
            val bottom = min(fullBitmap.height, box.bottom + padBottom)
            val cropW = right - left
            val cropH = bottom - top
            if (cropW < 8 || cropH < 8) return null

            val crop = Bitmap.createBitmap(fullBitmap, left, top, cropW, cropH)
            val targetW = min(MAX_WIDTH, max(8, ceil(INPUT_HEIGHT.toDouble() * cropW / cropH).toInt()))
            val resized = Bitmap.createScaledBitmap(crop, targetW, INPUT_HEIGHT, true)
            if (resized !== crop) crop.recycle()

            val pixels = IntArray(targetW * INPUT_HEIGHT)
            resized.getPixels(pixels, 0, targetW, 0, 0, targetW, INPUT_HEIGHT)
            resized.recycle()

            // NCHW [1, 3, 48, W] in BGR order, normalized (v / 255.0 - 0.5) / 0.5
            val planeSize = INPUT_HEIGHT * targetW
            val floatBuf = FloatArray(3 * planeSize)
            for (i in pixels.indices) {
                val p = pixels[i]
                val r = ((p shr 16) and 0xFF) / 127.5f - 1.0f
                val g = ((p shr 8) and 0xFF) / 127.5f - 1.0f
                val b = (p and 0xFF) / 127.5f - 1.0f
                floatBuf[i] = b
                floatBuf[planeSize + i] = g
                floatBuf[2 * planeSize + i] = r
            }

            val shape = longArrayOf(1L, 3L, INPUT_HEIGHT.toLong(), targetW.toLong())
            OnnxTensor.createTensor(ortEnv, FloatBuffer.wrap(floatBuf), shape).use { tensor ->
                ortSession.run(mapOf(inputName to tensor)).use { result ->
                    @Suppress("UNCHECKED_CAST")
                    val raw = result[0].value as? Array<Array<FloatArray>> ?: return null
                    val steps = raw.firstOrNull() ?: return null
                    val sb = StringBuilder()
                    var prev = 0
                    for (logits in steps) {
                        var bestIdx = 0
                        var bestVal = Float.NEGATIVE_INFINITY
                        for (c in logits.indices) {
                            if (logits[c] > bestVal) {
                                bestVal = logits[c]
                                bestIdx = c
                            }
                        }
                        if (bestIdx != prev && bestIdx != 0 && bestIdx < chars.size) {
                            sb.append(chars[bestIdx])
                        }
                        prev = bestIdx
                    }
                    sb.toString().trim().takeIf { it.isNotEmpty() }
                }
            }
        } catch (_: Throwable) {
            null
        }
    }
}
