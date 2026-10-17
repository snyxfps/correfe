import { isDemo } from "../lib/client";
import { useState } from "react";
import { Copy, Share2, CalendarPlus, Download } from "lucide-react";
import type { Run } from "../lib/types";
import {
  calendarContent,
  downloadCompletionCard,
  download,
  entityUrl,
} from "../lib/community";
export function ShareTools({
  kind,
  id,
  title,
  run,
  group,
}: {
  kind: "run" | "group";
  id: string;
  title: string;
  run?: Run;
  group?: string;
}) {
  const [message, setMessage] = useState("");
  const url = entityUrl(kind, id),
    text = `Bora correr junto? ${title} — ${url}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(
        isDemo
          ? "Link copiado. Na demo, dados novos só existem nesta aba."
          : "Link copiado! Abre sem exigir login.",
      );
    } catch {
      setMessage("Copie o endereço abaixo para convidar sua turma.");
    }
  }
  return (
    <div className="share-tools">
      <div className="share-buttons">
        <button className="button secondary small" onClick={() => void copy()}>
          <Copy size={15} /> Copiar convite
        </button>
        <a
          className="button secondary small"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Share2 size={15} /> WhatsApp
        </a>
        {run && (
          <button
            className="button secondary small"
            onClick={() =>
              download(
                new Blob([calendarContent(run)], {
                  type: "text/calendar;charset=utf-8",
                }),
                "corre-encontro.ics",
              )
            }
          >
            <CalendarPlus size={15} /> Agenda
          </button>
        )}
        {run && group && (
          <button
            className="button secondary small"
            onClick={() =>
              void downloadCompletionCard(run, group).catch(() =>
                setMessage("Não foi possível gerar a imagem. Tente novamente."),
              )
            }
          >
            <Download size={15} /> Meu cartão
          </button>
        )}
      </div>
      {isDemo && (
        <p className="microcopy">
          Demonstração: novos encontros e grupos só existem nesta aba. Os links
          passam a funcionar entre dispositivos quando os dados estão no
          Supabase.
        </p>
      )}
      <input
        className="invite-link"
        aria-label="Link público do convite"
        value={url}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      {message && (
        <p className="microcopy" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
