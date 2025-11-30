"use server";

import { headers } from "next/headers";
import type { DashboardPayload } from "@/types/dashboard";
import HeroSection from "@/components/dashboard/sections/HeroSection";
import AgeSection from "@/components/dashboard/sections/AgeSection";
import OccupationSection from "@/components/dashboard/sections/OccupationSection";
import CitySection from "@/components/dashboard/sections/CitySection";
import ExperienceSection from "@/components/dashboard/sections/ExperienceSection";

async function fetchDashboard(): Promise<DashboardPayload | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host")!;
    const proto = h.get("x-forwarded-proto") ?? "https";
    const url = `${proto}://${host}/api/dashboard?view=dashboard`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const stats = await fetchDashboard();

  if (!stats) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="p-4 bg-red-50 rounded border text-red-700">
          Failed to load dashboard.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-10 bg-gray-50 min-h-screen">
      <HeroSection data={stats} />

      <div className="space-y-16">
        <AgeSection data={stats} />
        <OccupationSection data={stats} />
        <CitySection data={stats} />
        <ExperienceSection data={stats} />
      </div>
    </main>
  );
}
