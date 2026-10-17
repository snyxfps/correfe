import { cloneElement, isValidElement, useId, useState } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  children?: ReactNode;
};
export function Field({ label, children, ...props }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children && isValidElement(children) ? (
        cloneElement(children as ReactElement<{ id?: string }>, { id })
      ) : (
        <input id={id} {...props} />
      )}
    </div>
  );
}
export function Form({
  children,
  onSubmit,
  button = "Salvar",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  button?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(new FormData(e.currentTarget));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Algo deu errado. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form">
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} /> : null}
        {busy ? "Aguarde…" : button}
      </button>
    </form>
  );
}
