package com.doomscrolling.reelstracker

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ReelsAccessibilityService : AccessibilityService() {
    companion object {
        const val INSTAGRAM_PACKAGE = "com.instagram.android"
        private var isServiceActive = false
        fun isRunning(): Boolean = isServiceActive
    }

    private val tag = "ReelsAccessibility"
    private lateinit var dbHelper: TrackingDatabaseHelper

    // Session tracking state
    private var isInsideReels = false
    private var currentSessionId: Long = -1L
    private var sessionStartMonotonic: Long = 0L
    private var sessionStartWallIso: String = ""
    private var currentReelsCount = 0

    // Debouncing reel transitions
    private var lastTransitionMonotonic: Long = 0L
    private val debounceThresholdMs = 1200L // 1.2 seconds debounce window

    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                Log.d(tag, "Screen turned off. Ending any ongoing Reels session.")
                endSession()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        dbHelper = TrackingDatabaseHelper(this)
        val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
        registerReceiver(screenStateReceiver, filter)
        isServiceActive = true
        Log.d(tag, "ReelsAccessibilityService created and listening")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return

        // If user left Instagram completely, end session and hide overlay
        if (packageName != INSTAGRAM_PACKAGE) {
            if (isInsideReels) {
                Log.d(tag, "User navigated away from Instagram ($packageName). Ending session.")
                endSession()
            }
            return
        }

        // Inside Instagram: evaluate whether the current screen is Reels
        val isCurrentlyInReels = inspectIfReelsScreen(rootInActiveWindow)

        if (isCurrentlyInReels) {
            if (!isInsideReels) {
                // User just entered Reels
                startNewSession()
            }

            // Check for scroll or transition event
            if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED ||
                event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                handlePotentialReelTransition()
            }
        } else {
            // Still in Instagram, but moved to Feed, Direct, Profile, etc.
            if (isInsideReels) {
                Log.d(tag, "User left Reels tab for other Instagram screen. Ending session.")
                endSession()
            }
        }
    }

    private fun inspectIfReelsScreen(rootNode: AccessibilityNodeInfo?): Boolean {
        if (rootNode == null) return false

        try {
            var hasReelsClues = false
            val nodesToCheck = ArrayDeque<AccessibilityNodeInfo>()
            nodesToCheck.add(rootNode)

            var inspectedCount = 0
            val maxNodes = 60 // Cap recursion depth for smooth performance

            while (nodesToCheck.isNotEmpty() && inspectedCount < maxNodes) {
                val node = nodesToCheck.removeFirst()
                inspectedCount++

                val desc = node.contentDescription?.toString()?.lowercase(Locale.ROOT) ?: ""
                val text = node.text?.toString()?.lowercase(Locale.ROOT) ?: ""

                // Heuristic matches: Reels indicators in Instagram UI
                if (desc.contains("reel by") ||
                    desc.contains("reels") ||
                    desc.contains("remix with") ||
                    desc.contains("original audio") ||
                    text.contains("original audio") ||
                    desc.contains("watch reels") ||
                    text.contains("reels")) {
                    hasReelsClues = true
                    break
                }

                for (i in 0 until node.childCount) {
                    val child = node.getChild(i)
                    if (child != null) {
                        nodesToCheck.add(child)
                    }
                }
            }

            return hasReelsClues
        } catch (e: Exception) {
            Log.e(tag, "Error inspecting node hierarchy: ${e.message}")
            return false
        }
    }

    private fun handlePotentialReelTransition() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastTransitionMonotonic >= debounceThresholdMs) {
            lastTransitionMonotonic = now
            currentReelsCount++

            val nowIso = getIsoTimestamp()
            dbHelper.recordReelEvent(currentSessionId, nowIso)

            val elapsedSec = (now - sessionStartMonotonic) / 1000
            dbHelper.updateProgress(currentSessionId, elapsedSec, currentReelsCount)

            // Update floating overlay pill
            val updateIntent = Intent(this, FloatingOverlayService::class.java).apply {
                action = FloatingOverlayService.ACTION_UPDATE_COUNT
                putExtra(FloatingOverlayService.EXTRA_COUNT, currentReelsCount)
            }
            startService(updateIntent)

            Log.d(tag, "New Reel transition detected. Session total: $currentReelsCount")
        }
    }

    private fun startNewSession() {
        isInsideReels = true
        currentReelsCount = 0
        sessionStartMonotonic = SystemClock.elapsedRealtime()
        lastTransitionMonotonic = sessionStartMonotonic
        sessionStartWallIso = getIsoTimestamp()

        currentSessionId = dbHelper.startSession(sessionStartWallIso)

        // Show floating overlay
        val showIntent = Intent(this, FloatingOverlayService::class.java).apply {
            action = FloatingOverlayService.ACTION_SHOW
            putExtra(FloatingOverlayService.EXTRA_COUNT, 0)
        }
        startService(showIntent)

        Log.d(tag, "Reels session started with ID: $currentSessionId")
    }

    private fun endSession() {
        if (!isInsideReels) return
        isInsideReels = false

        val elapsedSec = (SystemClock.elapsedRealtime() - sessionStartMonotonic) / 1000
        val endIso = getIsoTimestamp()

        dbHelper.closeSession(currentSessionId, endIso, elapsedSec, currentReelsCount)

        // Hide floating overlay
        val hideIntent = Intent(this, FloatingOverlayService::class.java).apply {
            action = FloatingOverlayService.ACTION_HIDE
        }
        startService(hideIntent)

        currentSessionId = -1L
        currentReelsCount = 0
        Log.d(tag, "Reels session closed. Total duration: $elapsedSec s")
    }

    private fun getIsoTimestamp(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    override fun onInterrupt() {
        Log.w(tag, "Accessibility Service interrupted")
        endSession()
    }

    override fun onDestroy() {
        endSession()
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (_: Exception) {}
        isServiceActive = false
        super.onDestroy()
    }
}
