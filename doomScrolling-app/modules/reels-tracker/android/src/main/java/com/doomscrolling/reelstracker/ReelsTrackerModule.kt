package com.doomscrolling.reelstracker

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ReelsTrackerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ReelsTracker")

        AsyncFunction("checkPermissions") {
            val context = appContext.reactContext ?: return@AsyncFunction mapOf(
                "usageAccess" to false,
                "accessibility" to false,
                "overlay" to false
            )

            val usageAccess = hasUsageStatsPermission(context)
            val accessibility = isAccessibilityServiceEnabled(context)
            val overlay = Settings.canDrawOverlays(context)

            mapOf(
                "usageAccess" to usageAccess,
                "accessibility" to accessibility,
                "overlay" to overlay
            )
        }

        AsyncFunction("openUsageAccessSettings") {
            val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction null
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }

        AsyncFunction("openAccessibilitySettings") {
            val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction null
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }

        AsyncFunction("openOverlaySettings") {
            val context = appContext.currentActivity ?: appContext.reactContext ?: return@AsyncFunction null
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName)
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }

        AsyncFunction("showOverlay") { count: Int ->
            val context = appContext.reactContext ?: return@AsyncFunction
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = FloatingOverlayService.ACTION_SHOW
                putExtra(FloatingOverlayService.EXTRA_COUNT, count)
            }
            context.startService(intent)
        }

        AsyncFunction("hideOverlay") {
            val context = appContext.reactContext ?: return@AsyncFunction null
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = FloatingOverlayService.ACTION_HIDE
            }
            context.startService(intent)
        }

        AsyncFunction("updateOverlayCount") { count: Int ->
            val context = appContext.reactContext ?: return@AsyncFunction
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = FloatingOverlayService.ACTION_UPDATE_COUNT
                putExtra(FloatingOverlayService.EXTRA_COUNT, count)
            }
            context.startService(intent)
        }
    }

    private fun hasUsageStatsPermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val expectedComponentName = ComponentName(context, ReelsAccessibilityService::class.java)
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)

        while (colonSplitter.hasNext()) {
            val componentNameString = colonSplitter.next()
            val enabledComponent = ComponentName.unflattenFromString(componentNameString)
            if (enabledComponent != null && enabledComponent == expectedComponentName) {
                return true
            }
        }
        return false
    }
}
