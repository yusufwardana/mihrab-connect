package id.cosmiclabs.mihrabkiosk

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log

/**
 * Dipanggil AlarmManager tiap 60 detik: pastikan WatchdogService jalan,
 * lalu jadwalkan ulang alarm. Juga dipakai sekali saat boot.
 */
class WatchdogReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "WatchdogReceiver: memastikan service jalan")
        WatchdogService.start(context)
        schedule(context)
    }

    companion object {
        const val TAG = "WatchdogReceiver"
        const val INTERVAL_MS = 60_000L
        private const val REQUEST_CODE = 9001

        fun schedule(context: Context) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, WatchdogReceiver::class.java)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_IMMUTABLE
                } else {
                    0
                }
            val pi = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
            am.setRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + INTERVAL_MS,
                INTERVAL_MS,
                pi
            )
        }
    }
}
