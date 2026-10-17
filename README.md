# CORREFÉ ↗ — comunidade de corrida

React + Vite + TypeScript. Visual preto e branco, mobile-first, contas reais e estrutura para Supabase + Vercel. Nenhum serviço foi criado, contratado ou publicado nesta entrega.

## Rodar agora

Node.js **22.12+** (recomendado: 24 LTS) e npm. Na pasta `correfe`:

```sh
npm ci
npm run dev
```

Abra o endereço mostrado no terminal, normalmente `http://127.0.0.1:5173`.

O aplicativo exige Supabase configurado. Sem as variáveis, mostra um erro de configuração; não existe acesso a uma conta de demonstração.

## O que mudou nesta versão

- **Login e cadastro como páginas próprias:** `/entrar`, `/cadastro`, `/recuperar` e `/nova-senha`, com validação, confirmação de senha, mostrar/ocultar e estados de erro/sucesso. Google e Apple estão **desativados e marcados “em breve”**. Não iniciam OAuth nem simulam login. O adaptador de e-mail/senha já existente foi preservado e preparado para configuração posterior.
- **Descoberta:** filtros combináveis de cidade, bairro, distância, ritmo, iniciantes e “ninguém fica para trás”. Busca ignora acentos. Cidade é informada manualmente; não pedimos localização.
- **Convites públicos:** `/corridas/:id` e `/grupos/:id` abrem sem exigir login. Botões para copiar link e abrir a composição do WhatsApp. O aplicativo não envia mensagens automaticamente. A confirmação de presença em ambiente real exige conta.
- **Encontros:** início e chegada com links para mapas por endereço, duração prevista, bairro, orientações, nível e inclusão. Arquivo `.ics` para adicionar à agenda. O arquivo é uma cópia do encontro naquele momento, sem sincronização com o calendário.
- **Organização:** criador da corrida ou dono do grupo edita/cancela encontros futuros e gerencia presenças. Dono do grupo edita nome, cidade, descrição, regras e contato público; remove membros e suas presenças.
- **Avisos internos:** alterações e cancelamentos geram registros privados para quem confirmou presença. Sino com indicador de não lidos, lista, abertura do encontro e marcação como lido. Não há push, e-mail automático ou execução agendada. Abra/atualize a lista para buscar novos avisos.
- **Depois da corrida:** convite para publicar após o término previsto, seleção do encontro já preenchida, álbum filtrado por corrida e cartão **PNG** de 1080×1350 para baixar e compartilhar. A distância é declarada pelo corredor, sem comprovação GPS.
- **Comunidade:** denúncia de grupo/publicação, acompanhamento pelo denunciante, revisão pelo dono do grupo e remoção de publicações/fotos pelo autor ou dono. Confirmação antes de remover.
- **Privacidade:** perfil público ou privado, aplicado no banco por RLS. No privado, terceiros não leem nome, cidade, bio ou ritmo do perfil. Textos, fotos, grupos e inscrições continuam públicos, como informado na tela.
- **Conta:** fluxo de confirmação de exclusão definitiva e função de servidor preparada. A exclusão real exige publicar/configurar a função separadamente; isso não foi feito.

Continuam disponíveis perfis editáveis, grupos, feed com fotos e curtidas, álbum coletivo e loja por grupo. A loja registra pedidos de interesse, **sem cobrança, estoque, frete ou pagamento online**. Dono vê os pedidos no grupo e comprador os vê no perfil. O total real é calculado pelo banco, não pelo navegador.

## Conectar ao Supabase quando decidir

### Instalação nova

1. Use um projeto Supabase de desenvolvimento, preferencialmente vazio.
2. Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

3. No SQL Editor, execute por inteiro, **na ordem**, uma única vez:
   - `supabase/migrations/20261016235709_initial_corre.sql`
   - `supabase/migrations/20261017000754_community_growth.sql`
