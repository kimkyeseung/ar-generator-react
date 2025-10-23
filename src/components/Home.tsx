export function Home() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-800 p-8 shadow-2xl backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">Welcome to the MindAR playground</h2>
      <p className="mt-4 text-sm leading-6 text-slate-200/90">
        Use the buttons above to open either the AFRAME or the Three.js version of the demo. Both options showcase the
        same image target but rely on different rendering engines, making it easy to compare integration patterns.
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        Bring the sample target into view and you will see the overlaid video content appear. Try switching between
        routes while the camera is on to observe how MindAR keeps the tracking state.
      </p>
    </section>
  )
}
