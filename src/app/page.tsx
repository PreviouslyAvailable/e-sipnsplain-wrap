import Link from 'next/link';

export default function Home() {

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-2xl space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white">
              Sip&apos;n&apos;Sleigh
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
              A shared reflection ritual for the room
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/host"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Host Controls
            </Link>
            <Link
              href="/present"
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Presentation View
            </Link>
            <Link
              href="/join"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Join Room
            </Link>
          </div>

          <div className="pt-8 border-t border-gray-300 dark:border-gray-600">
            <div className="mb-4 text-center">
              <Link
                href="/admin"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Admin: Seed Photos
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Room: <span className="font-mono font-semibold">SIP2025</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
