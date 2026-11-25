package app.moojot.android

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * The opt-in daily reminder (#80). The web app owns the setting (SQLite) and pushes it here with
 * [configure]; this side keeps a copy in SharedPreferences so the alarm can fire, and re-arm after
 * a reboot, with the app closed.
 *
 * "Smart": the web app calls [markJotted] when something is recorded or a slip scan finishes. On
 * a day with a jot the reminder stays quiet. Recurring records posted on their own don't count.
 *
 * The alarm is a 10-minute window (setWindow), so it needs no exact-alarm permission and arrives
 * at the chosen time or up to 10 minutes after; a plain inexact alarm can be an hour late on
 * Android 12+. Nothing here touches the network.
 */
object DailyReminder {
    private const val PREFS = "moojot_daily_reminder"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    private const val KEY_TITLE = "title"
    private const val KEY_BODY = "body"
    private const val KEY_LAST_JOT = "last_jot_date"

    const val CHANNEL_ID = "daily_reminder"
    private const val NOTIFICATION_ID = 8020
    private const val REQUEST_CODE = 8020

    /** How late Android may deliver the reminder (the shortest window it allows without exact alarms). */
    private const val WINDOW_MS = 10L * 60 * 1000

    /** A reminder delivered this long after its time (the phone was off or dozing) is dropped. */
    private const val LATE_LIMIT_MS = 3L * 60 * 60 * 1000

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun todayKey(now: Calendar = Calendar.getInstance()): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = now.timeZone }.format(now.time)

    /** Saves the setting and the notification text (in the app's language), then (re)arms or cancels. */
    fun configure(context: Context, enabled: Boolean, hour: Int, minute: Int, title: String, body: String) {
        prefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_HOUR, hour.coerceIn(0, 23))
            .putInt(KEY_MINUTE, minute.coerceIn(0, 59))
            .putString(KEY_TITLE, title)
            .putString(KEY_BODY, body)
            .apply()
        if (enabled) ensureChannel(context, title)
        schedule(context)
    }

    /** Something was recorded today (local date `yyyy-MM-dd`): no reminder today. */
    fun markJotted(context: Context, localDate: String) {
        prefs(context).edit().putString(KEY_LAST_JOT, localDate).apply()
        schedule(context)
    }

    fun hasNotificationPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * The next time to remind: today at the chosen time if that is still ahead and nothing was
     * jotted today, otherwise tomorrow at that time.
     */
    fun nextTrigger(now: Calendar, hour: Int, minute: Int, jottedToday: Boolean): Long {
        val at = (now.clone() as Calendar).apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (jottedToday || !at.after(now)) at.add(Calendar.DAY_OF_YEAR, 1)
        return at.timeInMillis
    }

    /** Arms the next reminder, or cancels it when the reminder is off. */
    fun schedule(context: Context) {
        val p = prefs(context)
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = alarmIntent(context)
        alarms.cancel(pending)
        if (!p.getBoolean(KEY_ENABLED, false)) return
        val now = Calendar.getInstance()
        val trigger = nextTrigger(
            now,
            p.getInt(KEY_HOUR, 20),
            p.getInt(KEY_MINUTE, 0),
            p.getString(KEY_LAST_JOT, null) == todayKey(now)
        )
        alarms.setWindow(AlarmManager.RTC_WAKEUP, trigger, WINDOW_MS, pending)
    }

    /** The alarm went off: remind unless today already has a jot, then arm tomorrow's. */
    fun onAlarm(context: Context) {
        val p = prefs(context)
        if (p.getBoolean(KEY_ENABLED, false)) {
            val now = Calendar.getInstance()
            val due = (now.clone() as Calendar).apply {
                set(Calendar.HOUR_OF_DAY, p.getInt(KEY_HOUR, 20))
                set(Calendar.MINUTE, p.getInt(KEY_MINUTE, 0))
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val late = now.timeInMillis - due.timeInMillis
            val jottedToday = p.getString(KEY_LAST_JOT, null) == todayKey(now)
            if (!jottedToday && late in 0..LATE_LIMIT_MS) notify(context)
        }
        schedule(context)
    }

    private fun notify(context: Context) {
        if (!hasNotificationPermission(context)) return
        val p = prefs(context)
        val title = p.getString(KEY_TITLE, null) ?: "MooJot"
        ensureChannel(context, title)
        val open = PendingIntent.getActivity(
            context,
            REQUEST_CODE,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_moojot)
            .setContentTitle(title)
            .setContentText(p.getString(KEY_BODY, null) ?: "")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
            // The permission was revoked between the check and the post.
        }
    }

    private fun ensureChannel(context: Context, name: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_DEFAULT)
        )
    }

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        REQUEST_CODE,
        Intent(context, DailyReminderReceiver::class.java).setAction(DailyReminderReceiver.ACTION_REMIND),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
}

/** Fires the reminder, and re-arms it after a reboot, an app update or a clock change. */
class DailyReminderReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_REMIND = "app.moojot.android.DAILY_REMINDER"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_REMIND -> DailyReminder.onAlarm(context)
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> DailyReminder.schedule(context)
        }
    }
}
