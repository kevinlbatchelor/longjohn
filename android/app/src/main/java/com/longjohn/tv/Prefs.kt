package com.longjohn.tv

import android.content.Context

/** The one setting the app has: where LongJohn is. Starts on the Pi's usual address; Settings overrides it. */
object Prefs {
    private const val FILE = "longjohn"
    private const val SERVER_URL = "serverUrl"
    const val DEFAULT_SERVER_URL = "http://192.168.1.12"

    fun serverUrl(context: Context): String =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(SERVER_URL, null) ?: DEFAULT_SERVER_URL

    fun setServerUrl(context: Context, url: String) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putString(SERVER_URL, url).apply()
    }
}
