package app.moojot.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

class MainActivity : TauriActivity() {

    private var bridgeWebView: WebView? = null
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private var pendingShareIntent: Intent? = null
    /** "add" or "scan" from a widget button (#81), until the web app takes it. */
    @Volatile private var pendingWidgetAction: String? = null
    private var lastBackPressMs: Long = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)
        handleIncomingShareIntent(intent)
        handleWidgetIntent(intent)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val wv = bridgeWebView
                if (wv == null) {
                    finish()
                    return
                }
                wv.evaluateJavascript(
                    "(function(){ return window.__moojotHandleBack ? window.__moojotHandleBack() : 'root:en'; })()"
                ) { raw ->
                    val cleaned = raw?.trim()?.trim('"') ?: "root:en"
                    if (cleaned == "handled" || cleaned == "true") {
                        return@evaluateJavascript
                    }
                    val now = System.currentTimeMillis()
                    if (now - lastBackPressMs < 2000L) {
                        moveTaskToBack(true)
                    } else {
                        lastBackPressMs = now
                        val msg = if (cleaned == "root:th") {
                            "กดย้อนกลับอีกครั้งเพื่อออกจากแอป"
                        } else {
                            "Press back again to exit"
                        }
                        Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingShareIntent(intent)
        handleWidgetIntent(intent)
    }

    override fun onStop() {
        super.onStop()
        // The launcher icon follows the Mascot setting. Switching the enabled alias while the
        // app is in the foreground can close the task on some Android versions, so it happens
        // once the person has left the app (see MascotIcon.kt).
        MascotIcon.applyLauncherIcon(this)
    }

    /**
     * A widget button opened the app (#81). The web app asks for the action when it starts
     * (takeWidgetAction) and, when it is already running, hears moojot:widget-action.
     */
    private fun handleWidgetIntent(intent: Intent?) {
        val action = when (intent?.action) {
            MooWidget.ACTION_ADD -> "add"
            MooWidget.ACTION_SCAN -> "scan"
            else -> return
        }
        pendingWidgetAction = action
        emitEvent("moojot:widget-action", JSONObject().put("action", action).toString())
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        bridgeWebView = webView
        webView.addJavascriptInterface(MooJotJsBridge(), "MooJotAndroid")
        pendingShareIntent?.let {
            pendingShareIntent = null
            dispatchShareIntentToWeb(it)
        }
    }

    private fun handleIncomingShareIntent(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        if (bridgeWebView == null) {
            pendingShareIntent = intent
        } else {
            dispatchShareIntentToWeb(intent)
        }
    }

    private fun dispatchShareIntentToWeb(intent: Intent) {
        val type = intent.type ?: return
        val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(Intent.EXTRA_STREAM)
        }
        if (uri == null) return

        if (type.startsWith("image/")) {
            ioExecutor.execute {
                val item = MooJotScanner.inspectSingleImage(
                    context = this,
                    uri = uri,
                    mediaStoreId = "share_${System.currentTimeMillis()}",
                    albumName = "Shared",
                    dateAddedSec = System.currentTimeMillis() / 1000L,
                    mimeType = type,
                    requireSlipQr = false
                )
                if (item != null) {
                    val arr = JSONArray().apply { put(item) }
                    emitEvent("moojot:shared-slips", arr.toString())
                }
            }
        } else if (type == "application/pdf") {
            ioExecutor.execute {
                val pdfBase64 = readUriBase64(uri) ?: return@execute
                val payload = JSONObject().apply {
                    put("mimeType", type)
                    put("pdfBase64", pdfBase64)
                }
                emitEvent("moojot:shared-pdf", payload.toString())
            }
        }
    }

    private fun readUriBase64(uri: Uri): String? {
        return try {
            contentResolver.openInputStream(uri)?.use { input ->
                val bytes = input.readBytes()
                if (bytes.size > 8 * 1024 * 1024) return null
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun emitEvent(eventName: String, jsonPayload: String) {
        val wv = bridgeWebView ?: return
        val escaped = JSONObject.quote(jsonPayload)
        runOnUiThread {
            wv.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('$eventName', { detail: JSON.parse($escaped) }));",
                null
            )
        }
    }

    private fun hasGalleryAccess(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) == PackageManager.PERMISSION_GRANTED
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
    }

    inner class MooJotJsBridge {
        @JavascriptInterface
        fun isAndroidNative(): Boolean = true

        @JavascriptInterface
        fun setStatusBarLight(light: Boolean) {
            runOnUiThread {
                val controller = WindowCompat.getInsetsController(window, window.decorView)
                controller.isAppearanceLightStatusBars = light
                controller.isAppearanceLightNavigationBars = light
            }
        }

        /**
         * App lock (#79): keep the ledger out of the Recents thumbnail while the lock is on.
         * Android 13+ only; screenshots keep working (unlike FLAG_SECURE).
         */
        @JavascriptInterface
        fun setRecentsHidden(hidden: Boolean) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
            runOnUiThread { setRecentsScreenshotEnabled(!hidden) }
        }

        // ---- Home-screen widget (#81), see MooWidget.kt ----
        @JavascriptInterface
        fun updateWidget(snapshotJson: String) {
            MooWidget.save(this@MainActivity, snapshotJson)
        }

        /** The widget button that opened the app, once: "add", "scan" or "". */
        @JavascriptInterface
        fun takeWidgetAction(): String {
            val action = pendingWidgetAction ?: ""
            pendingWidgetAction = null
            return action
        }

        // ---- Mascot setting, see MascotIcon.kt ----
        /**
         * Stores the mascot and redraws the widget with its image. The launcher icon is not
         * switched here: onStop does that, because changing the enabled alias of the running
         * task can close the app on some Android versions.
         */
        @JavascriptInterface
        fun setMascot(mascot: String) {
            MascotIcon.save(this@MainActivity, mascot)
            MooWidget.refresh(this@MainActivity)
        }

        // ---- Daily reminder (#80), see DailyReminder.kt ----
        @JavascriptInterface
        fun hasNotificationPermission(): Boolean = DailyReminder.hasNotificationPermission(this@MainActivity)

        /** Android 13+ asks; older versions allow notifications already. Answers with moojot:notification-permission. */
        @JavascriptInterface
        fun requestNotificationPermission() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || DailyReminder.hasNotificationPermission(this@MainActivity)) {
                emitEvent("moojot:notification-permission", JSONObject().put("granted", true).toString())
                return
            }
            runOnUiThread {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS)) { _ ->
                    val payload = JSONObject().put("granted", DailyReminder.hasNotificationPermission(this@MainActivity))
                    emitEvent("moojot:notification-permission", payload.toString())
                }
            }
        }

        @JavascriptInterface
        fun configureReminder(enabled: Boolean, hour: Int, minute: Int, title: String, body: String) {
            DailyReminder.configure(this@MainActivity, enabled, hour, minute, title, body)
        }

        @JavascriptInterface
        fun markJotted(localDate: String) {
            DailyReminder.markJotted(this@MainActivity, localDate)
        }

        @JavascriptInterface
        fun hasGalleryPermission(): Boolean = hasGalleryAccess()

        @JavascriptInterface
        fun requestGalleryPermission() {
            val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                arrayOf(Manifest.permission.READ_MEDIA_IMAGES)
            } else {
                arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            runOnUiThread {
                requestPermissions(perms) { granted ->
                    val payload = JSONObject().apply {
                        put("granted", granted == true || hasGalleryAccess())
                    }
                    emitEvent("moojot:permission", payload.toString())
                }
            }
        }

        @JavascriptInterface
        fun scanBankSlips(keywordsJson: String, includeShared: Boolean, sinceSec: Long, skipIdsJson: String) {
            if (!hasGalleryAccess()) {
                val payload = JSONObject().apply { put("error", "PERMISSION_REQUIRED") }
                emitEvent("moojot:scan-error", payload.toString())
                return
            }
            val keywords = mutableListOf<String>()
            try {
                val arr = JSONArray(keywordsJson)
                for (i in 0 until arr.length()) {
                    keywords.add(arr.getString(i))
                }
            } catch (_: Throwable) {}
            val skipIds = mutableSetOf<String>()
            try {
                val arr = JSONArray(skipIdsJson)
                for (i in 0 until arr.length()) {
                    skipIds.add(arr.getString(i))
                }
            } catch (_: Throwable) {}

            ioExecutor.execute {
                MooJotScanner.scanBankAlbums(
                    context = this@MainActivity,
                    albumKeywords = keywords,
                    includeSharedAlbum = includeShared,
                    skipIds = skipIds,
                    sinceSec = sinceSec,
                    batchSize = 8
                ) { candidates, seenIds, done ->
                    val payload = JSONObject().apply {
                        put("candidates", candidates)
                        put("seenIds", seenIds)
                        put("done", done)
                    }
                    emitEvent("moojot:scan-batch", payload.toString())
                }
            }
        }

        @JavascriptInterface
        fun pickStatementPdf() {
            runOnUiThread {
                val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "application/pdf"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                launchActivityForResult(pickIntent) { result ->
                    val uri = result?.data?.data ?: return@launchActivityForResult
                    ioExecutor.execute {
                        val pdfBase64 = readUriBase64(uri) ?: return@execute
                        val payload = JSONObject().apply {
                            put("mimeType", "application/pdf")
                            put("pdfBase64", pdfBase64)
                        }
                        emitEvent("moojot:shared-pdf", payload.toString())
                    }
                }
            }
        }

        @JavascriptInterface
        fun pickSlipPhoto(_unused: Boolean) {
            runOnUiThread {
                val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                launchActivityForResult(pickIntent) { result ->
                    val uri = result?.data?.data ?: return@launchActivityForResult
                    ioExecutor.execute {
                        val item = MooJotScanner.inspectSingleImage(
                            context = this@MainActivity,
                            uri = uri,
                            mediaStoreId = "pick_${System.currentTimeMillis()}",
                            albumName = "Picked",
                            dateAddedSec = System.currentTimeMillis() / 1000L,
                            mimeType = contentResolver.getType(uri) ?: "image/jpeg",
                            requireSlipQr = false
                        )
                        if (item != null) {
                            val arr = JSONArray().apply { put(item) }
                            emitEvent("moojot:scan-candidates", arr.toString())
                        }
                    }
                }
            }
        }

        @JavascriptInterface
        fun backfillExistingSlips(itemsJson: String) {
            if (!hasGalleryAccess()) return
            ioExecutor.execute {
                val out = JSONArray()
                try {
                    val arr = JSONArray(itemsJson)
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val mediaId = obj.optString("mediaStoreId", "")
                        val sha = obj.optString("contentSha256", "")
                        val needsThai = obj.optBoolean("needsThaiOcr", false)
                        if (mediaId.isNotBlank() && sha.isNotBlank()) {
                            val res = MooJotScanner.backfillSlipFromMediaId(
                                context = this@MainActivity,
                                mediaStoreId = mediaId,
                                sha256 = sha,
                                runLocalThaiOcr = needsThai
                            )
                            if (res != null) out.put(res)
                        }
                    }
                } catch (_: Throwable) {}
                emitEvent("moojot:backfill-done", out.toString())
            }
        }

        @JavascriptInterface
        fun readSlipImageDataUrl(relativePath: String): String? {
            if (relativePath.isBlank() || relativePath.contains("..")) return null
            return try {
                val file = File(filesDir, relativePath)
                if (!file.exists()) return null
                val bytes = file.readBytes()
                "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
            } catch (_: Throwable) {
                null
            }
        }

        @JavascriptInterface
        fun shareTextFile(filename: String, mimeType: String, content: String): Boolean {
            return try {
                val exportDir = File(cacheDir, "exports").apply { mkdirs() }
                val file = File(exportDir, filename)
                file.writeText(content, Charsets.UTF_8)
                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${applicationContext.packageName}.fileprovider",
                    file
                )
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                runOnUiThread {
                    startActivity(Intent.createChooser(shareIntent, "Export $filename"))
                }
                true
            } catch (_: Throwable) {
                false
            }
        }
    }
}
