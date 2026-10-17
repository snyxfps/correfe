import { Field, Form } from "./forms";
import type { Group, Run } from "../lib/types";
export function RunForm({
  groups,
  run,
  onSave,
}: {
  groups: Group[];
  run?: Run;
  onSave: (value: Partial<Run>) => Promise<void>;
}) {
  const local = (v: string) => {
    const d = new Date(v);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <Form
      button={run ? "Salvar alterações e avisar a turma" : "Marcar esse corre"}
      onSubmit={async (f) => {
        const date = new Date(String(f.get("starts_at")));
        if (!Number.isFinite(date.getTime()) || date <= new Date())
          throw new Error("Escolha uma data futura.");
        await onSave({
          ...(run ? {} : { group_id: String(f.get("group_id")) }),
          title: String(f.get("title")).trim(),
          starts_at: date.toISOString(),
          start_point: String(f.get("start_point")).trim(),
          end_point: String(f.get("end_point")).trim(),
          distance: Number(f.get("distance")),
          pace: String(f.get("pace")).trim(),
          description: String(f.get("description")).trim(),
          neighborhood: String(f.get("neighborhood")).trim(),
          duration_minutes: Number(f.get("duration_minutes")),
          beginner_friendly: f.get("beginner") === "on",
          no_one_left_behind: f.get("inclusive") === "on",
        });
      }}
    >
      {!run && (
        <Field label="Grupo" name="group_id">
          <select name="group_id" required>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field
        label="Nome da corrida"
        name="title"
        defaultValue={run?.title}
        required
      />
      <Field
        label="Data e horário local"
        name="starts_at"
        type="datetime-local"
        defaultValue={run ? local(run.starts_at) : undefined}
        required
      />
      <div className="form-grid">
        <Field
          label="Distância (km)"
          name="distance"
          type="number"
          min="0.1"
          max="300"
          step="0.1"
          defaultValue={run?.distance}
          required
        />
        <Field
          label="Ritmo (min/km)"
          name="pace"
          defaultValue={run?.pace}
          placeholder="6:00–7:00"
          required
        />
      </div>
      <Field
        label="Bairro"
        name="neighborhood"
        defaultValue={run?.neighborhood}
        placeholder="Centro Histórico"
        required
      />
      <Field
        label="Ponto de início e endereço"
        name="start_point"
        defaultValue={run?.start_point}
        placeholder="Entrada principal, rua e número"
        required
      />
      <Field
        label="Ponto de chegada e endereço"
        name="end_point"
        defaultValue={run?.end_point}
        required
      />
      <Field
        label="Duração prevista (minutos)"
        name="duration_minutes"
        type="number"
        min="10"
        max="1440"
        defaultValue={run?.duration_minutes ?? 60}
        required
      />
      <Field label="Orientações para o encontro" name="description">
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={run?.description}
          placeholder="Como reconhecer a turma, água, horário de chegada…"
        />
      </Field>
      <div className="check-stack">
        <label>
          <input
            type="checkbox"
            name="beginner"
            defaultChecked={run?.beginner_friendly}
          />{" "}
          Adequada para iniciantes
        </label>
        <label>
          <input
            type="checkbox"
            name="inclusive"
            defaultChecked={run?.no_one_left_behind}
          />{" "}
          Ninguém fica para trás
        </label>
      </div>
      <p className="form-note">
        Horário no fuso do dispositivo. O ponto será aberto por endereço no
        aplicativo de mapas; confira se está correto. Edições geram avisos
        dentro do CORREFÉ para quem confirmou presença.
      </p>
    </Form>
  );
}
