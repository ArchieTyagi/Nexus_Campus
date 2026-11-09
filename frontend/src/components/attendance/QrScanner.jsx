import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

// Opens the back camera and looks for a Nexus attendance QR in every frame.
// Calls onFound(text) once, then stops the camera.
export default function QrScanner({ onFound, onCancel }) {
  const video = useRef(null)
  const canvas = useRef(null)
  const [problem, setProblem] = useState(() =>
    window.isSecureContext && navigator.mediaDevices?.getUserMedia
      ? ''
      : 'The camera only works on a secure (https) site. Ask your teacher, or try again once the app is online.'
  )

  useEffect(() => {
    if (problem) return undefined
    let stream
    let frame
    let done = false

    const look = () => {
      const v = video.current
      const c = canvas.current
      if (!done && v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth
        c.height = v.videoHeight
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(v, 0, 0, c.width, c.height)
        const found = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, {
          inversionAttempts: 'dontInvert',
        })
        if (found?.data?.startsWith('nexus:')) {
          done = true
          stream?.getTracks().forEach((t) => t.stop())
          onFound(found.data)
          return
        }
      }
      frame = requestAnimationFrame(look)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (done || !video.current) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        video.current.srcObject = s
        video.current.play().catch(() => {})
        frame = requestAnimationFrame(look)
      })
      .catch((err) =>
        setProblem(
          err.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow the camera for this site in your browser settings.'
            : 'Could not open the camera on this device.'
        )
      )

    return () => {
      done = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [problem, onFound])

  return (
    <div className="scanner">
      {problem ? (
        <p className="login__error" role="alert">
          {problem}
        </p>
      ) : (
        <div className="scanner__view">
          <video ref={video} playsInline muted />
          <span className="scanner__frame" aria-hidden="true" />
        </div>
      )}
      <canvas ref={canvas} hidden />
      <p className="scanner__hint">Point your camera at the QR on the screen.</p>
      <button type="button" className="btn btn--outline" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
