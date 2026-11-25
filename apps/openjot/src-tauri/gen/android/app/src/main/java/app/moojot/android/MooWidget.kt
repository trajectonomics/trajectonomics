package app.moojot.android

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

/**
 * The home-screen widget (#81): the Moo mascot, the jot streak, today's and this period's
 * spending, and two buttons (+ Jot, Scan).
 *
 * The web app writes a snapshot after every change ([save], via MainActivity's bridge); the
 * widget only draws it, so it works with the app closed and reads nothing else. Nothing can be
 * recorded without opening the app, so after midnight (or when the period ends) the new day (or
 * period) correctly starts at zero until the app opens again. With the app lock on, the
 * snapshot says to hide amounts and the widget shows dots instead.
 */
object MooWidget {
    private const val PREFS = "moojot_widget"
    private const val KEY_SNAPSHOT = "snapshot"

    const val ACTION_ADD = "app.moojot.android.WIDGET_ADD"
    const val ACTION_SCAN = "app.moojot.android.WIDGET_SCAN"

    /** Stores the app's snapshot (JSON from $lib/widget.ts) and redraws every widget. */
    fun save(context: Context, snapshotJson: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_SNAPSHOT, snapshotJson)
            .apply()
        refresh(context)
    }

    fun refresh(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, MooWidgetProvider::class.java))
        if (ids.isNotEmpty()) render(context, manager, ids)
    }

    fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, null)
        val snap = try {
            raw?.let { JSONObject(it) }
        } catch (_: Throwable) {
            null
        }
        val views = RemoteViews(context.packageName, R.layout.moo_widget)
        val today = DailyReminder.todayKey(Calendar.getInstance())

        if (snap == null) {
            // Placed before the app has run once: invite the person in.
            views.setTextViewText(R.id.widget_streak, "")
            views.setViewVisibility(R.id.widget_amounts, View.GONE)
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
        } else {
            val labels = snap.optJSONObject("labels") ?: JSONObject()
            val date = snap.optString("date")
            val sameDay = date == today
            val periodOver = today > snap.optString("periodEnd", "9999-12-31")
            val hide = snap.optBoolean("hideAmounts", false)
            val dots = "฿ ••••"
            val zero = snap.optString("zeroText", "฿0")

            views.setViewVisibility(R.id.widget_amounts, View.VISIBLE)
            views.setViewVisibility(R.id.widget_empty, View.GONE)
            views.setTextViewText(R.id.widget_today_label, labels.optString("today", "Today"))
            views.setTextViewText(R.id.widget_period_label, labels.optString("period", "This period"))
            views.setTextViewText(
                R.id.widget_today_value,
                if (hide) dots else if (sameDay) snap.optString("todayText", zero) else zero
            )
            views.setTextViewText(
                R.id.widget_period_value,
                if (hide) dots else if (periodOver) zero else snap.optString("periodText", zero)
            )
            // The streak survives a day with no jot yet: it breaks only after a whole day without one.
            val streak = if (date >= yesterday()) snap.optInt("streakDays", 0) else 0
            views.setTextViewText(
                R.id.widget_streak,
                if (streak > 0) labels.optString("streak", "🔥 {n}").replace("{n}", streak.toString()) else ""
            )
            views.setTextViewText(R.id.widget_add, labels.optString("add", "+ Jot"))
            views.setTextViewText(R.id.widget_scan, labels.optString("scan", "Scan"))
        }

        // "orange-black" is the retired name of the dark theme; a snapshot written before the
        // update keeps it until the app runs again.
        val theme = snap?.optString("theme")
        val dark = theme == "dark" || theme == "orange-black"
        views.setInt(
            R.id.widget_root,
            "setBackgroundResource",
            if (dark) R.drawable.widget_bg_dark else R.drawable.widget_bg_pink
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, null, 0))
        views.setOnClickPendingIntent(R.id.widget_add, openApp(context, ACTION_ADD, 1))
        views.setOnClickPendingIntent(R.id.widget_scan, openApp(context, ACTION_SCAN, 2))
        manager.updateAppWidget(ids, views)
    }

    private fun yesterday(): String {
        val c = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }
        return DailyReminder.todayKey(c)
    }

    private fun openApp(context: Context, action: String?, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .setAction(action ?: Intent.ACTION_MAIN)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(
            context,
            9100 + requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}

class MooWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        MooWidget.render(context, manager, ids)
    }
}
