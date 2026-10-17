import { useState } from "react";
import type { Profile } from "../lib/types";
import { Field, Form } from "./forms";
import { isDemo } from "../lib/client";
export function AccountSettings({
  profile,
  onSave,
  onDelete,
}: {
  profile: Profile;
  onSave: (p: Profile) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false),
    [saved, setSaved] = useState(false);
  return (
    <div className="detail">
      <p className="muted">
        Você decide como seu perfil aparece para a comunidade.
      </p>
      <Form
        button="Salvar privacidade"
        onSubmit={async (f) => {
          await onSave({
            ...profile,
            visibility: String(f.get("visibility")) as "public" | "private",
          });
          setSaved(true);
        }}
      >
        <Field label="Visibilidade do perfil" name="visibility">
          <select
            name="visibility"
            defaultValue={profile.visibility ?? "public"}
          >
            <option value="public">Público — nome, cidade, bio e ritmo</option>
            <option value="private">Privado — apenas você vê seu perfil</option>
          </select>
        </Field>
        <p className="form-note">
          Ao tornar o perfil privado, outras pessoas veem “Corredor” nas
          publicações. Seus textos, fotos, inscrições e grupos continuam
          públicos. Para removê-los, exclua as publicações ou a conta. Fotos já
          compartilhadas podem ter sido copiadas por terceiros.
        </p>
      </Form>
      {saved && (
        <p role="status" className="microcopy">
          Preferência salva{isDemo ? " apenas nesta demonstração" : ""}.
        </p>
      )}
      <section className="danger-zone">
        <h3>Excluir minha conta</h3>
        <p>
          Remove o acesso, perfil, seus registros, pedidos e grupos que você
          organiza. Os registros desses grupos também são removidos, incluindo
          os de outros participantes. A exclusão é definitiva.
        </p>
        {!confirm ? (
          <button className="button secondary" onClick={() => setConfirm(true)}>
            Quero excluir minha conta
          </button>
        ) : (
          <Form
            button={
              isDemo
                ? "Encerrar sessão fictícia"
                : "Excluir conta definitivamente"
            }
            onSubmit={async (f) => {
              if (f.get("confirmation") !== "EXCLUIR")
                throw new Error("Digite EXCLUIR para confirmar.");
              await onDelete();
            }}
          >
            <Field
              label="Digite EXCLUIR para confirmar"
              name="confirmation"
              required
            />
            {isDemo && (
              <p className="form-note">
                Na demonstração, isso apenas encerra o perfil fictício da
                sessão. Não existe conta real para excluir.
              </p>
            )}
          </Form>
        )}
      </section>
    </div>
  );
}
