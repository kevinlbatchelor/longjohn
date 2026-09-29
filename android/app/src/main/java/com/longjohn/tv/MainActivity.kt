package com.longjohn.tv

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
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
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var fullscreenHolder: FrameLayout
    private lateinit var errorPanel: View
    private lateinit var errorText: TextView

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    /** The address the page was loaded from, so a change in Settings reloads. */
    private var loadedFrom = ""
    private var askedForAddress = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        fullscreenHolder = findViewById(R.id.fullscreenHolder)
        errorPanel = findViewById(R.id.errorPanel)
        errorText = findViewById(R.id.errorText)
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
        webView.destroy()
        super.onDestroy()
    }

    /** MENU on the remote opens Settings; there is no on-screen chrome to reach it from. */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            openSettings()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

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
        webView.loadUrl(base)
    }

    private fun openSettings() {
        askedForAddress = true
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    private fun configure(view: WebView) {
        with(view.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // The player autoplays the next episode; a tap per episode would defeat it.
            mediaPlaybackRequiresUserGesture = false
            loadWithOverviewMode = true
            useWideViewPort = true
            userAgentString = "$userAgentString LongJohnTV/1.0"
        }
        view.setBackgroundColor(Color.BLACK)

        view.webViewClient = object : WebViewClient() {
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
