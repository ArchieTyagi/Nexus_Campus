import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// Draws the given text as a QR code on a canvas
export default function QrCode({ value, size = 340 }) {
  const canvas = useRef(null)

  useEffect(() => {
    if (canvas.current && value) {
      QRCode.toCanvas(canvas.current, value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
    }
  }, [value, size])

  return <canvas ref={canvas} className="qr-canvas" aria-label="Attendance QR code" />
}
