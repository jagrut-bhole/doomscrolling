package com.doomscrolling.reelstracker

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log

class TrackingDatabaseHelper(private val context: Context) {
    private val tag = "TrackingDBHelper"
    private val dbName = "doomscrolling.db"

    private fun getReadableOrWritableDatabase(): SQLiteDatabase? {
        return try {
            // Opens or creates the SQLite database in the app's internal storage
            context.openOrCreateDatabase(dbName, Context.MODE_PRIVATE, null).apply {
                execSQL("PRAGMA foreign_keys = ON;")
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to open SQLite database: ${e.message}")
            null
        }
    }

    fun startSession(startedAtIso: String): Long {
        val db = getReadableOrWritableDatabase() ?: return -1L
        return try {
            val values = ContentValues().apply {
                put("started_at", startedAtIso)
                putNull("ended_at")
                put("duration_seconds", 0)
                put("reels_count", 0)
                put("created_at", startedAtIso)
            }
            val id = db.insert("sessions", null, values)
            Log.d(tag, "Created new tracking session ID: $id")
            id
        } catch (e: Exception) {
            Log.e(tag, "Error inserting session: ${e.message}")
            -1L
        } finally {
            try { db.close() } catch (_: Exception) {}
        }
    }

    fun recordReelEvent(sessionId: Long, watchedAtIso: String) {
        if (sessionId <= 0) return
        val db = getReadableOrWritableDatabase() ?: return
        try {
            val values = ContentValues().apply {
                put("session_id", sessionId)
                put("watched_at", watchedAtIso)
            }
            db.insert("reel_events", null, values)
            Log.d(tag, "Recorded reel event for session $sessionId")
        } catch (e: Exception) {
            Log.e(tag, "Error inserting reel event: ${e.message}")
        } finally {
            try { db.close() } catch (_: Exception) {}
        }
    }

    fun updateProgress(sessionId: Long, durationSeconds: Long, reelsCount: Int) {
        if (sessionId <= 0) return
        val db = getReadableOrWritableDatabase() ?: return
        try {
            val values = ContentValues().apply {
                put("duration_seconds", durationSeconds)
                put("reels_count", reelsCount)
            }
            db.update("sessions", values, "id = ?", arrayOf(sessionId.toString()))
        } catch (e: Exception) {
            Log.e(tag, "Error updating session progress: ${e.message}")
        } finally {
            try { db.close() } catch (_: Exception) {}
        }
    }

    fun closeSession(sessionId: Long, endedAtIso: String, durationSeconds: Long, reelsCount: Int) {
        if (sessionId <= 0) return
        val db = getReadableOrWritableDatabase() ?: return
        try {
            val values = ContentValues().apply {
                put("ended_at", endedAtIso)
                put("duration_seconds", durationSeconds)
                put("reels_count", reelsCount)
            }
            db.update("sessions", values, "id = ?", arrayOf(sessionId.toString()))
            Log.d(tag, "Closed tracking session $sessionId ($durationSeconds s, $reelsCount reels)")
        } catch (e: Exception) {
            Log.e(tag, "Error closing session: ${e.message}")
        } finally {
            try { db.close() } catch (_: Exception) {}
        }
    }
}
