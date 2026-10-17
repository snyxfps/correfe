# Publicar o CORREFÉ no GitHub e na Vercel

Repositório: https://github.com/snyxfps/correfe

O repositório estava vazio na conferência. Nenhum arquivo foi enviado, nenhuma migração foi aplicada no projeto remoto e nenhum deploy foi feito por esta conversa.

A configuração local já foi preenchida em `.env.local`, ignorado pelo Git, com a URL e a publishable key enviadas. O `.env.example` continua sem valores. A chave publishable pode ser usada no frontend; nunca substitua por service_role/secret key.

## 1. Preparar o banco primeiro

No painel do seu projeto Supabase `xsfyifslgyynfegdppun`, abra SQL Editor e execute os arquivos na ordem:

1. `supabase/migrations/20261016235709_initial_corre.sql`
2. `supabase/migrations/20261017000754_community_growth.sql`

Execute cada migração uma única vez. Se a primeira já tiver sido aplicada, não a repita: aplique apenas a segunda. A consulta de leitura feita nesta preparação recebeu PGRST205 para profiles, groups e runs: essas tabelas ainda não estão disponíveis na API. Se já existem no SQL Editor, confira o schema público e as permissões das migrações em vez de tentar recriá-las.

As migrações criam tabelas, políticas RLS, índices, triggers e o bucket de fotos. A URL e a chave pública não permitem criar esse banco pelo aplicativo.

## 2. Enviar o projeto ao GitHub

No Terminal, dentro da pasta do projeto (a que contém `package.json`), execute:

```sh
git init -b main
git add .
git commit -m "Initial CORREFE app"
git remote add origin https://github.com/snyxfps/correfe.git
git push -u origin main
```

Esses comandos pressupõem a pasta local ainda sem Git e o repositório remoto vazio, como na conferência. Eles não usam force-push. Se o Git pedir autenticação, entre pelo fluxo do GitHub/GitHub Desktop ou use suas credenciais no próprio gerenciador; não cole senhas/tokens no código ou nesta conversa.

Se estiver usando a cópia atual deste computador, comece por:

```sh
cd "/Users/snyxfps/Documents/Codex/2026-10-16/referenced-chatgpt-conversation-this-is-an/outputs/corre"
```

Alternativa: no GitHub Desktop, adicione esta pasta como repositório local, crie o primeiro commit e use o remoto acima. Mantenha o conteúdo do projeto na raiz do repositório: `package.json`, `src`, `public` e `supabase` devem aparecer imediatamente ao abrir o repo.

O `.gitignore` já exclui `.env.local`, `node_modules`, `dist`, `.vercel`, cache da CLI Supabase e arquivos temporários. Não envie o ZIP como se fosse o código do projeto.

## 3. Importar na Vercel

Na Vercel, escolha Add New → Project, conecte seu GitHub e importe `snyxfps/correfe`.

| Campo | Valor |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `.` (raiz, se você seguiu o passo anterior) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x |

Se você enviou a pasta `correfe` inteira para dentro do repositório, use `correfe` como Root Directory. O critério é selecionar a pasta que contém `package.json`.

Antes de clicar Deploy, cadastre as variáveis em Environment Variables:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://xsfyifslgyynfegdppun.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | A publishable key já preenchida no `.env.local` deste projeto |

Para o primeiro ambiente, use Production. Configure Preview/Development conforme precisar; para previews independentes prefira um banco de teste. As variáveis entram no build do Vite; se alterar um valor depois, faça Redeploy. O `.env.local` não será enviado ao GitHub nem importado automaticamente pela Vercel.

O `vercel.json` já prepara o fallback da SPA e os headers. A Vercel publicará a partir do código e passará a criar novos builds quando você enviar commits para a branch de produção.

## 4. Configurar os retornos de autenticação

Depois de a Vercel fornecer a URL real, no Supabase abra Authentication → URL Configuration:

- Site URL: a URL raiz publicada, sem caminhos extras.
- Redirect URLs: adicione `https://SEU-DOMINIO/entrar` e `https://SEU-DOMINIO/nova-senha`.
- Para desenvolvimento: `http://127.0.0.1:5173/entrar` e `http://127.0.0.1:5173/nova-senha`.

