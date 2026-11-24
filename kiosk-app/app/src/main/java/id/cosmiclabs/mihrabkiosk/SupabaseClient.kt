package id.cosmiclabs.mihrabkiosk

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Klien Supabase REST minimal: HttpURLConnection + org.json saja.
 * Hanya memakai anon key (publik by design). TIDAK PERNAH service_role.
 */
object SupabaseClient {
    private const val TAG = "SupabaseClient"
    const val BASE_URL = "https://rxslkuavzquhfqpycthb.supabase.co"
    const val ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4c2xrdWF2enF1aGZxcHljdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMzgwODYsImV4cCI6MjExMDkxNDA4Nn0.EedelAUTQwzfzqi8q_eqBw2Gr2Xdf4kGX9WEt8m9jno"

    private const val CONNECT_TIMEOUT = 10_000
    private const val READ_TIMEOUT = 15_000

    data class KioskConfig(val startUrl: String, val refreshSeconds: Int)
    data class KioskCommand(val id: String, val perintah: String, val payload: JSONObject?)

    fun nowIso(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date())
    }

    private fun open(path: String, method: String, body: String? = null): Pair<Int, String> {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$BASE_URL$path")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = method
            conn.connectTimeout = CONNECT_TIMEOUT
            conn.readTimeout = READ_TIMEOUT
            conn.setRequestProperty("apikey", ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $ANON_KEY")
            conn.setRequestProperty("Content-Type", "application/json")
            if (body != null) {
                conn.doOutput = true
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = if (stream != null) {
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
            } else {
                ""
            }
            return code to text
        } finally {
            conn?.disconnect()
        }
    }

    /** GET /rest/v1/kiosk_config?id=eq.default — kembalikan null bila gagal. */
    fun getConfig(): KioskConfig? {
        return try {
            val (code, text) = open("/rest/v1/kiosk_config?id=eq.default&select=start_url,refresh_seconds", "GET")
            if (code != 200) {
                Log.w(TAG, "getConfig HTTP $code: $text")
                return null
            }
            val arr = JSONArray(text)
            if (arr.length() == 0) return null
            val row = arr.getJSONObject(0)
            KioskConfig(
                startUrl = row.getString("start_url"),
                refreshSeconds = row.optInt("refresh_seconds", 300)
            )
        } catch (e: Exception) {
            Log.w(TAG, "getConfig gagal: ${e.message}")
            null
        }
    }

    /** GET perintah menunggu untuk device ini (maks 5, terlama dulu). */
    fun getPendingCommands(deviceId: String): List<KioskCommand> {
        return try {
            val did = URLEncoder.encode(deviceId, "UTF-8")
            val (code, text) = open(
                "/rest/v1/kiosk_commands?device_id=eq.$did&status=eq.menunggu&order=created_at.asc&limit=5&select=id,perintah,payload",
                "GET"
            )
            if (code != 200) {
                Log.w(TAG, "getPendingCommands HTTP $code: $text")
                return emptyList()
            }
            val arr = JSONArray(text)
            val out = ArrayList<KioskCommand>(arr.length())
            for (i in 0 until arr.length()) {
                val row = arr.getJSONObject(i)
                out.add(
                    KioskCommand(
                        id = row.getString("id"),
                        perintah = row.getString("perintah"),
                        payload = if (row.isNull("payload")) null else row.getJSONObject("payload")
                    )
                )
            }
            out
        } catch (e: Exception) {
            Log.w(TAG, "getPendingCommands gagal: ${e.message}")
            emptyList()
        }
    }

    /** PATCH status satu perintah. Kembalikan true bila HTTP 2xx. */
    fun setCommandStatus(commandId: String, status: String): Boolean {
        return try {
            val body = JSONObject()
            body.put("status", status)
            if (status == "dijalankan") body.put("dijalankan_pada", nowIso())
            val (code, text) = open(
                "/rest/v1/kiosk_commands?id=eq.$commandId",
                "PATCH",
                body.toString()
            )
            if (code !in 200..299) Log.w(TAG, "setCommandStatus HTTP $code: $text")
            code in 200..299
        } catch (e: Exception) {
            Log.w(TAG, "setCommandStatus gagal: ${e.message}")
            false
        }
    }

    /** Upsert heartbeat ke kiosk_status (PostgREST merge-duplicates). */
    fun upsertStatus(
        deviceId: String,
        appVersion: String,
        currentUrl: String,
        online: Boolean,
        androidVersion: String
    ): Boolean {
        return try {
            val body = JSONObject()
            body.put("device_id", deviceId)
            body.put("app_version", appVersion)
            body.put("current_url", currentUrl)
            body.put("online", online)
            body.put("last_seen", nowIso())
            body.put("android_version", androidVersion)
            body.put("updated_at", nowIso())
            // Upsert PostgREST: Prefer resolution=merge-duplicates. Bila server
            // tetap mengembalikan 409, lanjutkan dengan PATCH eksplisit.
            val (code, text) = openWithPrefer(
                "/rest/v1/kiosk_status",
                "POST",
                body.toString(),
                "resolution=merge-duplicates,return=minimal"
            )
            if (code in 200..299) return true
            if (code == 409) {
                val (code2, text2) = open(
                    "/rest/v1/kiosk_status?device_id=eq.${URLEncoder.encode(deviceId, "UTF-8")}",
                    "PATCH",
                    body.toString()
                )
                if (code2 !in 200..299) Log.w(TAG, "upsertStatus PATCH HTTP $code2: $text2")
                return code2 in 200..299
            }
            Log.w(TAG, "upsertStatus HTTP $code: $text")
            false
        } catch (e: Exception) {
            Log.w(TAG, "upsertStatus gagal: ${e.message}")
            false
        }
    }

    private fun openWithPrefer(path: String, method: String, body: String?, prefer: String): Pair<Int, String> {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$BASE_URL$path")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = method
            conn.connectTimeout = CONNECT_TIMEOUT
            conn.readTimeout = READ_TIMEOUT
            conn.setRequestProperty("apikey", ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $ANON_KEY")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Prefer", prefer)
            if (body != null) {
                conn.doOutput = true
                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = if (stream != null) {
                BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
            } else {
                ""
            }
            return code to text
        } finally {
            conn?.disconnect()
        }
    }
}
