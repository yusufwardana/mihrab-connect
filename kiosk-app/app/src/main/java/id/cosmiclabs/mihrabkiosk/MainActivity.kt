package id.cosmiclabs.mihrabkiosk

import android.annotation.SuppressLint
import android.annotation.TargetApi
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Activity utama: WebView Board fullscreen permanen + polling Supabase
 * (config, perintah, heartbeat) + watchdog heartbeat + auto refresh.
 */
class MainActivity : Activity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var webContainer: FrameLayout
    private lateinit var splash: View
    private lateinit var offlineBanner: TextView
    private var webView: WebView? = null

    private val uiHandler = Handler(Looper.getMainLooper())
    private val netExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    @Volatile
    private var isOnline = true
    private var currentUrl: String = DEFAULT_URL
    private var refreshSeconds: Int = DEFAULT_REFRESH_SECONDS
    private var remoteConfig: SupabaseClient.KioskConfig? = null
    private var splashHidden = false
    private var tapCount = 0
    private var firstTapMs = 0L

    private val deviceId: String by lazy {
        Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
    }

    // ---- polling loops ----
    private val configRunnable = object : Runnable {
        override fun run() {
            fetchConfig()
            uiHandler.postDelayed(this, CONFIG_INTERVAL_MS)
        }
    }
    private val commandRunnable = object : Runnable {
        override fun run() {
            fetchCommands()
            uiHandler.postDelayed(this, COMMAND_INTERVAL_MS)
        }
    }
    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            sendHeartbeat()
            uiHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }
    private val refreshRunnable = object : Runnable {
        override fun run() {
            Log.d(TAG, "Auto refresh: memuat ulang Board")
            webView?.reload()
            scheduleRefresh()
        }
    }
    private val heartbeatTickRunnable = object : Runnable {
        override fun run() {
            lastHeartbeatMs = System.currentTimeMillis()
            uiHandler.postDelayed(this, HEARTBEAT_TICK_MS)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        webContainer = findViewById(R.id.web_container)
        splash = findViewById(R.id.splash)
        offlineBanner = findViewById(R.id.offline_banner)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        applyFullscreen()

        isOnline = initialOnline()
        createWebView()
        loadUrl(effectiveUrl())

        findViewById<View>(R.id.tap_corner).setOnClickListener { onCornerTap() }

        registerNetworkCallback()
        WatchdogService.start(this)
        WatchdogReceiver.schedule(this)

        uiHandler.post(heartbeatTickRunnable)
        uiHandler.post(configRunnable)
        uiHandler.post(commandRunnable)
        uiHandler.post(heartbeatRunnable)
        scheduleRefresh()
    }

    override fun onResume() {
        super.onResume()
        applyFullscreen()
        // Terapkan perubahan dari layar pengaturan (URL lokal / PIN / refresh).
        val localUrl = prefs.getString(KEY_LOCAL_URL, "")?.trim().orEmpty()
        val localRefresh = prefs.getInt(KEY_LOCAL_REFRESH, 0)
        var changed = false
        if (localRefresh > 0 && localRefresh != refreshSeconds) {
            refreshSeconds = localRefresh
            changed = true
        }
        val target = effectiveUrl()
        if (target != currentUrl) {
            loadUrl(target)
            changed = true
        }
        if (changed) scheduleRefresh()
        webView?.onResume()
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyFullscreen()
    }

    override fun onBackPressed() {
        // Di kiosk: tombol Back tidak boleh keluar dari Board.
    }

    override fun onDestroy() {
        uiHandler.removeCallbacks(configRunnable)
        uiHandler.removeCallbacks(commandRunnable)
        uiHandler.removeCallbacks(heartbeatRunnable)
        uiHandler.removeCallbacks(refreshRunnable)
        uiHandler.removeCallbacks(heartbeatTickRunnable)
        netExecutor.shutdownNow()
        webView?.destroy()
        super.onDestroy()
    }

    // ---- fullscreen ----
    private fun applyFullscreen() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    // ---- WebView ----
    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        val wv = WebView(this)
        val s: WebSettings = wv.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        // AppCache (setAppCacheEnabled/setAppCachePath) sudah DIHAPUS dari
        // API WebSettings di compileSdk 34 — Chromium mematikan AppCache.
        // Cache offline tetap jalan lewat HTTP cache WebView + DOM storage
        // (LOAD_CACHE_ELSE_NETWORK saat offline).
        s.cacheMode = if (isOnline) WebSettings.LOAD_DEFAULT else WebSettings.LOAD_CACHE_ELSE_NETWORK
        s.mediaPlaybackRequiresUserGesture = false
        s.useWideViewPort = true
        s.loadWithOverviewMode = true
        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                return false // semua tautan tetap di WebView
            }

            @TargetApi(Build.VERSION_CODES.N)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return false
            }

            override fun onPageFinished(view: WebView, url: String) {
                if (!splashHidden) {
                    splashHidden = true
                    splash.visibility = View.GONE
                }
            }

            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String,
                failingUrl: String
            ) {
                Log.w(TAG, "WebView error $errorCode: $description ($failingUrl)")
            }

            @TargetApi(Build.VERSION_CODES.O)
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                Log.w(TAG, "WebView render process gone (crash=${detail.didCrash()}) — membuat ulang WebView")
                runOnUiThread { recreateWebView() }
                return true
            }
        }
        webContainer.addView(wv, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        webView = wv
    }

    private fun recreateWebView() {
        try {
            webView?.let { old ->
                webContainer.removeView(old)
                old.destroy()
            }
        } catch (e: Exception) {
            Log.w(TAG, "destroy WebView lama gagal: ${e.message}")
        }
        webView = null
        splashHidden = false
        splash.visibility = View.VISIBLE
        createWebView()
        loadUrl(currentUrl)
    }

    private fun loadUrl(url: String) {
        currentUrl = url
        webView?.loadUrl(url)
        Log.i(TAG, "Memuat: $url")
    }

    // ---- URL efektif: override lokal > config Supabase > default ----
    private fun effectiveUrl(): String {
        val local = prefs.getString(KEY_LOCAL_URL, "")?.trim().orEmpty()
        if (local.isNotEmpty()) return local
        return remoteConfig?.startUrl ?: DEFAULT_URL
    }

    // ---- ketuk 5x pojok -> PIN -> pengaturan ----
    private fun onCornerTap() {
        val now = System.currentTimeMillis()
        if (now - firstTapMs > 3000) {
            tapCount = 0
            firstTapMs = now
        }
        tapCount++
        if (tapCount >= 5) {
            tapCount = 0
            askPin()
        }
    }

    private fun askPin() {
        val input = EditText(this)
        input.inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        input.hint = getString(R.string.pin_hint)
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.pin_title))
            .setView(input)
            .setPositiveButton(getString(R.string.pin_ok)) { _, _ ->
                val savedPin = prefs.getString(KEY_PIN, DEFAULT_PIN) ?: DEFAULT_PIN
                if (input.text.toString() == savedPin) {
                    startActivity(Intent(this, SettingsActivity::class.java))
                } else {
                    Toast.makeText(this, getString(R.string.pin_salah), Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(getString(R.string.batal), null)
            .show()
    }

    // ---- jaringan ----
    private fun initialOnline(): Boolean {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            @Suppress("DEPRECATION")
            val info = cm.activeNetworkInfo
            @Suppress("DEPRECATION")
            info != null && info.isConnectedOrConnecting
        } catch (e: Exception) {
            true
        }
    }

    private fun registerNetworkCallback() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            cm.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    if (!isOnline) {
                        isOnline = true
                        runOnUiThread {
                            offlineBanner.visibility = View.GONE
                            webView?.settings?.cacheMode = WebSettings.LOAD_DEFAULT
                            Log.i(TAG, "Online kembali — memuat ulang Board")
                            webView?.reload()
                        }
                    }
                }

                override fun onLost(network: Network) {
                    isOnline = false
                    runOnUiThread {
                        offlineBanner.visibility = View.VISIBLE
                        webView?.settings?.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                        Log.w(TAG, "Offline — menampilkan cache")
                    }
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "registerNetworkCallback gagal: ${e.message}")
        }
    }

    // ---- Supabase: config ----
    private fun fetchConfig() {
        netExecutor.execute {
            val cfg = SupabaseClient.getConfig() ?: return@execute
            runOnUiThread {
                val oldRefresh = refreshSeconds
                remoteConfig = cfg
                refreshSeconds = prefs.getInt(KEY_LOCAL_REFRESH, 0).takeIf { it > 0 } ?: cfg.refreshSeconds
                if (refreshSeconds != oldRefresh) scheduleRefresh()
                val target = effectiveUrl()
                if (target != currentUrl) {
                    Log.i(TAG, "start_url berubah dari HP: $target")
                    loadUrl(target)
                }
            }
        }
    }

    // ---- Supabase: perintah ----
    private fun fetchCommands() {
        netExecutor.execute {
            val commands = SupabaseClient.getPendingCommands(deviceId)
            for (cmd in commands) {
                // Tandai dijalankan dulu; bila gagal menandai, lewati agar tidak
                // dieksekusi berulang tiap polling.
                if (!SupabaseClient.setCommandStatus(cmd.id, "dijalankan")) {
                    Log.w(TAG, "Tidak bisa menandai perintah ${cmd.id} — dilewati")
                    continue
                }
                val ok = executeCommand(cmd)
                SupabaseClient.setCommandStatus(cmd.id, if (ok) "selesai" else "gagal")
            }
        }
    }

    private fun executeCommand(cmd: SupabaseClient.KioskCommand): Boolean {
        return try {
            when (cmd.perintah) {
                "reload" -> {
                    runOnUiThread { webView?.reload() }
                    true
                }
                "refresh_config" -> {
                    fetchConfig()
                    true
                }
                "set_url" -> {
                    val url = cmd.payload?.optString("url", "")?.trim().orEmpty()
                    if (url.isEmpty() || !(url.startsWith("http://") || url.startsWith("https://"))) {
                        Log.w(TAG, "set_url: payload url tidak valid")
                        return false
                    }
                    prefs.edit().putString(KEY_LOCAL_URL, url).apply()
                    runOnUiThread { loadUrl(url) }
                    true
                }
                "reboot" -> rebootDevice()
                else -> {
                    Log.w(TAG, "Perintah tidak dikenal: ${cmd.perintah}")
                    false
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "executeCommand gagal: ${e.message}")
            false
        }
    }

    /** Reboot via su (STB sudah root). False bila su gagal — tanpa crash. */
    private fun rebootDevice(): Boolean {
        return try {
            val proc = Runtime.getRuntime().exec(arrayOf("su", "-c", "reboot"))
            val code = proc.waitFor()
            Log.i(TAG, "su reboot exit=$code")
            code == 0
        } catch (e: Exception) {
            Log.w(TAG, "reboot via su gagal: ${e.message}")
            false
        }
    }

    // ---- Supabase: heartbeat ----
    private fun sendHeartbeat() {
        netExecutor.execute {
            SupabaseClient.upsertStatus(
                deviceId = deviceId,
                appVersion = APP_VERSION,
                currentUrl = currentUrl,
                online = isOnline,
                androidVersion = Build.VERSION.RELEASE ?: "?"
            )
        }
    }

    // ---- auto refresh ----
    private fun scheduleRefresh() {
        uiHandler.removeCallbacks(refreshRunnable)
        val delay = (refreshSeconds.coerceAtLeast(60)) * 1000L
        uiHandler.postDelayed(refreshRunnable, delay)
    }

    companion object {
        const val TAG = "MainActivity"
        const val PREFS_NAME = "kiosk_prefs"
        const val KEY_LOCAL_URL = "local_url"
        const val KEY_LOCAL_REFRESH = "local_refresh_seconds"
        const val KEY_PIN = "pin"
        const val DEFAULT_PIN = "123456"
        const val DEFAULT_URL = "https://mihrab-connect-board-0xs-projects-798a67b4.vercel.app/"
        const val DEFAULT_REFRESH_SECONDS = 300
        const val APP_VERSION = "1.0.0"

        const val CONFIG_INTERVAL_MS = 60_000L
        const val COMMAND_INTERVAL_MS = 30_000L
        const val HEARTBEAT_INTERVAL_MS = 60_000L
        const val HEARTBEAT_TICK_MS = 10_000L

        @Volatile
        var lastHeartbeatMs: Long = System.currentTimeMillis()
    }
}