Em Authentication → Providers habilite e-mail/senha e confirmação de e-mail. Google e Apple continuam desativados no aplicativo até a etapa de integração dos providers.

A exclusão real da conta exige a função Supabase `delete-account`, separada do deploy da Vercel. Ela não é necessária para abrir o aplicativo, mas o recurso de exclusão não estará operacional até a ativação descrita no README. Não habilite chaves administrativas no frontend para contornar isso.

## 5. Testar

Para rodar localmente com a configuração preenchida:

```sh
npm ci
npm run dev
```

Aplique o banco antes de esperar o feed real funcionar. Com Supabase ativo, o banco começa vazio, sem as pessoas/corridas da demonstração. Crie uma conta, confirme o e-mail, crie um grupo e marque uma corrida. Depois teste com outra conta, como descrito no README.

O acesso de demonstração foi removido. Sem configuração válida do Supabase, o aplicativo informa o erro.

Referências: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) e [redirecionamentos do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).


## Atualização: busca de corredores

A barra no topo pesquisa por nome ou cidade (inclusive sem acentos), com paginação de 20 perfis. Os resultados abrem um perfil público. Perfis privados e e-mails não aparecem nos resultados.

**Projeto Supabase novo:** abra SQL Editor → New query, copie todo o conteúdo de `supabase/INSTALAR_PROJETO_NOVO.sql` e clique Run. Esse arquivo instala as cinco migrações juntas, em uma transação. Não execute também as migrações individualmente.

**Se já instalou a base:** execute somente os arquivos ainda não aplicados de `supabase/migrations`, em ordem. Se já executou os dois primeiros, falta apenas `20261017004237_runner_search.sql`. O instalador completo recusa uma base já existente para evitar recriar tabelas.

Depois, em Authentication → Providers, habilite Email. Configure Authentication → URL Configuration com Site URL `http://localhost:5173` durante o desenvolvimento e adicione os redirects `http://localhost:5173/entrar` e `http://localhost:5173/nova-senha`. Na produção, adicione também os endereços equivalentes do domínio da Vercel e use esse domínio como Site URL. O Google depende da configuração do provedor. A opção Apple foi removida.

Reinicie o aplicativo após configurar `.env.local`. Crie sua conta pela tela Cadastro; confirme o e-mail se a confirmação estiver habilitada. O SQL cria o perfil automaticamente. Edite nome, cidade e ritmo em Perfil. Para testar a busca, cadastre uma segunda conta com perfil público: não são inseridas pessoas fictícias no banco real.

A função de exclusão de conta precisa ser publicada separadamente, conforme README. Ela não é necessária para o cadastro, login por senha e busca. Nenhum SQL foi aplicado remotamente por este projeto.


### Contas reais, foto e tênis

O acesso de demonstração foi desativado, inclusive quando faltam variáveis: nesse caso o aplicativo informa erro de configuração. `VITE_DEMO_MODE` não ativa mais contas fictícias. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Se já executou as três migrações anteriores, execute apenas `supabase/migrations/20261017011946_runner_identity.sql` no SQL Editor. Para projeto novo, o instalador completo já inclui as cinco migrações; não execute ambos. Reimplante a função `delete-account` para incluir a limpeza dos avatares.

Entre com sua conta → Perfil → Editar perfil. Envie JPG, PNG ou WebP de até 5 MB e informe a marca/modelo do tênis (opcional). É possível trocar ou remover a foto. Foto e tênis aparecem no perfil público; a foto também aparece no feed e na busca. Os avatares ficam em bucket privado com leitura autorizada por RLS e links temporários de até uma hora; um link já emitido continua válido até expirar após mudar a privacidade. Só o dono pode enviar e apagar arquivos na própria pasta. Não há registro de quilometragem por tênis nesta versão.


### Login social

Consulte `LOGIN-SOCIAL.md` para ativar o provedor Google no Supabase e cadastrar os retornos corretos. O código já inicia OAuth e processa o retorno; a ativação exige as credenciais das suas contas. Google ainda desabilitado no projeto não autenticam usuários.
