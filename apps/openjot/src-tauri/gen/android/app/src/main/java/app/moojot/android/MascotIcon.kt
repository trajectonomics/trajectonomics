package app.moojot.android

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

/**
 * The Mascot setting ("robot" or "moo") and the launcher icon that follows it.
 *
 * The web app owns the setting; [save] is called from MainActivity's JS bridge when the
 * person picks a mascot. The icon itself is two activity-aliases in AndroidManifest.xml,
 * one per mascot: only one may be enabled at a time, and [applyLauncherIcon] switches them
 * from MainActivity.onStop, because changing an enabled launcher alias while the task is in
 * the foreground can close the app on some Android versions.
 *
 * The SharedPreferences file is a new identifier, so it is `openjot_mascot` rather than one
 * of the `moojot_*` names that predate the rename (rule 6 in AGENTS.md).
 */
object MascotIcon {
    private const val TAG = "MascotIcon"
    private const val PREFS = "openjot_mascot"
    private const val KEY_MASCOT = "mascot"

    const val ROBOT = "robot"
    const val MOO = "moo"

    /** Stores the person's choice; anything that is not a mascot is ignored. */
    fun save(context: Context, mascot: String) {
        if (mascot != ROBOT && mascot != MOO) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_MASCOT, mascot)
            .apply()
    }

    /** The saved mascot, defaulting to the robot of a new install. */
    fun current(context: Context): String {
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_MASCOT, ROBOT)
        return if (saved == MOO) MOO else ROBOT
    }

    /** Enables the alias for the saved mascot and disables the other one, if needed. */
    fun applyLauncherIcon(context: Context) {
        val wanted = current(context)
        val manager = context.packageManager
        val robot = ComponentName(context, "app.moojot.android.LauncherRobot")
        val moo = ComponentName(context, "app.moojot.android.LauncherMoo")
        try {
            // Enable the new entry before disabling the old one, so there is never a
            // moment with no launcher entry at all.
            if (wanted == ROBOT) {
                setEnabled(manager, robot, true, manifestDefault = true)
                setEnabled(manager, moo, false, manifestDefault = false)
            } else {
                setEnabled(manager, moo, true, manifestDefault = false)
                setEnabled(manager, robot, false, manifestDefault = true)
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Could not switch the launcher icon to $wanted", e)
        }
    }

    private fun setEnabled(
        manager: PackageManager,
        component: ComponentName,
        enabled: Boolean,
        manifestDefault: Boolean,
    ) {
        val state = manager.getComponentEnabledSetting(component)
        val currentlyEnabled = if (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) {
            // DEFAULT means "whatever the manifest says": robot enabled, moo disabled.
            manifestDefault
        } else {
            state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        }
        if (currentlyEnabled == enabled) return
        val target = if (enabled) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        // DONT_KILL_APP: the icon changes as the person leaves, not by restarting the app.
        manager.setComponentEnabledSetting(component, target, PackageManager.DONT_KILL_APP)
    }
}
