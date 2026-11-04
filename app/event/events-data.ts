export type EventCategory = string;

export type EventItem = {
  slug: string;
  category: EventCategory;
  title: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  quota: number;
  quotaLeft: number;
  price: string;
  shortDescription: string;
  description: string[];
  agenda: { time: string; item: string }[];
  facilitator: {
    name: string;
    role: string;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  workshop: "Weekend Workshop",
  parenting: "Sesi Parenting",
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  workshop: {
    bg: "bg-marica-amber-dark",
    text: "text-white",
    dot: "bg-marica-amber-dark",
  },
  parenting: {
    bg: "bg-marica-teal",
    text: "text-white",
    dot: "bg-marica-teal",
  },
};

export function categoryLabel(category: EventCategory) {
  return CATEGORY_LABELS[category] ?? category.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function categoryStyle(category: EventCategory) {
  return CATEGORY_STYLES[category] ?? {
    bg: "bg-marica-blue",
    text: "text-white",
    dot: "bg-marica-blue",
  };
}

export const DAY_LABELS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export const MONTH_LABELS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function jakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value) - 1,
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function todayInJakarta() {
  const { year, month, day } = jakartaDateParts();
  return new Date(year, month, day);
}

function dateKeyInJakarta(date = new Date()) {
  const { year, month, day } = jakartaDateParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatLongDateID(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return `${days[date.getUTCDay()]}, ${day} ${MONTH_LABELS_ID[month - 1]} ${year}`;
}

export function isEventExpired(iso: string) {
  return iso < dateKeyInJakarta();
}
