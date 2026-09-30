package com.longjohn.tv

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * LongJohn, full screen, and nothing else. A browser view locked to the
 * server address from Settings. The remote's back button walks browser
 * history, the video player's own fullscreen works because the fullscreen
 * callback is handled here, and a page that will not load offers the way to
 * Settings rather than a blank screen.
 *
 * The D-pad drives a pointer rather than jumping focus between links: the
 * arrows move it, OK clicks where it is, pushing past an edge scrolls the
 * page, and a long press on OK switches to plain focus navigation and back.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var fullscreenHolder: FrameLayout
    private lateinit var errorPanel: View
    private lateinit var errorText: TextView
    private lateinit var cursor: CursorView

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    /** The address the page was loaded from, so a change in Settings reloads. */
    private var loadedFrom = ""
    private var askedForAddress = false

    private var pointerMode = true
    private val LONG_PRESS_MS = 600L

    /** The bundled web app's front page, served by the asset loader below. */
    private val PAGES = "https://appassets.androidplatform.net/assets/www/index.html"
    private val handler = Handler(Looper.getMainLooper())
    private val hidePointer = Runnable { cursor.shown = false }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        fullscreenHolder = findViewById(R.id.fullscreenHolder)
        errorPanel = findViewById(R.id.errorPanel)
        errorText = findViewById(R.id.errorText)
        cursor = findViewById(R.id.cursor)
        findViewById<Button>(R.id.settingsButton).setOnClickListener { openSettings() }
        findViewById<Button>(R.id.retryButton).setOnClickListener { load(force = true) }

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemBars()
        configure(webView)

        onBackPressedDispatcher.addCallback(this) {
            when {
                customView != null -> hideCustomView()
                errorPanel.visibility == View.VISIBLE -> finish()
                webView.canGoBack() -> webView.goBack()
                else -> finish()
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
            loadedFrom = Prefs.serverUrl(this)
        }
    }

    override fun onResume() {
        super.onResume()
        load()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        webView.destroy()
        super.onDestroy()
    }

    // The remote ---------------------------------------------------------------

    private fun pointerActive() = pointerMode && errorPanel.visibility != View.VISIBLE

    /**
     * Every key comes through here before the page sees it. Left to itself,
     * the WebView eats the D-pad to move its own focus, so the pointer would
     * never hear a thing. MENU opens Settings; the arrows steer the pointer;
     * a short OK clicks where it is and a long one toggles pointer mode.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (handleRemote(event)) return true
        return super.dispatchKeyEvent(event)
    }

    private var okPressedAt = 0L

    private fun handleRemote(event: KeyEvent): Boolean {
        val down = event.action == KeyEvent.ACTION_DOWN
        val up = event.action == KeyEvent.ACTION_UP

        if (event.keyCode == KeyEvent.KEYCODE_MENU) {
            if (down) openSettings()
            return true
        }
        if (!pointerActive()) return false

        val step = stepFor(event.repeatCount)
        when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_LEFT -> if (down) nudge(-step, 0f)
            KeyEvent.KEYCODE_DPAD_RIGHT -> if (down) nudge(step, 0f)
            KeyEvent.KEYCODE_DPAD_UP -> if (down) nudge(0f, -step)
            KeyEvent.KEYCODE_DPAD_DOWN -> if (down) nudge(0f, step)
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                if (down && event.repeatCount == 0) okPressedAt = SystemClock.uptimeMillis()
                if (up) {
                    if (SystemClock.uptimeMillis() - okPressedAt >= LONG_PRESS_MS) togglePointer()
                    else {
                        showPointer()
                        tap(cursor.cx, cursor.cy)
                    }
                }
            }
            else -> return false
        }
        return true
    }

    /** Holding OK switches between the pointer and plain focus navigation. */
    private fun togglePointer() {
        pointerMode = !pointerMode
        if (pointerMode) showPointer() else cursor.shown = false
        Toast.makeText(this, if (pointerMode) R.string.pointer_on else R.string.pointer_off, Toast.LENGTH_SHORT).show()
    }

    /** Faster the longer an arrow is held: a tap is precise, a hold crosses the screen. */
    private fun stepFor(repeatCount: Int): Float {
        val density = resources.displayMetrics.density
        return 12f * density * minOf(5, 1 + repeatCount / 3)
    }

    /** Moves the pointer; at an edge, scrolls the page in that direction instead. */
    private fun nudge(dx: Float, dy: Float) {
        showPointer()
        if (!cursor.moveBy(dx, dy) && customView == null) {
            webView.scrollBy(dx.toInt(), dy.toInt())
        }
    }

    private fun showPointer() {
        cursor.shown = true
        handler.removeCallbacks(hidePointer)
        handler.postDelayed(hidePointer, 4000)
    }

    /**
     * A finger-tap at a point, delivered to the whole content view so it lands
     * on whatever is there - the page, or the fullscreen video. The pointer
     * layer is not clickable, so the event passes through it.
     */
    private fun tap(x: Float, y: Float) {
        val root = findViewById<ViewGroup>(android.R.id.content)
        val t = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(t, t, MotionEvent.ACTION_DOWN, x, y, 0)
        val up = MotionEvent.obtain(t, t + 60, MotionEvent.ACTION_UP, x, y, 0)
        down.source = InputDevice.SOURCE_TOUCHSCREEN
        up.source = InputDevice.SOURCE_TOUCHSCREEN
        root.dispatchTouchEvent(down)
        root.dispatchTouchEvent(up)
        down.recycle()
        up.recycle()
    }

    // The page -----------------------------------------------------------------

    /**
     * Loads the server's page. With no address saved yet, Settings is opened
     * once; backing out of it without saving exits the app rather than
     * bouncing back into Settings forever.
     */
    private fun load(force: Boolean = false) {
        val base = Prefs.serverUrl(this)
        if (base.isEmpty()) {
            if (askedForAddress) finish() else openSettings()
            return
        }
        if (!force && base == loadedFrom) return

        loadedFrom = base
        errorPanel.visibility = View.GONE
        webView.visibility = View.VISIBLE
        webView.loadUrl(PAGES + "?base=" + Uri.encode(base))
    }

    private fun openSettings() {
        askedForAddress = true
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    /* The web app travels inside the APK, under assets/www, put there by the
       build. WebViewAssetLoader serves it from a real https origin, so the
       pages behave as they would from a server; the API and media come from
       the Pi over plain http, which the mixed-content setting allows. */
    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    private fun configure(view: WebView) {
        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // The player autoplays the next episode; a tap per episode would defeat it.
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            loadWithOverviewMode = true
            useWideViewPort = true
            userAgentString = "$userAgentString LongJohnTV"
        }
        view.setBackgroundColor(Color.BLACK)

        view.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(v: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun onReceivedError(v: WebView, request: WebResourceRequest, error: WebResourceError) {
                // Only the page itself, not a cover image that failed to load.
                if (request.isForMainFrame) showError(error.description?.toString() ?: "Could not load")
            }
        }

        /* The video player's fullscreen button hands the browser a view to
           show full screen. Without this handler it does nothing - which is
           what the stock TV browsers do, and why the web app has its own
           fallback. Here it gets the real thing. */
        view.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(v: View, callback: CustomViewCallback) {
                if (customView != null) {
                    callback.onCustomViewHidden()
                    return
                }
                customView = v
                customViewCallback = callback
                fullscreenHolder.addView(
                    v,
                    FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
                )
                fullscreenHolder.visibility = View.VISIBLE
                webView.visibility = View.GONE
                hideSystemBars()
            }

            override fun onHideCustomView() {
                hideCustomView()
            }
        }
    }

    private fun hideCustomView() {
        val v = customView ?: return
        fullscreenHolder.removeView(v)
        fullscreenHolder.visibility = View.GONE
        webView.visibility = View.VISIBLE
        customViewCallback?.onCustomViewHidden()
        customView = null
        customViewCallback = null
        hideSystemBars()
    }

    private fun showError(message: String) {
        // Reload from Settings next time, rather than treating the failed page as loaded.
        loadedFrom = ""
        errorText.text = getString(R.string.could_not_reach, Prefs.serverUrl(this), message)
        webView.visibility = View.GONE
        errorPanel.visibility = View.VISIBLE
        cursor.shown = false
        findViewById<Button>(R.id.retryButton).requestFocus()
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }
}
