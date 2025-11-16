import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  const now = new Date().toISOString();

  await redis.set("wb:test", now, { ex: 60 });
  const value = await redis.get("wb:test");

  return NextResponse.json({ message: "Redis working!", value });
}
