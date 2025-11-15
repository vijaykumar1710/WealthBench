import DynamicInputForm from "@/components/DynamicInputForm";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-section">
        <h1 className="text-4xl font-bold">WealthBench — Anonymous Financial Benchmarking</h1>
        <DynamicInputForm />
      </div>
    </main>
  );
}

