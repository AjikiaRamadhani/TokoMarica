import { NextResponse } from "next/server";
import { searchDestination } from "@/lib/rajaongkir";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (!search || search.trim().length < 3) {
      return NextResponse.json(
        { error: "Parameter 'search' minimal 3 karakter" },
        { status: 400 }
      );
    }

    const destinations = await searchDestination(search);
    return NextResponse.json(destinations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/domestic destinations data not found/i.test(message)) {
      return NextResponse.json([]);
    }
    console.error("[GET /api/shipping/destinations]", error);
    return NextResponse.json(
      { error: message || "Gagal mencari destinasi" },
      { status: 500 }
    );
  }
}