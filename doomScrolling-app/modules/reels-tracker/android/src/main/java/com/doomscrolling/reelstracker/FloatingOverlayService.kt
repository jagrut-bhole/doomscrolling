package com.doomscrolling.reelstracker

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

class FloatingOverlayService : Service() {
    companion object {
        const val ACTION_SHOW = "com.doomscrolling.ACTION_SHOW_OVERLAY"
        const val ACTION_HIDE = "com.doomscrolling.ACTION_HIDE_OVERLAY"
        const val ACTION_UPDATE_COUNT = "com.doomscrolling.ACTION_UPDATE_COUNT"
        const val EXTRA_COUNT = "extra_count"

        private var isShowing = false
        fun isVisible(): Boolean = isShowing
    }

    private val tag = "FloatingOverlayService"
    private var windowManager: WindowManager? = null
    private var overlayView: LinearLayout? = null
    private var countTextView: TextView? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY
        val count = intent.getIntExtra(EXTRA_COUNT, 0)

        when (action) {
            ACTION_SHOW -> showOverlay(count)
            ACTION_UPDATE_COUNT -> updateCount(count)
            ACTION_HIDE -> hideOverlay()
        }

        return START_NOT_STICKY
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun showOverlay(initialCount: Int) {
        if (!Settings.canDrawOverlays(this)) {
            Log.w(tag, "Cannot display overlay: SYSTEM_ALERT_WINDOW permission not granted")
            return
        }

        if (overlayView != null) {
            updateCount(initialCount)
            return
        }

        try {
            val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 60
                y = 160
            }

            // Create pill container layout
            val container = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                val dp8 = dpToPx(8)
                val dp14 = dpToPx(14)
                setPadding(dp14, dp8, dp14, dp8)

                // Sleek pill background with rounded corners and semi-translucent dark finish
                val shape = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = dpToPx(24).toFloat()
                    setColor(Color.parseColor("#E6111827")) // Modern slate/dark with 90% opacity
                    setStroke(dpToPx(1), Color.parseColor("#33FFFFFF"))
                }
                background = shape
                elevation = dpToPx(6).toFloat()
            }

            // Emoji icon
            val emojiView = TextView(this).apply {
                text = "🫠"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                val dp6 = dpToPx(6)
                setPadding(0, 0, dp6, 0)
            }
            container.addView(emojiView)

            // Reel counter text
            countTextView = TextView(this).apply {
                text = "$initialCount Reels"
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            }
            container.addView(countTextView)

            // Make the pill draggable across the screen
            var initialX = 0
            var initialY = 0
            var initialTouchX = 0f
            var initialTouchY = 0f

            container.setOnTouchListener { _, event ->
                val params = layoutParams ?: return@setOnTouchListener false
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = initialX + (event.rawX - initialTouchX).toInt()
                        params.y = initialY + (event.rawY - initialTouchY).toInt()
                        try {
                            windowManager?.updateViewLayout(overlayView, params)
                        } catch (e: Exception) {
                            Log.e(tag, "Error updating overlay layout: ${e.message}")
                        }
                        true
                    }
                    else -> false
                }
            }

            overlayView = container
            windowManager?.addView(container, layoutParams)
            isShowing = true
            Log.d(tag, "Floating overlay displayed successfully with initial count: $initialCount")
        } catch (e: Exception) {
            Log.e(tag, "Failed to create floating overlay: ${e.message}")
        }
    }

    private fun updateCount(count: Int) {
        countTextView?.text = "$count Reels"
    }

    private fun hideOverlay() {
        if (overlayView != null) {
            try {
                windowManager?.removeView(overlayView)
                Log.d(tag, "Floating overlay removed")
            } catch (e: Exception) {
                Log.e(tag, "Error removing overlay view: ${e.message}")
            } finally {
                overlayView = null
                countTextView = null
                isShowing = false
            }
        }
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    override fun onDestroy() {
        hideOverlay()
        super.onDestroy()
    }
}
