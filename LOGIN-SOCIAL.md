# Ativar Google no CORREFÉ

O código já usa Supabase Auth com `signInWithOAuth`, processa a sessão em `/auth/retorno`, permite voltar ao convite original e mostra erro claro quando o provedor não foi habilitado. Nenhuma senha ou chave privada de provedor deve ir ao GitHub ou a variáveis VITE.

## Google — começar por aqui

Criar conta/projeto no Google Cloud é gratuito para este preparo. Este login não exige contratar servidores, Maps ou serviços pagos do Google.

1. Entre em https://console.cloud.google.com/ usando o Gmail que administrará o CORREFÉ. No seletor de projetos no topo, veja os projetos existentes ou crie `CORREFÉ`.
2. Abra Google Auth Platform. Em Branding, informe CORREFÉ, e-mail de suporte e contato do responsável. Use o endereço real do aplicativo nos campos de site. Preencha os campos exigidos; não invente URLs de política de privacidade ou termos.
3. Em Audience, escolha External. Enquanto estiver em Testing, adicione seu Gmail e os outros testadores à lista Test users. Para liberar para o público, publique o aplicativo OAuth e conclua as verificações que o Google solicitar.
4. Em Data Access, mantenha somente os escopos de login: `openid`, `email` e `profile`.
5. Em Clients → Create client, escolha Web application.
6. Em Authorized JavaScript origins, adicione a origem exata do seu site (ex.: `https://SEU-DOMINIO.vercel.app`, substituindo pelo domínio real). Para desenvolvimento, pode adicionar `http://localhost:5173` e `http://127.0.0.1:5173`.
7. Em Authorized redirect URIs, adicione exatamente:

```
https://xsfyifslgyynfegdppun.supabase.co/auth/v1/callback
```

8. Copie Client ID e Client Secret para **Supabase → Authentication → Sign In / Providers → Google**. Habilite Google e salve. Cole o segredo somente no painel do Supabase; não envie pelo chat nem coloque no frontend.
9. Em **Supabase → Authentication → URL Configuration**, use o domínio real da produção em Site URL. Em Redirect URLs adicione `https://SEU-DOMINIO.vercel.app/auth/retorno`, substituindo pelo domínio correto. Adicione também os retornos locais, se for testar localmente:

```
http://localhost:5173/auth/retorno
http://127.0.0.1:5173/auth/retorno
```

Mantenha os retornos `/entrar` e `/nova-senha` já configurados para confirmação de e-mail e recuperação de senha. Para domínios de preview, cadastre explicitamente o retorno correto. Não use um domínio de exemplo literalmente.

10. Abra `/entrar` no site, clique Continuar com Google e use um usuário permitido em Audience. Após autorizar, confira se voltou autenticado ao CORREFÉ e se existe um perfil para sua conta. Um login social também cadastra uma conta no primeiro acesso.

O callback cadastrado no Google é o endereço do **Supabase**. O retorno cadastrado no Supabase é o endereço do **CORREFÉ**. São dois endereços diferentes.

## Apple

Removida da interface a pedido do usuário. O CORREFÉ oferece Google e e-mail/senha; nenhuma assinatura Apple é necessária.

## Banco e verificação

Bases existentes: aplique a migração `supabase/migrations/20261017012639_social_auth_profiles.sql` depois das anteriores. Ela atualiza o gatilho para aceitar `name` ou `full_name`, sem usar metadados como autorização. O instalador de projeto novo também contém essa migração; não execute os dois caminhos.

A ativação dos provedores é configuração no painel, não SQL. Sem as credenciais Google, não é possível testar o consentimento e o login real de ponta a ponta. Não altere flags no frontend para fingir que um provedor está habilitado: o app consulta a configuração pública do Supabase antes de redirecionar.

Fontes:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://codelabs.developers.google.com/codelabs/sign-in-with-google-button
