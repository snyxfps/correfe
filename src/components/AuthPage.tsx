import { Brand, LogoMark } from "./Brand";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Field, Form } from "./forms";
import { isDemo, supabase } from "../lib/client";
export type AuthMode = "login" | "signup" | "recover" | "reset";
export function AuthPage({
  mode,
  go,
  onDemo,
  onSuccess,
}: {
  mode: AuthMode;
  go: (path: string) => void;
  onDemo: () => void;
  onSuccess: () => void;
}) {
  const [visible, setVisible] = useState(false),
    [message, setMessage] = useState("");
  const title = {
    login: (
      <>
        Seu próximo corre
        <br />
        <em>começa aqui.</em>
      </>
    ),
    signup: (
      <>
        Tem uma turma
        <br />
        <em>esperando você.</em>
      </>
    ),
    recover: (
      <>
        Vamos recuperar
        <br />
        <em>seu acesso.</em>
      </>
    ),
    reset: (
      <>
        Um novo acesso.
        <br />
        <em>O mesmo ritmo.</em>
      </>
    ),
  }[mode];
  return (
    <main className="auth-page">
      <section className="auth-story">
        <LogoMark className="auth-motion-logo" />
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go("/");
          }}
        >
          <Brand />
        </a>
        <div className="auth-story-copy">
          <span className="eyebrow">MENOS TELA. MAIS RUA.</span>
          <h1>
            O PRIMEIRO PASSO <br />É MELHOR <br />
            <em>JUNTO.</em>
          </h1>
          <p>
            Encontre sua turma. Combine o próximo encontro.
            <br />
            Guarde as histórias que só a rua conta.
          </p>
        </div>
        <div className="auth-story-footer">
          <span>SEU RITMO. SUA TURMA.</span>
          <span>01 / BORA COMEÇAR</span>
        </div>
      </section>
      <section className="auth-content">
        <button className="text-link auth-back" onClick={() => go("/")}>
          <ArrowLeft size={16} /> Explorar o CORREFÉ
        </button>
        <div className="auth-form-wrap">
          <p className="eyebrow">
            {mode === "signup"
              ? "TODO RITMO TEM LUGAR AQUI"
              : "BEM-VINDO À TURMA"}
          </p>
          <h2>{title}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Entre para transformar o próximo treino em um encontro."
              : mode === "signup"
                ? "Sua comunidade de corrida começa com você."
                : mode === "recover"
                  ? "Informe seu e-mail para receber as orientações."
                  : "Defina uma nova senha para a sua conta."}
          </p>
          {isDemo && (
            <div className="auth-demo">
              <ShieldCheck size={17} />
              <span>
                Você está vendo uma demonstração. Nenhuma conta será criada e
                nenhum e-mail será enviado.
              </span>
            </div>
          )}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="social-buttons">
                <button disabled className="social-button">
                  <span className="google-symbol">G</span> Continuar com Google{" "}
                  <small>EM BREVE</small>
                </button>
                <button disabled className="social-button">
                  <AppleLogo /> Continuar com Apple <small>EM BREVE</small>
                </button>
              </div>
              <div className="auth-divider">
                <span>ou com seu e-mail</span>
              </div>
            </>
          )}
          {message ? (
            <div role="status" className="auth-success">
              <Mail size={30} />
              <h3>
                {mode === "signup"
                  ? "Confira seu e-mail"
                  : "Próximo passo enviado"}
              </h3>
              <p>{message}</p>
              <button
                className="button secondary full"
                onClick={() => {
                  setMessage("");
                  go("/entrar");
                }}
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <Form
              key={mode}
              button={
                mode === "login"
                  ? "Entrar no CORREFÉ"
                  : mode === "signup"
                    ? "Criar minha conta"
                    : mode === "recover"
                      ? "Enviar orientações"
                      : "Salvar nova senha"
              }
              onSubmit={async (f) => {
                if (!supabase)
                  throw new Error(
                    "O acesso real será ativado ao conectar o Supabase. Use Explorar demonstração para conhecer o app.",
                  );
                const email = String(f.get("email") || "").trim(),
                  password = String(f.get("password") || "");
                if (mode === "signup" && password !== f.get("confirmation"))
                  throw new Error("As senhas precisam ser iguais.");
                if (mode === "login") {
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error)
                    throw new Error(
                      "Não foi possível entrar. Confira seu e-mail e senha.",
                    );
                  onSuccess();
                } else if (mode === "signup") {
                  const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { name: String(f.get("name")).trim() },
                      emailRedirectTo: window.location.origin + "/entrar",
                    },
                  });
                  if (error)
                    throw new Error(
                      "Não foi possível criar a conta. Confira seus dados e tente novamente.",
                    );
                  if (data.session) onSuccess();
                  else
                    setMessage(
                      "Se o cadastro foi aceito, você receberá um link para confirmar seu e-mail. Depois, volte para entrar.",
                    );
                } else if (mode === "recover") {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email,
                    { redirectTo: window.location.origin + "/nova-senha" },
                  );
                  if (error)
                    throw new Error(
                      "Não foi possível solicitar a recuperação. Tente novamente.",
                    );
                  setMessage(
                    "Se houver uma conta para esse e-mail, você receberá as instruções de recuperação.",
                  );
                } else {
                  if (password !== f.get("confirmation"))
                    throw new Error("As senhas precisam ser iguais.");
                  const { data } = await supabase.auth.getUser();
                  if (!data.user)
                    throw new Error(
                      "Abra esta tela pelo link de recuperação recebido por e-mail.",
                    );
                  const { error } = await supabase.auth.updateUser({
                    password,
                  });
                  if (error)
                    throw new Error(
                      "O link pode ter expirado. Solicite a recuperação novamente.",
                    );
                  await supabase.auth.signOut();
                  go("/entrar");
                }
              }}
            >
              {mode === "signup" && (
                <Field label="Seu nome" name="name">
                  <input
                    name="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Como a turma vai chamar você?"
                  />
                </Field>
              )}
              {mode !== "reset" && (
                <Field label="E-mail" name="email">
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                  />
                </Field>
              )}
              {mode !== "recover" && (
                <>
                  <div className="field">
                    <label htmlFor="auth-password">
                      {mode === "reset" ? "Nova senha" : "Senha"}
                    </label>
                    <div className="password-wrap">
                      <input
                        aria-label={mode === "reset" ? "Nova senha" : "Senha"}
                        name="password"
                        id="auth-password"
                        type={visible ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={72}
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        placeholder="Pelo menos 8 caracteres"
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setVisible((v) => !v)}
                      >
                        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  {(mode === "signup" || mode === "reset") && (
                    <Field label="Confirmar senha" name="confirmation">
                      <input
                        name="confirmation"
                        type={visible ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={72}
                        autoComplete="new-password"
                        placeholder="Repita sua senha"
                      />
                    </Field>
                  )}
                </>
              )}
              {mode === "login" && (
                <button
                  type="button"
                  className="text-link forgot-link"
                  onClick={() => go("/recuperar")}
                >
                  Esqueci minha senha <ArrowUpRight size={13} />
                </button>
              )}
              {mode === "signup" && (
                <p className="microcopy">
                  Seu perfil começa público. Depois você pode torná-lo privado
                  em Conta e privacidade. Nunca publique endereço residencial ou
                  dados sensíveis nas descrições.
                </p>
              )}
            </Form>
          )}
          {(mode === "login" || mode === "signup") && (
            <p className="auth-switch">
              {mode === "login"
                ? "Ainda não faz parte da turma?"
                : "Já tem uma conta?"}{" "}
              <button
                className="plain"
                onClick={() => {
                  setMessage("");
                  go(mode === "login" ? "/cadastro" : "/entrar");
                }}
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          )}
          {isDemo && (
            <button className="button demo-explore full" onClick={onDemo}>
              Explorar demonstração <ArrowUpRight size={17} />
            </button>
          )}
          <p className="auth-footnote">
            Google e Apple serão conectados na próxima etapa. O acesso por
            e-mail depende do Supabase configurado.
          </p>
        </div>
      </section>
    </main>
  );
}
function AppleLogo() {
  return (
    <svg width="21" height="23" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 12c0-2 1-3 2-4-1-2-3-2-4-2-2 0-3 1-4 1S9 6 7 6C3 6 1 11 3 16c1 3 3 6 5 6 1 0 2-1 3-1s2 1 4 1c2 0 4-4 5-6-2-1-3-2-3-4ZM15 1c-2 0-4 2-4 5 3 0 5-3 4-5Z"
      />
    </svg>
  );
}
