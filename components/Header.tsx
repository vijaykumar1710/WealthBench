import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            WealthBench
          </Link>
          <div className="flex gap-4 md:gap-6">
            <Link
              href="/#form"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm md:text-base"
            >
              Submit Data
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm md:text-base"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

