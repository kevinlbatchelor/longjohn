package com.longjohn.tv

import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * The one screen of settings: the server address. Shown on first launch,
 * from the MENU key, and from the error screen when the server cannot be
 * reached. Whatever is typed is tidied into a URL - "192.168.1.12" becomes
 * "http://192.168.1.12" - and the web app's own page takes it from there.
 */
class SettingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val field = findViewById<EditText>(R.id.addressField)
        val problem = findViewById<TextView>(R.id.problemText)
        field.setText(Prefs.serverUrl(this))
        field.requestFocus()

        findViewById<Button>(R.id.saveButton).setOnClickListener {
            val url = normalise(field.text.toString())
            if (url == null) {
                problem.text = getString(R.string.address_problem)
                return@setOnClickListener
            }
            Prefs.setServerUrl(this, url)
            finish()
        }
    }

    /** A usable http(s) URL with a host, or null. */
    private fun normalise(typed: String): String? {
        var text = typed.trim().trimEnd('/')
        if (text.isEmpty()) return null
        if (!text.startsWith("http://") && !text.startsWith("https://")) text = "http://$text"

        val uri = Uri.parse(text)
        if (uri.host.isNullOrEmpty()) return null
        return text
    }
}
