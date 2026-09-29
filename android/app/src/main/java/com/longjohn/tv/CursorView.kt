package com.longjohn.tv

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

/**
 * The pointer. A transparent layer over the whole screen that draws an
 * arrow where the D-pad has steered it. It never takes a touch itself - it
 * is not clickable - so the taps the activity fires at its position fall
 * through to whatever is underneath.
 */
class CursorView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {

    var cx = -1f
        private set
    var cy = -1f
        private set

    var shown = false
        set(value) {
            field = value
            invalidate()
        }

    private val density = resources.displayMetrics.density
    private val size = 28f * density
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.FILL }
    private val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.BLACK
        style = Paint.Style.STROKE
        strokeWidth = 2f * density
    }
    private val arrow = Path()

    init {
        isClickable = false
        isFocusable = false
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        if (cx < 0) {
            cx = w / 2f
            cy = h / 2f
        } else {
            cx = cx.coerceIn(0f, w - 1f)
            cy = cy.coerceIn(0f, h - 1f)
        }
    }

    /** Moves the pointer, staying on screen. False when it was already at that edge. */
    fun moveBy(dx: Float, dy: Float): Boolean {
        val nx = (cx + dx).coerceIn(0f, width - 1f)
        val ny = (cy + dy).coerceIn(0f, height - 1f)
        val moved = nx != cx || ny != cy
        cx = nx
        cy = ny
        invalidate()
        return moved
    }

    override fun onDraw(canvas: Canvas) {
        if (!shown) return
        arrow.reset()
        arrow.moveTo(cx, cy)
        arrow.lineTo(cx, cy + size * 0.82f)
        arrow.lineTo(cx + size * 0.22f, cy + size * 0.64f)
        arrow.lineTo(cx + size * 0.38f, cy + size * 0.98f)
        arrow.lineTo(cx + size * 0.52f, cy + size * 0.92f)
        arrow.lineTo(cx + size * 0.36f, cy + size * 0.58f)
        arrow.lineTo(cx + size * 0.62f, cy + size * 0.58f)
        arrow.close()
        canvas.drawPath(arrow, fill)
        canvas.drawPath(arrow, outline)
    }
}
