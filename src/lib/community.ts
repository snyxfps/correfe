import type { Group, Run } from "./types";
export type Discovery = {
  city: string;
  neighborhood: string;
  distance: string;
  pace: string;
  beginner: boolean;
  inclusive: boolean;
};
export const defaultDiscovery: Discovery = {
  city: "",
  neighborhood: "",
  distance: "all",
  pace: "all",
  beginner: false,
  inclusive: false,
};
export const runEnded = (r: Run, now = Date.now()) =>
  r.status !== "cancelled" &&
  new Date(r.starts_at).getTime() + (r.duration_minutes ?? 60) * 60000 <= now;
export const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function matchesDiscovery(r: Run, groups: Group[], f: Discovery) {
  const city = groups.find((g) => g.id === r.group_id)?.city || "";
  const pace = Number(r.pace.match(/\d+/)?.[0]);
  return (
    (!f.city || normalize(city).includes(normalize(f.city))) &&
    (!f.neighborhood ||
      normalize(r.neighborhood || r.start_point).includes(
        normalize(f.neighborhood),
      )) &&
    (f.distance === "all" ||
      (f.distance === "short"
        ? r.distance <= 5
        : f.distance === "medium"
          ? r.distance > 5 && r.distance <= 10
          : r.distance > 10)) &&
    (f.pace === "all" ||
      (Number.isFinite(pace) &&
        (f.pace === "easy"
          ? pace >= 7
          : f.pace === "steady"
            ? pace >= 5 && pace < 7
            : pace < 5))) &&
    (!f.beginner || !!r.beginner_friendly) &&
    (!f.inclusive || !!r.no_one_left_behind)
  );
}
export const entityPath = (kind: "run" | "group", id: string) =>
  `/${kind === "run" ? "corridas" : "grupos"}/${encodeURIComponent(id)}`;
export const entityUrl = (kind: "run" | "group", id: string) =>
  window.location.origin + entityPath(kind, id);
export const mapsUrl = (point: string, city: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point + ", " + city)}`;
export function download(content: Blob, filename: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const icsEscape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
export function calendarContent(r: Run) {
  const utc = (t: number) =>
    new Date(t)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const start = new Date(r.starts_at).getTime();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CORREFÉ//Encontros//PT-BR",
    "BEGIN:VEVENT",
    `STATUS:${r.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    `UID:${r.id}@corre`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(start + (r.duration_minutes ?? 60) * 60000)}`,
    `SUMMARY:${icsEscape(r.title)}`,
    `LOCATION:${icsEscape(r.start_point)}`,
    `DESCRIPTION:${icsEscape(r.description + "\nChegada: " + r.end_point)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function completionCard(r: Run, group: string, logoData = "") {
  const esc = (v: string) =>
    v.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const logo = /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(
    logoData,
  )
    ? `<defs><clipPath id="brand-circle"><circle cx="160" cy="120" r="80"/></clipPath></defs><g clip-path="url(#brand-circle)"><svg x="80" y="40" width="160" height="160" viewBox="225 257 870 870"><image href="${logoData}" width="1320" height="1551"/></svg></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#171717"/><circle cx="850" cy="230" r="280" fill="#2b2b2b"/><path d="M-100 1180L1180 200M-100 1280L1180 300" stroke="#555" stroke-width="2"/>${logo}<text x="${logo ? 265 : 80}" y="140" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="76" fill="white">CORREFÉ</text><text x="80" y="490" font-family="Arial,sans-serif" font-size="42" letter-spacing="6" fill="#aaa">MAIS UM CORRE</text><text x="70" y="740" font-family="Arial,sans-serif" font-weight="900" font-size="235" fill="white">${esc(String(r.distance))}</text><text x="80" y="840" font-family="Arial,sans-serif" font-size="75" fill="#aaa">KM COM A TURMA.</text><text x="80" y="1030" font-family="Arial,sans-serif" font-weight="700" font-size="36" fill="white">${esc(group.slice(0, 40))}</text><text x="80" y="1100" font-family="Arial,sans-serif" font-size="28" fill="#aaa">${esc(new Date(r.starts_at).toLocaleDateString("pt-BR"))} · Registro declarado pelo corredor</text><text x="80" y="1260" font-family="Arial,sans-serif" font-size="28" fill="white">SEU RITMO. SUA TURMA. SUA HISTÓRIA.</text></svg>`;
}
export async function downloadCompletionCard(r: Run, group: string) {
  const response = await fetch("/brand-logo.jpg");
  if (!response.ok) throw new Error("Não foi possível carregar a logo.");
  const logoBlob = await response.blob();
  const logoData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a logo."));
    reader.readAsDataURL(logoBlob);
  });
  const source = URL.createObjectURL(
    new Blob([completionCard(r, group, logoData)], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem")),
        "image/png",
      ),
    );
    download(blob, "meu-corre.png");
  } finally {
    URL.revokeObjectURL(source);
  }
}
