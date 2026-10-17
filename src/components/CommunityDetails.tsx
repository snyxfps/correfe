import { useState } from "react";
import {
  CalendarDays,
  Camera,
  Flag,
  MapPin,
  Pencil,
  Users,
  Image,
  ShoppingBag,
  X,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Avatar, Empty, dateLabel, timeLabel, money } from "./ui";
import { Field, Form } from "./forms";
import { ShareTools } from "./ShareTools";
import { mapsUrl, runEnded } from "../lib/community";
import type { Group, Run } from "../lib/types";
import type { useCorre } from "../lib/useCorre";
type Store = ReturnType<typeof useCorre>;
type Common = {
  store: Store;
  requireAuth: (action: () => void) => void;
  act: (action: () => Promise<unknown>, message?: string) => Promise<void>;
};
export function RunDetails({
  run,
  store,
  requireAuth,
  act,
  onEdit,
  onPost,
  onAlbum,
}: {
  run: Run;
  onEdit: () => void;
  onPost: () => void;
  onAlbum: () => void;
} & Common) {
  const [cancel, setCancel] = useState(false),
    [removing, setRemoving] = useState("");
  const { data, userId } = store,
    group = data.groups.find((g) => g.id === run.group_id),
    joined = data.participants.some(
      (p) => p.run_id === run.id && p.user_id === userId,
    ),
    member = data.memberships.some(
      (m) => m.group_id === run.group_id && m.user_id === userId,
    ),
    manager = run.creator_id === userId || group?.owner_id === userId,
    ended = runEnded(run),
    future = new Date(run.starts_at) > new Date();
  return (
    <div className="detail run-detail">
      <div className="split">
        <span className="tag">{group?.name || "Grupo"}</span>
        <span className="tag">
          {run.status === "cancelled"
            ? "Cancelada"
            : ended
              ? "Encerrada"
              : future
                ? "Próximo encontro"
                : "Em andamento"}
        </span>
      </div>
      <h1 className="detail-title">{run.title}</h1>
      {run.status === "cancelled" && (
        <p className="status-banner">
          Este encontro foi cancelado.{" "}
          {run.cancellation_reason ||
            "Confira as orientações abaixo antes de sair de casa."}
        </p>
      )}
      <div className="detail-metrics">
        <span>
          <CalendarDays />
          {dateLabel(run.starts_at)} · {timeLabel(run.starts_at)}
        </span>
        <span>
          {run.distance} km · {run.pace} /km
        </span>
        <span>~{run.duration_minutes ?? 60} min</span>
      </div>
      <div className="run-tags">
        {run.beginner_friendly && <span className="tag">Para iniciantes</span>}
        {run.no_one_left_behind && (
          <span className="tag">Ninguém fica para trás</span>
        )}
        {run.neighborhood && <span className="tag">{run.neighborhood}</span>}
      </div>
      <div className="route-points">
        <p>
          <span className="point" />
          <small>INÍCIO</small>
          <strong>{run.start_point}</strong>
        </p>
        <a
          href={mapsUrl(run.start_point, group?.city || "")}
          className="map-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={14} /> Abrir ponto de saída no mapa{" "}
          <ArrowUpRight size={14} />
        </a>
        <div className="route-line" />
        <p>
          <Flag size={16} />
          <small>CHEGADA</small>
          <strong>{run.end_point}</strong>
        </p>
        <a
          href={mapsUrl(run.end_point, group?.city || "")}
          className="map-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={14} /> Ver chegada no mapa <ArrowUpRight size={14} />
        </a>
      </div>
      <p className="microcopy">
        Local buscado pelo endereço informado, sem rastreamento GPS. Confirme o
        ponto com o organizador.
      </p>
      <div className="organizer-note">
        <span className="eyebrow">ANTES DE AMARRAR O TÊNIS</span>
        <p>{run.description || "Chegue alguns minutos antes e leve água."}</p>
        {group?.rules && (
          <>
            <strong>Combinados da turma</strong>
            <p>{group.rules}</p>
          </>
        )}
        {group?.contact && (
          <p>
            <strong>Contato / como encontrar a turma:</strong>
            <br />
            {group.contact}
          </p>
        )}
      </div>
      <h3 className="detail-subheading">
        <Users size={18} />{" "}
        {data.participants.filter((p) => p.run_id === run.id).length} presenças
        confirmadas
      </h3>
      <div className="participant-list">
        {data.participants
          .filter((p) => p.run_id === run.id)
          .map((p) => (
            <div className="participant-chip" key={p.user_id}>
              <Avatar
                size="small"
                name={
                  data.profiles.find((a) => a.id === p.user_id)?.name ||
                  "Corredor"
                }
              />
              <span>
                {data.profiles.find((a) => a.id === p.user_id)?.name ||
                  "Corredor"}
              </span>
              {manager &&
                p.user_id !== userId &&
                (removing === p.user_id ? (
                  <button
                    className="text-link"
                    onClick={() =>
                      void act(
                        () => store.removeParticipant(run.id, p.user_id),
                        "Presença removida.",
                      )
                    }
                  >
                    Confirmar remoção
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    aria-label="Remover participante"
                    onClick={() => setRemoving(p.user_id)}
                  >
                    <X size={13} />
                  </button>
                ))}
            </div>
          ))}
      </div>
      {future && run.status !== "cancelled" && (
        <button
          className="button primary full"
          onClick={() =>
            requireAuth(
              () =>
                void act(
                  async () => {
                    if (!member && !joined)
                      await store.toggle(
                        "memberships",
                        "group_id",
                        run.group_id,
                      );
                    await store.toggle("participants", "run_id", run.id);
                  },
                  joined ? "Participação cancelada." : "Você está nessa!",
                ),
            )
          }
        >
          {joined
            ? "Cancelar minha participação"
            : member
              ? "Confirmar presença"
              : "Entrar no grupo e participar"}
        </button>
      )}
      {ended && joined && (
        <div className="after-run">
          <span className="eyebrow">OS KM ACABARAM. A HISTÓRIA CONTINUA.</span>
          <h3>Esse corre merece uma foto.</h3>
          <p>
            Compartilhe seu registro e encontre as fotos da turma no álbum deste
            encontro.
          </p>
          <div className="detail-links">
            <button className="button primary" onClick={onPost}>
              <Camera size={16} /> Enviar registro
            </button>
            <button className="button secondary" onClick={onAlbum}>
              <Image size={16} /> Ver álbum
            </button>
          </div>
        </div>
      )}
      <ShareTools
        kind="run"
        id={run.id}
        title={run.title}
        run={run}
        group={ended && joined ? group?.name : undefined}
      />
      <p className="microcopy">
        Horário exibido no fuso do dispositivo. O convite é público.
      </p>
      {manager && future && run.status !== "cancelled" && (
        <section className="manage-box">
          <span className="eyebrow">VOCÊ ORGANIZA ESSE CORREFÉ</span>
          <div className="detail-links">
            <button className="button secondary" onClick={onEdit}>
              <Pencil size={15} /> Editar encontro
            </button>
            <button
              className="button secondary"
              onClick={() => setCancel((v) => !v)}
            >
              Cancelar corrida
            </button>
          </div>
          {cancel && (
            <Form
              button="Confirmar cancelamento e avisar participantes"
              onSubmit={async (f) => {
                await store.updateRun(run.id, {
                  status: "cancelled",
                  cancellation_reason: String(f.get("reason")).trim(),
                });
                setCancel(false);
              }}
            >
              <Field label="Motivo e orientações para a turma" name="reason">
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                />
              </Field>
            </Form>
          )}
        </section>
      )}
    </div>
  );
}
export function GroupDetails({
  group,
  store,
  requireAuth,
  act,
  onEdit,
  onRun,
  onAlbum,
  onShop,
  onReport,
  onRemovePost,
}: {
  group: Group;
  onEdit: () => void;
  onRun: (r: Run) => void;
  onAlbum: () => void;
  onShop: () => void;
  onReport: () => void;
  onRemovePost: (id: string) => void;
} & Common) {
  const [removing, setRemoving] = useState(""),
    { data, userId } = store,
    owner = group.owner_id === userId,
    member = data.memberships.some(
      (m) => m.group_id === group.id && m.user_id === userId,
    );
  const reports = data.reports.filter(
    (r) => r.group_id === group.id && r.status === "open",
  );
  return (
    <div className="detail">
      <h1 className="group-detail-logo">{group.name}</h1>
      <p className="line muted">
        <MapPin size={16} />
        {group.city}
      </p>
      <p>{group.description}</p>
      <button
        className="button primary full"
        onClick={() =>
          requireAuth(
            () =>
              void act(
                () => store.toggle("memberships", "group_id", group.id),
                member ? "Você saiu do grupo." : "Você entrou na turma!",
              ),
          )
        }
      >
        {member ? "Sair do grupo" : "Fazer parte da turma"}
      </button>
      <ShareTools kind="group" id={group.id} title={group.name} />
      {group.rules && (
        <div className="organizer-note">
          <span className="eyebrow">COMBINADOS DA TURMA</span>
          <p>{group.rules}</p>
        </div>
      )}
      {group.contact && (
        <p className="form-note">
          <strong>Contato do organizador:</strong> {group.contact}
        </p>
      )}
      <div className="detail-links">
        <button className="button secondary" onClick={onAlbum}>
          <Image size={15} /> Álbum do grupo
        </button>
        <button className="button secondary" onClick={onShop}>
          <ShoppingBag size={15} /> Loja do grupo
        </button>
      </div>
      <h3>Próximos e últimos encontros</h3>
      {data.runs
        .filter((r) => r.group_id === group.id)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
        .map((r) => (
          <button className="group-run-row" key={r.id} onClick={() => onRun(r)}>
            <span>
              <strong>{r.title}</strong>
              <small>
                {dateLabel(r.starts_at)} · {r.distance} km ·{" "}
                {r.status === "cancelled"
                  ? "Cancelada"
                  : runEnded(r)
                    ? "Encerrada"
                    : "Ver detalhes"}
              </small>
            </span>
            <ArrowUpRight size={17} />
          </button>
        ))}
      {owner && (
        <section className="manage-box">
          <span className="eyebrow">PAINEL DO ORGANIZADOR</span>
          <button className="button secondary full" onClick={onEdit}>
            <Pencil size={15} /> Editar grupo, regras e contato
          </button>
          <h3>Membros da turma</h3>
          <p className="microcopy">
            Remover um membro também cancela suas presenças neste grupo. Ele
            poderá solicitar entrada novamente.
          </p>
          {data.memberships
            .filter((m) => m.group_id === group.id)
            .map((m) => (
              <div className="management-row" key={m.user_id}>
                <Avatar
                  size="small"
                  name={
                    data.profiles.find((p) => p.id === m.user_id)?.name ||
                    "Corredor"
                  }
                />
                <span>
                  {data.profiles.find((p) => p.id === m.user_id)?.name ||
                    "Corredor"}
                </span>
                {m.user_id !== userId &&
                  (removing === m.user_id ? (
                    <button
                      className="text-link"
                      onClick={() =>
                        void act(
                          () => store.removeMember(group.id, m.user_id),
                          "Membro removido.",
                        )
                      }
                    >
                      Confirmar remoção
                    </button>
                  ) : (
                    <button
                      className="text-link"
                      onClick={() => setRemoving(m.user_id)}
                    >
                      Remover
                    </button>
                  ))}
              </div>
            ))}
          <h3>Denúncias para revisar</h3>
          <p className="microcopy">
            Relatos sobre este grupo são visíveis para você, como organizador.
            Revisão independente da plataforma deve ser feita pelo suporte.
          </p>
          {reports.length ? (
            reports.map((r) => (
              <div className="report-item" key={r.id}>
                <p>{r.reason}</p>
                <div className="detail-links">
                  {r.post_id && data.posts.some((p) => p.id === r.post_id) && (
                    <button
                      className="button secondary small"
                      onClick={() => onRemovePost(r.post_id!)}
                    >
                      Revisar remoção da publicação
                    </button>
                  )}
                  <button
                    className="button secondary small"
                    onClick={() =>
                      void act(
                        () => store.resolveReport(r.id),
                        "Denúncia marcada como resolvida.",
                      )
                    }
                  >
                    <Check size={14} /> Marcar resolvida
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Nenhuma denúncia em aberto.</p>
          )}
          <h3>Pedidos de interesse</h3>
          {data.orders
            .filter((o) =>
              data.products.some(
                (p) => p.id === o.product_id && p.group_id === group.id,
              ),
            )
            .map((o) => (
              <div className="order-row" key={o.id}>
                <div>
                  <strong>
                    {data.profiles.find((p) => p.id === o.user_id)?.name ||
                      "Corredor"}{" "}
                    · {data.products.find((p) => p.id === o.product_id)?.name}
                  </strong>
                  <p>
                    {o.quantity} un. · {o.size} · {money(o.total_cents)}
                  </p>
                </div>
              </div>
            ))}
        </section>
      )}
      <button className="text-link" onClick={() => requireAuth(onReport)}>
        <Flag size={14} /> Reportar problema com este grupo
      </button>
    </div>
  );
}
export function AfterRunPrompt({
  run,
  group,
  onPost,
  onAlbum,
}: {
  run: Run;
  group: string;
  onPost: () => void;
  onAlbum: () => void;
}) {
  return (
    <section className="after-run home-after-run">
      <span className="eyebrow">SEU ÚLTIMO CORRE</span>
      <h3>{run.title}</h3>
      <p>
        {run.distance} km com {group}. Agora é hora de guardar a história.
      </p>
      <div className="detail-links">
        <button className="button primary small" onClick={onPost}>
          <Camera size={15} /> Compartilhar foto
        </button>
        <button className="button secondary small" onClick={onAlbum}>
          Álbum desse corre
        </button>
      </div>
      <ShareTools
        kind="run"
        id={run.id}
        title={run.title}
        run={run}
        group={group}
      />
    </section>
  );
}
export function NoEntity() {
  return (
    <Empty title="Esse convite não foi encontrado">
      O encontro pode ter sido removido, ou o link está incompleto. Volte para
      explorar os grupos.
    </Empty>
  );
}
