package id.cosmiclabs.mihrabkiosk

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast

/**
 * Layar pengaturan lokal di STB (dilindungi PIN, dibuka dari MainActivity).
 * Mengubah URL lokal, interval refresh, dan PIN. Perubahan URL/refresh
 * diterapkan MainActivity saat onResume.
 */
class SettingsActivity : Activity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var etUrl: EditText
    private lateinit var etRefresh: EditText
    private lateinit var etPinLama: EditText
    private lateinit var etPinBaru: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        prefs = getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE)

        etUrl = findViewById(R.id.et_url)
        etRefresh = findViewById(R.id.et_refresh)
        etPinLama = findViewById(R.id.et_pin_lama)
        etPinBaru = findViewById(R.id.et_pin_baru)

        etUrl.setText(prefs.getString(MainActivity.KEY_LOCAL_URL, "") ?: "")
        val localRefresh = prefs.getInt(MainActivity.KEY_LOCAL_REFRESH, 0)
        etRefresh.setText(if (localRefresh > 0) localRefresh.toString() else "")

        findViewById<Button>(R.id.btn_simpan).setOnClickListener { simpan() }
        findViewById<Button>(R.id.btn_muat_ulang).setOnClickListener {
            Toast.makeText(this, getString(R.string.board_dimuat_ulang), Toast.LENGTH_SHORT).show()
            finish()
        }
        findViewById<Button>(R.id.btn_reboot).setOnClickListener { konfirmasiReboot() }
        findViewById<Button>(R.id.btn_kembali).setOnClickListener { finish() }
    }

    private fun simpan() {
        val url = etUrl.text.toString().trim()
        if (url.isNotEmpty() && !(url.startsWith("http://") || url.startsWith("https://"))) {
            Toast.makeText(this, getString(R.string.url_tidak_valid), Toast.LENGTH_SHORT).show()
            return
        }
        val refreshText = etRefresh.text.toString().trim()
        val refresh = refreshText.toIntOrNull() ?: 0
        if (refreshText.isNotEmpty() && (refresh < 60 || refresh > 3600)) {
            Toast.makeText(this, getString(R.string.refresh_tidak_valid), Toast.LENGTH_SHORT).show()
            return
        }

        val pinLama = etPinLama.text.toString()
        val pinBaru = etPinBaru.text.toString()
        val editor = prefs.edit()
        editor.putString(MainActivity.KEY_LOCAL_URL, url)
        editor.putInt(MainActivity.KEY_LOCAL_REFRESH, refresh)

        if (pinBaru.isNotEmpty()) {
            val savedPin = prefs.getString(MainActivity.KEY_PIN, MainActivity.DEFAULT_PIN)
            if (pinLama != savedPin) {
                Toast.makeText(this, getString(R.string.pin_salah), Toast.LENGTH_SHORT).show()
                return
            }
            if (pinBaru.length < 4) {
                Toast.makeText(this, getString(R.string.pin_minimal), Toast.LENGTH_SHORT).show()
                return
            }
            editor.putString(MainActivity.KEY_PIN, pinBaru)
        }

        editor.apply()
        Toast.makeText(this, getString(R.string.pengaturan_disimpan), Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun konfirmasiReboot() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.reboot_title))
            .setMessage(getString(R.string.reboot_message))
            .setPositiveButton(getString(R.string.reboot_ya)) { _, _ ->
                try {
                    Runtime.getRuntime().exec(arrayOf("su", "-c", "reboot"))
                } catch (e: Exception) {
                    Toast.makeText(
                        this,
                        getString(R.string.reboot_gagal, e.message ?: "?"),
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
            .setNegativeButton(getString(R.string.batal), null)
            .show()
    }
}
