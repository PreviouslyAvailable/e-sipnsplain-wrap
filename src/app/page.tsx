import Link from 'next/link';

export default function Home() {

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
      <main className="flex w-full max-w-4xl flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-2xl space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold" style={{ color: 'var(--black)' }}>
              Sip&apos;n&apos;Sleigh
            </h1>
            <p className="text-xl md:text-2xl" style={{ color: 'var(--untitled-ui-gray700)' }}>
              A shared reflection ritual for the room
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/host"
              className="px-8 py-4 text-white text-lg font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl home-link-host"
              style={{ backgroundColor: 'var(--black)' }}
            >
              Host Controls
            </Link>
            <Link
              href="/present"
              className="px-8 py-4 text-white text-lg font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl home-link-present"
              style={{ backgroundColor: 'var(--untitled-ui-gray800)' }}
            >
              Presentation View
            </Link>
            <Link
              href="/join"
              className="px-8 py-4 text-white text-lg font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:opacity-90"
              style={{ backgroundColor: 'var(--mae_red)' }}
            >
              Join Room
            </Link>
          </div>

          <div className="pt-8" style={{ borderTop: '1px solid var(--untitled-ui-gray200)' }}>
            <div className="mb-4 text-center">
              <Link
                href="/admin"
                className="text-sm underline home-link-admin"
                style={{ color: 'var(--untitled-ui-gray600)' }}
              >
                Admin: Seed Photos
              </Link>
            </div>
            <p className="text-sm mt-4" style={{ color: 'var(--untitled-ui-gray600)' }}>
              Room: <span className="font-mono font-semibold">SIP2025</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
