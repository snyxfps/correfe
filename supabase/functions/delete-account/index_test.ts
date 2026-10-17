import { handleDeleteAccount } from "./index.ts";
const assert = (value: boolean, message: string) => {
  if (!value) throw new Error(message);
};
Deno.test(
  "exclusão: origem inválida é rejeitada antes de autenticação",
  async () => {
    Deno.env.set("ALLOWED_ORIGIN", "https://corre.test");
    const res = await handleDeleteAccount(
      new Request("https://edge.test", {
        method: "POST",
        headers: { origin: "https://intruso.test" },
      }),
    );
    assert(res.status === 403, "Esperado 403");
  },
);
Deno.test(
  "exclusão: preflight permite somente a origem configurada",
  async () => {
    Deno.env.set("ALLOWED_ORIGIN", "https://corre.test");
    const res = await handleDeleteAccount(
      new Request("https://edge.test", {
        method: "OPTIONS",
        headers: { origin: "https://corre.test" },
      }),
    );
    assert(res.status === 204, "Esperado 204");
    assert(
      res.headers.get("Access-Control-Allow-Origin") === "https://corre.test",
      "CORS precisa ser restrito",
    );
  },
);
Deno.test("exclusão: acesso sem token não executa a operação", async () => {
  Deno.env.set("ALLOWED_ORIGIN", "https://corre.test");
  const res = await handleDeleteAccount(
    new Request("https://edge.test", {
      method: "POST",
      headers: { origin: "https://corre.test" },
    }),
  );
  assert(res.status === 401, "Esperado 401");
});
Deno.test("exclusão: método incorreto não executa a operação", async () => {
  Deno.env.set("ALLOWED_ORIGIN", "https://corre.test");
  const res = await handleDeleteAccount(
    new Request("https://edge.test", {
      headers: { origin: "https://corre.test" },
    }),
  );
  assert(res.status === 405, "Esperado 405");
});
