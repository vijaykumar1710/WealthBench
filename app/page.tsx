import DynamicInputForm from "@/components/DynamicInputForm";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">WealthBench — Anonymous Financial Benchmarking</h1>
        <DynamicInputForm />
      </div>
    </main>
  );
}

