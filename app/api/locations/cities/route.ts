import { NextResponse } from "next/server";

type Region = { id: string; name: string };
type Regency = Region & { province: string };
type PostalResult = { code?: string | number; district?: string; regency?: string };

const COMMON_TYPOS: Record<string, string> = {
  sukoarjo: "sukoharjo",
};

function normalizeQuery(value: string) {
  const query = value.trim().toLocaleLowerCase("id-ID");
  return COMMON_TYPOS[query] ?? query;
}

function matches(value: string, query: string) {
  const normalized = value.toLocaleLowerCase("id-ID");
  return normalized.includes(query) || normalized.replace(/\s+/g, "").includes(query.replace(/\s+/g, ""));
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("search")?.trim() ?? "";
  const regencyId = searchParams.get("regencyId")?.trim() ?? "";
  const regencyName = searchParams.get("regencyName")?.trim() ?? "";
  if (query.length < 3) return NextResponse.json([]);

  try {
    const baseUrl = "https://www.emsifa.com/api-wilayah-indonesia/api";
    if (regencyId) {
      const response = await fetch(`${baseUrl}/districts/${regencyId}.json`, { next: { revalidate: 86400 } });
      if (!response.ok) throw new Error("Failed to load districts");
      const districts = (await response.json() as Region[])
        .filter((district) => matches(district.name, normalizeQuery(query)))
        .slice(0, 10);
      const districtResults = await Promise.all(districts.map(async (district) => {
        let postalCode = "";
        try {
          const postalResponse = await fetch(
            `https://kodepos.vercel.app/search/?q=${encodeURIComponent(`${district.name} ${regencyName}`)}`,
            { next: { revalidate: 86400 } },
          );
          if (postalResponse.ok) {
            const postalData = await postalResponse.json() as { data?: PostalResult[] };
            const postalResult = postalData.data?.find((item) =>
              item.district?.toLocaleLowerCase("id-ID") === district.name.toLocaleLowerCase("id-ID") &&
              (!regencyName || item.regency?.toLocaleLowerCase("id-ID").includes(regencyName.toLocaleLowerCase("id-ID"))),
            );
            postalCode = postalResult?.code ? String(postalResult.code) : "";
          }
        } catch {
          postalCode = "";
        }
        return {
          id: district.id,
          city: titleCase(district.name),
          province: "",
          postalCode,
          regency: "",
        };
      }));
      return NextResponse.json(districtResults);
    }

    const provincesResponse = await fetch(`${baseUrl}/provinces.json`, { next: { revalidate: 86400 } });
    if (!provincesResponse.ok) throw new Error("Failed to load provinces");
    const provinces = (await provincesResponse.json()) as Region[];

    const provinceRegencies = await Promise.all(
      provinces.map(async (province) => {
        const response = await fetch(`${baseUrl}/regencies/${province.id}.json`, {
          next: { revalidate: 86400 },
        });
        if (!response.ok) return [];
        return (await response.json() as Region[]).map((regency) => ({
          ...regency,
          province: province.name,
        }));
      }),
    );
    const regencies = provinceRegencies.flat() as Regency[];
    const matchingRegencies = regencies.filter((regency) => matches(regency.name, normalizeQuery(query)));

    const cityResults = matchingRegencies.map((regency) => ({
      id: regency.id,
      city: titleCase(regency.name),
      province: titleCase(regency.province),
      postalCode: "",
      regencyId: regency.id,
    }));

    return NextResponse.json(cityResults.slice(0, 20));
  } catch (error) {
    console.error("[GET /api/locations/cities]", error);
    return NextResponse.json(
      { error: "Pencarian kota sedang tidak tersedia. Coba lagi beberapa saat." },
      { status: 502 },
    );
  }
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("id-ID"))
    .replace(/^Kabupaten /, "")
    .replace(/^Kota /, "");
}
