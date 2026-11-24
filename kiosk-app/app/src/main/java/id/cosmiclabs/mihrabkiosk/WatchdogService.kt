package id.cosmiclabs.mihrabkiosk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

/**
 * Foreground service (sticky) yang memantau MainActivity tetap hidup.
 * Bila heartbeat MainActivity basi > 90 detik, activity diluncurkan ulang.
 * Service sendiri dijaga oleh AlarmManager (WatchdogReceiver tiap 60 detik)
 * dan START_STICKY bila sistem mematikannya.
 */
class WatchdogService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private val checkRunnable = object : Runnable {
        override fun run() {
            try {
                val age = System.currentTimeMillis() - MainActivity.lastHeartbeatMs
                if (age > STALE_MS) {
                    Log.w(TAG, "MainActivity basi ${age}ms — meluncurkan ulang")
                    val intent = Intent(this@WatchdogService, MainActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Watchdog check gagal: ${e.message}")
            }
            handler.postDelayed(this, CHECK_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, buildNotification())
        handler.postDelayed(checkRunnable, CHECK_INTERVAL_MS)
        Log.i(TAG, "WatchdogService jalan")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(checkRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Mihrab Kiosk",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "Menjaga Board masjid tetap tampil"
            nm.createNotificationChannel(channel)
        }
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("Mihrab Kiosk berjalan")
            .setContentText("COSMICLABS • Mihrab Kiosk — menjaga Board tetap tampil")
            .setSmallIcon(R.drawable.ic_launcher)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val TAG = "WatchdogService"
        const val CHANNEL_ID = "mihrab_kiosk_watchdog"
        const val NOTIF_ID = 1001
        const val CHECK_INTERVAL_MS = 30_000L
        const val STALE_MS = 90_000L

        fun start(context: Context) {
            val intent = Intent(context, WatchdogService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "start WatchdogService gagal: ${e.message}")
            }
        }
    }
}
