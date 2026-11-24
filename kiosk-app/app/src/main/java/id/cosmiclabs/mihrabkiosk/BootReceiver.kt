package id.cosmiclabs.mihrabkiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BOOT_COMPLETED: nyalakan watchdog + buka MainActivity.
 * Di Android 6 (target STB) startActivity dari receiver masih diizinkan;
 * di Android 10+ jalurnya lewat Home/launcher (MainActivity terdaftar
 * sebagai HOME) bila startActivity dibatasi sistem.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        Log.i(TAG, "BOOT_COMPLETED: memulai kiosk")
        WatchdogService.start(context)
        WatchdogReceiver.schedule(context)
        try {
            val main = Intent(context, MainActivity::class.java)
            main.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(main)
        } catch (e: Exception) {
            Log.w(TAG, "startActivity setelah boot gagal: ${e.message}")
        }
    }

    companion object {
        const val TAG = "BootReceiver"
    }
}