4. As migrações criam as tabelas, índices, RLS, triggers, bucket público `run-photos` e políticas de Storage. Não é necessário criar o bucket manualmente.
5. Em Authentication, habilite e-mail/senha e confirmação por e-mail. Ajuste Site URL e Redirect URLs para seu ambiente. Para desenvolvimento: `http://127.0.0.1:5173/entrar` e `http://127.0.0.1:5173/nova-senha`. Adicione os equivalentes do domínio final quando houver publicação.
6. Reinicie o servidor após mudar variáveis. Crie conta, confirme o e-mail, entre e edite o perfil. O ambiente real começa vazio, sem os personagens fictícios.

### Atualização de uma instalação anterior

Se a migração inicial já foi aplicada, execute **somente** `20261017000754_community_growth.sql`. Não repita a primeira. A segunda é incremental e preserva os registros existentes. Faça backup antes de evoluir um banco real.

Também é possível usar o histórico de migrações da CLI oficial, vinculando conscientemente seu projeto e revisando as alterações antes de enviá-las. Não há projeto remoto vinculado neste código. `project_id` em `supabase/config.toml` identifica apenas o projeto local.

A chave `publishable` é pública e vai ao navegador. **Nunca coloque service*role, secret key, senha do banco ou token administrativo em uma variável `VITE*\*`.** As credenciais administrativas só podem existir no servidor. Configuração incompleta ou servidor indisponível mostra erro; não faz fallback silencioso para a demo.

### Google e Apple: próxima etapa

As telas já reservam os botões, mas não há provider habilitado ou credencial OAuth. Para ativar depois, configure cada provider no Supabase e no respectivo console, habilite os handlers e teste callbacks no domínio correto. Na entrega atual os botões ficam desativados para não prometer um acesso inexistente.

## Exclusão de conta no servidor (opcional; não publicada)

Código: `supabase/functions/delete-account/index.ts`.

A função recebe apenas a confirmação, valida o usuário via `auth.getUser(token)`, usa o ID do token (nunca um ID fornecido pelo cliente), recolhe as fotos afetadas, revoga sessões e exclui o usuário. O banco remove os dados associados por cascata. Fotos, registros e pedidos dos grupos que a pessoa organiza também podem ser removidos; isso é informado antes da confirmação.

O `config.toml` delega a validação do JWT para a função (`verify_jwt=false` no gateway), e a função exige e valida o bearer token em toda operação POST. **Não remova essa validação.** CORS aceita apenas o domínio definido em `ALLOWED_ORIGIN`; o padrão é o endereço local de desenvolvimento.

Quando quiser ativar, usando a CLI oficial e seu projeto correto:

```sh
supabase secrets set ALLOWED_ORIGIN=https://SEU-DOMINIO --project-ref SEU_REF
supabase functions deploy delete-account --project-ref SEU_REF
```

