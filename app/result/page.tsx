import { Suspense } from "react";
import ResultClient from "./ResultClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen p-4 md:p-6 bg-white"><div className="max-w-2xl mx-auto"><h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">Your Financial Ranking</h1><div className="text-center py-20"><div className="text-lg text-gray-600">Loading...</div></div></div></main>}>
      <ResultClient />
    </Suspense>
  );
}
