import { describe, test, expect } from "vitest";
import {
  defaultDiscovery,
  matchesDiscovery,
  runEnded,
  calendarContent,
  completionCard,
  entityPath,
} from "./community";
import { makeDemo } from "./demo";
const data = makeDemo(),
  run = data.runs.find((r) => r.id === "r1")!;
describe("Descoberta e convites", () => {
  test("combina cidade, bairro, ritmo e inclusão ignorando acentos", () => {
    expect(
      matchesDiscovery(run, data.groups, {
        ...defaultDiscovery,
        city: "porto alegre",
        neighborhood: "historico",
        distance: "short",
        pace: "steady",
        beginner: true,
        inclusive: true,
      }),
    ).toBe(true);
    expect(
      matchesDiscovery(run, data.groups, {
        ...defaultDiscovery,
        city: "São Paulo",
      }),
    ).toBe(false);
    expect(
      matchesDiscovery(run, data.groups, {
        ...defaultDiscovery,
        distance: "long",
      }),
    ).toBe(false);
  });
  test("registro só após duração prevista e nunca em corrida cancelada", () => {
    const start = new Date(run.starts_at).getTime();
    expect(runEnded(run, start + 30 * 60000)).toBe(false);
    expect(runEnded(run, start + 60 * 60000)).toBe(true);
    expect(runEnded({ ...run, status: "cancelled" }, start + 60 * 60000)).toBe(
      false,
    );
  });
  test("calendário usa UTC, duração e escapa texto sem injetar campos", () => {
    const content = calendarContent({
      ...run,
      title: "Olá, turma;\nLOCATION:Outro",
    });
    expect(content).toContain("DTSTART:");
    expect(content).toContain("DTEND:");
    expect(content).toContain("Olá\\, turma\\;\\nLOCATION:Outro");
    expect(content).not.toContain("\nLOCATION:Outro");
    expect(content.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  test("cartão escapa conteúdo e informa registro declarado", () => {
    const card = completionCard(run, "<script>");
    expect(card).not.toContain("<script>");
    expect(card).toContain("&lt;script&gt;");
    expect(card).toContain("Registro declarado pelo corredor");
    expect(entityPath("run", "r1")).toBe("/corridas/r1");
  });
});