A plataforma disponibiliza `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ao ambiente da função. Não copie a chave para o frontend. Não execute os comandos acima antes de decidir publicar e revisar seu projeto. Nenhum deles foi executado nesta entrega.

Sem essa função publicada, a tela informa que não foi possível concluir a exclusão real; não mostra sucesso falso. A limpeza de Storage e Auth não é uma transação única. Em falha parcial, algumas fotos podem ter sido removidas: a mensagem orienta entrar novamente e concluir a exclusão. Teste esse fluxo em projeto de desenvolvimento antes de abrir ao público.

## Modelo e acesso

| Tabela        | Acesso principal                                                               |
| ------------- | ------------------------------------------------------------------------------ |
| profiles      | Público por padrão; privado apenas para o próprio usuário; edição própria      |
| groups        | Leitura pública; criação pelo dono; dono edita campos permitidos               |
| memberships   | Leitura pública; usuário entra/sai; dono pode remover membros                  |
| runs          | Leitura pública; membro cria; criador/dono edita ou cancela encontros futuros  |
| participants  | Leitura pública; próprio membro confirma antes do início; organizador gerencia |
| posts         | Leitura pública; membro publica; autor/dono remove                             |
| likes         | Leitura pública; própria curtida                                               |
| products      | Catálogo público; dono adiciona                                                |
| orders        | Comprador cria; comprador e dono leem; preço calculado no banco                |
| notifications | Somente destinatário lê e altera `read_at`; trigger interno cria               |
| reports       | Denunciante e dono leem; denunciante cria; dono altera apenas status           |

Há RLS em todas as onze tabelas e permissões explícitas de coluna para impedir troca de dono/criador ou alteração do conteúdo de um aviso. As funções privilegiadas de trigger ficam no schema `private`, com `search_path` fixo e execução pública revogada. Metadados editáveis de usuário não autorizam operações.

Fotos JPG/PNG/WebP até 5 MB. O bucket é público, a escrita exige pasta do próprio usuário e perfil existente. Autor ou dono do grupo pode remover a imagem de uma publicação. A interface mostra fotos em preto e branco, preservando o arquivo original. Exclusão não desfaz cópias feitas por terceiros ou caches externos.

As denúncias são encaminhadas ao **organizador do grupo**. Não há uma equipe independente ou sistema de atendimento fictício. Relatos contra o próprio organizador exigem revisão pelo responsável da plataforma através de suas ferramentas administrativas. Defina um canal de suporte e uma política de moderação antes da abertura pública.

## Testes e verificação

```sh
npm test
npm run build
npm run preview
```

- **24 testes** com Vitest: migrações reais no Postgres em memória (PGlite), RLS, perfil privado, edição, cancelamento, avisos, denúncias, moderação, pedidos, filtros, calendário e cartão.
- **4 testes de proteção da função** com Deno, sem rede ou credenciais reais:

```sh
deno check supabase/functions/delete-account/index.ts
deno test --allow-env supabase/functions/delete-account/index_test.ts
```

Os testes Deno cobrem origem, preflight, método e ausência de token. Não executam exclusão de usuário real. Auth/Storage dos testes SQL são simulados; o banco PGlite é só uma ferramenta de teste, não o armazenamento do aplicativo.

**Sem credenciais, não foram verificados e-mail real, OAuth, persistência remota, Storage HTTP ou exclusão real de conta.** O build e as verificações locais não substituem esse aceite.

### Roteiro para testar com um grupo piloto

1. Conta A cria grupo, regras, encontro futuro, localização e produto. Visitante abre os links diretos sem login.
2. Conta B entra no grupo e confirma presença. A altera o encontro: B atualiza Avisos, vê a mudança e abre os detalhes.
3. A cancela um encontro: inscrições novas ficam bloqueadas, mensagem aparece e B recebe aviso interno.
4. B publica foto após o término previsto; A vê no feed e no álbum da corrida. B baixa o PNG e o calendário.
5. B denuncia uma publicação. A revisa no painel do grupo; conta C não consegue ler a denúncia. A remove a publicação e a foto.
6. B torna o perfil privado. A/visitante não leem o perfil; publicações continuam públicas. B vê e edita o próprio perfil.
7. B pede produto: somente B e A veem o pedido. Recarregar preserva dados reais. Logout impede acesso aos pedidos privados.
8. Em conta descartável, teste recuperação e exclusão depois de configurar a função. Confira dados e fotos removidos.
9. Faça dois ou três encontros com uma turma pequena e observe: convite aberto → presença confirmada → comparecimento → foto enviada → confirmação do próximo encontro. Não há rastreamento ou envio de analytics automático.

## Deploy futuro na Vercel

Nada foi publicado. Quando decidir:

1. Envie esta pasta para um repositório incluindo `package-lock.json`, sem `.env.local`, `node_modules`, chaves ou tokens.
2. Importe na Vercel. Se o repositório contiver uma pasta `correfe`, selecione-a como **Root Directory**.
3. Framework **Vite**, Node **24.x**, install `npm ci`, build `npm run build`, output `dist`.
4. Defina as variáveis públicas do Supabase nos ambientes desejados. Elas entram no build; alterações exigem novo deploy. Sem variáveis, o aplicativo mostra um erro de configuração.
5. `vercel.json` já tem fallback das rotas da SPA (`/entrar`, `/corridas/:id`, etc.) e headers básicos.
6. Configure Site URL/Redirect URLs do Supabase e, se ativar a função de exclusão, `ALLOWED_ORIGIN` para o domínio exato.
7. Execute o roteiro de aceite. Não há plano pago, assinatura ou cobrança contratado pelo código.

Convites têm páginas próprias no cliente e são acessíveis por link. Previews de redes sociais usam metadados genéricos do CORREFÉ; previews personalizados por corrida exigem renderização no servidor ou endpoint específico, não incluído nesta SPA.

## Estrutura

```text
src/App.tsx                        composição das telas e navegação
src/components/AuthPage.tsx        login, cadastro, recuperação e nova senha
src/components/CommunityDetails.tsx convites, organização e pós-corrida
src/components/DiscoveryFilters.tsx descoberta por local e ritmo
src/components/RunForm.tsx         criação e edição reutilizáveis
src/components/ShareTools.tsx      links, WhatsApp, calendário e cartão PNG
src/components/AccountSettings.tsx privacidade e confirmação de exclusão
src/components/forms.tsx           campos e formulário assíncrono
src/components/ui.tsx              modal, avatar, títulos e estados vazios
src/lib/useCorre.ts                operações Supabase
src/lib/community.ts               filtros, calendário, mapas e cartão
src/lib/routing.ts                 rotas e histórico sem dependência adicional
src/lib/demo.ts                    dados fictícios em memória
supabase/migrations/               instalação e evolução do banco
supabase/tests/                    testes de autorização e integridade
supabase/functions/delete-account/ função protegida + testes Deno
.env.example                       nomes de variáveis, sem credenciais
vercel.json                        configuração para publicação futura
```

## Limites do MVP

Sem OAuth ativado, pagamento, estoque, chat, seguidores, push, grupos privados, rastreamento GPS, analytics ou preview social por encontro no servidor. Remoção de membro não equivale a banimento; ele pode voltar a entrar. O app não confirma presença física nem valida a distância percorrida.

Consultas carregam até 500 registros por tabela; ainda não há paginação/cursor nem realtime. Para crescer, implemente consultas por tela, paginação e uma revisão independente de moderação. Defina sua política de privacidade e suporte antes de abrir para o público. Edição/remoção de catálogo e grupos inteiros ainda depende de manutenção administrativa, fora do fluxo atual.

A logo em `public/brand-logo.jpg` foi fornecida pelo usuário; é exibida com enquadramento circular em CSS/SVG, sem redesenho. A direção visual usa a referência pública [@\_correfe](https://www.instagram.com/_correfe/): coletivo de corrida, preto e branco, camisetas e linguagem urbana. O banco real inicia sem grupos, pessoas ou corridas de exemplo. As ilustrações de produtos são mockups, não o catálogo real do Instagram.

Ilustrações SVG locais originais; fontes do Google Fonts com fallback se a rede estiver indisponível. Não há bibliotecas de mapas ou serviços pagos embutidos.

Referências: [Auth](https://supabase.com/docs/reference/javascript/auth-signup), [recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [segurança de funções](https://supabase.com/docs/guides/functions/auth).


### Busca de corredores e instalação simplificada

Veja `PUBLICAR.md`. Em um projeto Supabase novo, execute `supabase/INSTALAR_PROJETO_NOVO.sql` no SQL Editor uma vez. Em uma base existente, aplique apenas as migrações pendentes; a terceira adiciona a busca pública por nome/cidade com paginação e respeito à privacidade. A barra no topo abre `/pessoas` e os resultados abrem `/pessoas/:id`.


### Contas reais, foto e tênis

O acesso de demonstração foi desativado, inclusive quando faltam variáveis: nesse caso o aplicativo informa erro de configuração. `VITE_DEMO_MODE` não ativa mais contas fictícias. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

Se já executou as três migrações anteriores, execute apenas `supabase/migrations/20261017011946_runner_identity.sql` no SQL Editor. Para projeto novo, o instalador completo já inclui as quatro migrações; não execute ambos. Reimplante a função `delete-account` para incluir a limpeza dos avatares.

Entre com sua conta → Perfil → Editar perfil. Envie JPG, PNG ou WebP de até 5 MB e informe a marca/modelo do tênis (opcional). É possível trocar ou remover a foto. Foto e tênis aparecem no perfil público; a foto também aparece no feed e na busca. Os avatares ficam em bucket privado com leitura autorizada por RLS e links temporários de até uma hora; um link já emitido continua válido até expirar após mudar a privacidade. Só o dono pode enviar e apagar arquivos na própria pasta. Não há registro de quilometragem por tênis nesta versão.
