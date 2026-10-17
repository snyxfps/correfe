import { Brand, LogoMark } from "./components/Brand";
import { useEffect, useState, useRef } from "react";
import { AuthPage } from "./components/AuthPage";
import { AccountSettings } from "./components/AccountSettings";
import { DiscoveryFilters } from "./components/DiscoveryFilters";
import { RunForm } from "./components/RunForm";
import {
  RunDetails,
  GroupDetails,
  AfterRunPrompt,
  NoEntity,
} from "./components/CommunityDetails";
import { useRoute } from "./lib/routing";
import {
  defaultDiscovery,
  matchesDiscovery,
  runEnded,
  entityPath,
} from "./lib/community";
import type { Discovery } from "./lib/community";
import { Bell, Shield, Trash2 } from "lucide-react";
import { Field, Form } from "./components/forms";
import { ProductArt } from "./components/ProductArt";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Flag,
  Heart,
  Home,
  Image,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  UserRound,
  Zap,
  LogOut,
  Route,
  Settings2,
} from "lucide-react";
import {
  Avatar,
  Empty,
  Modal,
  SectionTitle,
  TextLink,
  money,
  dateLabel,
  timeLabel,
} from "./components/ui";
import { isDemo, photoUrl, supabase } from "./lib/client";
import { useCorre } from "./lib/useCorre";
import type { Group, Post, Product, Run, Tab } from "./lib/types";

type Dialog =
  | {
      type:
        | "auth"
        | "group"
        | "run"
        | "post"
        | "profile"
        | "product"
        | "settings"
        | "notices";
    }
  | { type: "runDetail"; run: Run }
  | { type: "groupDetail"; group: Group }
  | { type: "productDetail"; product: Product }
  | { type: "runEdit"; run: Run }
  | { type: "groupEdit"; group: Group }
  | { type: "report"; groupId: string; postId?: string }
  | { type: "removePost"; postId: string }
  | { type: "photo"; post: Post };
const navigation: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "feed", label: "Seu feed", icon: Home },
  { id: "runs", label: "Corridas", icon: CalendarDays },
  { id: "groups", label: "Grupos", icon: Users },
  { id: "album", label: "Álbum coletivo", icon: Image },
  { id: "shop", label: "Loja dos grupos", icon: ShoppingBag },
];
export default function App() {
  const store = useCorre();
  const actionPending = useRef(false);
  const { path, go } = useRoute();
  const [discovery, setDiscovery] = useState<Discovery>(defaultDiscovery);
  const [albumRun, setAlbumRun] = useState("all");
  const [selectedPostRun, setSelectedPostRun] = useState<Run | null>(null);
  const publicMatch = path.match(/^\/(corridas|grupos)\/([^/]+)$/);
  const entityId = publicMatch?.[2] || "";
  const authModes: Record<string, "login" | "signup" | "recover" | "reset"> = {
    "/entrar": "login",
    "/cadastro": "signup",
    "/recuperar": "recover",
    "/nova-senha": "reset",
  };
  const tabPaths: Record<Tab, string> = {
    feed: "/",
    runs: "/corridas",
    groups: "/grupos",
    album: "/album",
    shop: "/loja",
    profile: "/perfil",
  };
  const { data, userId, loading, error } = store;
  const [tab, setTab] = useState<Tab>("feed"),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [groupFilter, setGroupFilter] = useState("all"),
    [toast, setToast] = useState("");
  const me = data.profiles.find((p) => p.id === userId),
    name = me?.name || "Corredor";
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const found = (Object.keys(tabPaths) as Tab[]).find(
      (key) => tabPaths[key] === path,
    );
    if (found) setTab(found);
  }, [path]);
  useEffect(() => {
    if (dialog?.type === "notices" && !isDemo) void store.refresh();
    if (dialog?.type === "auth") {
      setDialog(null);
      go("/entrar?next=" + encodeURIComponent(path));
    }
  }, [dialog?.type]);
  function openRun(run: Run) {
    setDialog(null);
    go(entityPath("run", run.id));
  }
  function openGroup(group: Group) {
    setDialog(null);
    go(entityPath("group", group.id));
  }
  function openPost(run?: Run) {
    setSelectedPostRun(run || null);
    setDialog({ type: "post" });
  }
  function openAlbum(groupId: string, runId = "all") {
    navigate("album");
    setGroupFilter(groupId);
    setAlbumRun(runId);
    setDialog(null);
  }
  function navigate(next: Tab) {
    go(tabPaths[next]);
    setAlbumRun("all");
    setTab(next);
    setQuery("");
    setFilter("all");
    setGroupFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function requireAuth(action: () => void) {
    if (userId) action();
    else setDialog({ type: "auth" });
  }
  async function act(action: () => Promise<unknown>, message?: string) {
    if (actionPending.current) return;
    actionPending.current = true;
    try {
      await action();
      if (message) setToast(message);
    } catch (err) {
      setToast(
        err instanceof Error
          ? err.message
          : "Algo deu errado. Tente novamente.",
      );
    } finally {
      actionPending.current = false;
    }
  }
  const groupName = (id: string) =>
    data.groups.find((g) => g.id === id)?.name || "Grupo";
  const member = (id: string) =>
    data.memberships.some((m) => m.group_id === id && m.user_id === userId);
  const joined = (id: string) =>
    data.participants.some((p) => p.run_id === id && p.user_id === userId);
  const futureRuns = data.runs
    .filter(
      (r) => r.status !== "cancelled" && new Date(r.starts_at) > new Date(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const match = (text: string) =>
    text.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
  const visibleRuns = futureRuns.filter(
    (r) =>
      match(`${r.title} ${r.start_point} ${groupName(r.group_id)}`) &&
      (filter !== "mine" || joined(r.id)) &&
      (groupFilter === "all" || r.group_id === groupFilter) &&
      matchesDiscovery(r, data.groups, discovery),
  );
  const visiblePosts = [...data.posts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter(
      (p) =>
        match(`${p.body} ${groupName(p.group_id)}`) &&
        (filter !== "mine" || member(p.group_id)) &&
        (groupFilter === "all" || p.group_id === groupFilter),
    );
  const ownGroups = data.groups.filter((g) => g.owner_id === userId);
  const memberGroups = data.groups.filter(
    (g) => member(g.id) || g.owner_id === userId,
  );
  const completedRun = [...data.runs]
    .filter((r) => runEnded(r) && joined(r.id))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .find(
      (r) => !data.posts.some((p) => p.user_id === userId && p.run_id === r.id),
    );
  const nextRun = futureRuns.find((r) => joined(r.id)) || futureRuns[0];
  async function createPost(f: FormData) {
    const groupId = String(f.get("group_id")),
      runId = String(f.get("run_id") || "");
    if (runId && data.runs.find((r) => r.id === runId)?.group_id !== groupId)
      throw new Error("A corrida precisa pertencer ao grupo escolhido.");
    if (runId && !runEnded(data.runs.find((r) => r.id === runId)!))
      throw new Error(
        "Registre a corrida depois do término previsto e apenas se ela não foi cancelada.",
      );
    if (runId && !joined(runId))
      throw new Error("Confirme sua participação para registrar uma corrida.");
    const file = f.get("photo") as File | null;
    let path: string | null = null;
    try {
      if (file?.size) path = await store.upload(file);
      await store.insert("posts", {
        user_id: userId,
        group_id: groupId,
        run_id: runId || null,
        body: String(f.get("body")).trim(),
        photo_path: path,
      });
    } catch (err) {
      if (path && !isDemo)
        await supabase!.storage.from("run-photos").remove([path]);
      throw err;
    }
    setDialog(null);
    setToast(
      isDemo
        ? "Publicação adicionada à demonstração."
        : "Publicação compartilhada!",
    );
  }
  function runCard(run: Run, compact = false) {
    const count = data.participants.filter((p) => p.run_id === run.id).length;
    return (
      <article key={run.id} className={`run-card ${compact ? "compact" : ""}`}>
        <button className="run-open" onClick={() => openRun(run)}>
          <div className="run-card-top">
            <span className="mini-date">
              <CalendarDays size={15} />
              {dateLabel(run.starts_at)} · {timeLabel(run.starts_at)}
            </span>
            <ArrowUpRight size={19} />
          </div>
          <span className="eyebrow">{groupName(run.group_id)}</span>
          <h3>{run.title}</h3>
          <div className="run-tags">
            {run.beginner_friendly && (
              <span className="tag">Para iniciantes</span>
            )}
            {run.no_one_left_behind && (
              <span className="tag">Ninguém fica para trás</span>
            )}
          </div>
          <p className="muted line">
            <MapPin size={14} />
            {run.start_point}
          </p>
          <div className="run-metrics">
            <span>
              <strong>{run.distance}</strong> km
            </span>
            <span>
              <strong>{run.pace}</strong> /km
            </span>
            <span>
              <Users size={15} /> {count}
            </span>
          </div>
        </button>
        <button
          className={`button ${joined(run.id) ? "secondary" : "primary"} small full`}
          onClick={() =>
            requireAuth(() => {
              if (!member(run.group_id) && !joined(run.id)) openRun(run);
              else
                void act(
                  () => store.toggle("participants", "run_id", run.id),
                  joined(run.id)
                    ? "Participação cancelada."
                    : "Você está nessa!",
                );
            })
          }
        >
          {joined(run.id) ? <Check size={16} /> : <Plus size={16} />}{" "}
          {joined(run.id) ? "Confirmado · sair" : "Bora correr"}
        </button>
      </article>
    );
  }
  function groupCard(group: Group) {
    return (
      <article key={group.id} className="group-card">
        <div className="group-mark">
          <span>
            {group.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 3)
              .join("")}
          </span>
          <ArrowUpRight size={22} />
        </div>
        <div className="group-content">
          <h3>
            <button className="plain" onClick={() => openGroup(group)}>
              {group.name}
            </button>
          </h3>
          <p className="muted line">
            <MapPin size={14} />
            {group.city}
          </p>
          <p>{group.description}</p>
          <div className="split">
            <span className="muted">
              {data.memberships.filter((m) => m.group_id === group.id).length}{" "}
              corredores
            </span>
            <button
              className="button secondary small"
              onClick={() =>
                requireAuth(
                  () =>
                    void act(
                      () => store.toggle("memberships", "group_id", group.id),
                      member(group.id)
                        ? "Você saiu do grupo."
                        : "Bem-vindo à turma!",
                    ),
                )
              }
            >
              {member(group.id) ? "Sair do grupo" : "Participar"}
            </button>
          </div>
        </div>
      </article>
    );
  }
  function postCard(post: Post) {
    const author = data.profiles.find(
        (p) =>
          p.id === post.user_id &&
          (p.visibility !== "private" || p.id === userId),
      ),
      liked = data.likes.some(
        (l) => l.post_id === post.id && l.user_id === userId,
      );
    return (
      <article key={post.id} className="post-card">
        <div className="post-author">
          <Avatar name={author?.name || "Corredor"} />
          <div>
            <strong>{author?.name || "Corredor"}</strong>
            <p>
              {groupName(post.group_id)}{" "}
              <span>· {dateLabel(post.created_at)}</span>
            </p>
          </div>
          {post.run_id && (
            <span className="tag">
              <Flag size={12} /> Corrida registrada
            </span>
          )}
        </div>
        <div className="post-management">
          <button
            className="text-link"
            onClick={() =>
              requireAuth(() =>
                setDialog({
                  type: "report",
                  groupId: post.group_id,
                  postId: post.id,
                }),
              )
            }
          >
            <Flag size={12} /> Denunciar
          </button>
          {(post.user_id === userId ||
            data.groups.some(
              (g) => g.id === post.group_id && g.owner_id === userId,
            )) && (
            <button
              className="text-link"
              onClick={() => setDialog({ type: "removePost", postId: post.id })}
            >
              <Trash2 size={12} /> Remover
            </button>
          )}
        </div>
        <p className="post-body">{post.body}</p>
        {post.photo_path && (
          <button
            className="post-photo"
            onClick={() => setDialog({ type: "photo", post })}
            aria-label="Ampliar foto da publicação"
          >
            <img
              src={photoUrl(post.photo_path)}
              alt={`Registro de ${author?.name || "corredor"} em ${groupName(post.group_id)}`}
              loading="lazy"
            />
          </button>
        )}
        <div className="post-actions">
          <button
            aria-pressed={liked}
            className={liked ? "liked" : ""}
            onClick={() =>
              requireAuth(
                () => void act(() => store.toggle("likes", "post_id", post.id)),
              )
            }
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
            {data.likes.filter((l) => l.post_id === post.id).length} curtidas
          </button>
          <span className="muted">
            {post.run_id
              ? data.runs.find((r) => r.id === post.run_id)?.title
              : "Cada corre, uma história."}
          </span>
        </div>
      </article>
    );
  }
  const search = (
    <label className="search">
      <Search size={18} />
      <input
        aria-label="Buscar nesta seção"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          tab === "feed" ? "Buscar histórias, grupos…" : "O que você procura?"
        }
      />
    </label>
  );
  const groupSelect = (
    <label className="filter-select">
      <SlidersHorizontal size={16} />
      <select
        aria-label="Filtrar por grupo"
        value={groupFilter}
        onChange={(e) => {
          setGroupFilter(e.target.value);
          setAlbumRun("all");
        }}
      >
        <option value="all">Todos os grupos</option>
        {data.groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
  const renderRun = (run: Run) => (
    <RunDetails
      key={run.id}
      run={run}
      store={store}
      requireAuth={requireAuth}
      act={act}
      onEdit={() => setDialog({ type: "runEdit", run })}
      onPost={() => openPost(run)}
      onAlbum={() => openAlbum(run.group_id, run.id)}
    />
  );
  const renderGroup = (group: Group) => (
    <GroupDetails
      key={group.id}
      group={group}
      store={store}
      requireAuth={requireAuth}
      act={act}
      onEdit={() => setDialog({ type: "groupEdit", group })}
      onRun={openRun}
      onAlbum={() => openAlbum(group.id)}
      onShop={() => {
        navigate("shop");
        setGroupFilter(group.id);
      }}
      onReport={() => setDialog({ type: "report", groupId: group.id })}
      onRemovePost={(postId) => setDialog({ type: "removePost", postId })}
    />
  );
  if (authModes[path])
    return (
      <AuthPage
        key={path}
        mode={authModes[path]}
        go={go}
        onDemo={() => {
          store.enterDemo();
          go("/");
        }}
        onSuccess={() => {
          const next =
            new URLSearchParams(window.location.search).get("next") || "/";
          go(next.startsWith("/") && !next.startsWith("//") ? next : "/");
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("feed");
          }}
        >
          <Brand />
        </a>
        <p className="brand-caption">PORTO ALEGRE / COLETIVO DE CORRIDA</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              {label}
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <button
          className="button primary new-run"
          onClick={() => requireAuth(() => setDialog({ type: "run" }))}
        >
          <Plus size={19} /> Criar corrida
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <Zap size={20} />
            <p>
              O próximo passo
              <br />
              <strong>é melhor junto.</strong>
            </p>
          </div>
          <button
            className="profile-link"
            onClick={() =>
              userId ? navigate("profile") : setDialog({ type: "auth" })
            }
          >
            <Avatar name={userId ? name : "Visitante"} />
            <span>
              <strong>{userId ? name : "Entre na sua conta"}</strong>
              <small>
                {isDemo
                  ? "Perfil de demonstração"
                  : userId
                    ? "Ver meu perfil"
                    : "Encontre sua turma"}
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <a
            className="mobile-brand brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("feed");
            }}
          >
            <Brand />
          </a>
          <div className="top-location">
            <MapPin size={15} />
            {me?.city || "Encontre sua comunidade"}
          </div>
          <div className="top-actions">
            <button
              className="text-link auth-entry"
              onClick={() => go("/entrar")}
            >
              Entrar / cadastro
            </button>
            <button
              className="icon-button notices-button"
              aria-label="Avisos"
              onClick={() => requireAuth(() => setDialog({ type: "notices" }))}
            >
              <Bell size={18} />
              {data.notifications.some(
                (n) => n.user_id === userId && !n.read_at,
              ) && <span className="unread-dot" />}
            </button>
            <button
              className="icon-button mobile-album"
              aria-label="Álbum coletivo"
              onClick={() => navigate("album")}
            >
              <Image size={18} />
            </button>
            <span className="live-dot" />
            {isDemo ? "Modo demonstração" : "Comunidade de corrida"}
            <button
              className="icon-button"
              aria-label="Abrir perfil"
              onClick={() =>
                userId ? navigate("profile") : setDialog({ type: "auth" })
              }
            >
              <UserRound size={19} />
            </button>
          </div>
        </header>
        {isDemo && (
          <div className="demo-banner">
            DEMO{" "}
            <span>
              Dados fictícios. Suas alterações duram só até recarregar a página.
            </span>
            <span className="desktop-only">Explore à vontade ↗</span>
          </div>
        )}
        <main id="main">
          {!publicMatch && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">
                    {tab === "feed"
                      ? "MENOS DESCULPAS. MAIS ENCONTROS."
                      : "A RUA É NOSSO PONTO DE ENCONTRO."}
                  </p>
                  <h1>
                    {
                      {
                        feed: (
                          <>
                            Seu próximo corre
                            <br />
                            começa <em>aqui.</em>
                          </>
                        ),
                        runs: (
                          <>
                            Encontre seu
                            <br />
                            <em>próximo corre.</em>
                          </>
                        ),
                        groups: (
                          <>
                            Tem uma turma
                            <br />
                            <em>no seu ritmo.</em>
                          </>
                        ),
                        album: (
                          <>
                            Foi mais que correr.
                            <br />
                            <em>Virou memória.</em>
                          </>
                        ),
                        shop: (
                          <>
                            Vista a camisa
                            <br />
                            <em>da sua turma.</em>
                          </>
                        ),
                        profile: (
                          <>
                            Cada passo conta.
                            <br />
                            <em>Esse é o seu.</em>
                          </>
                        ),
                      }[tab]
                    }
                  </h1>
                </div>
                <div className="intro-side">
                  <span className="outline-badge">
                    <Route size={16} /> FEITO PARA CORRER JUNTO
                  </span>
                  <p>
                    {tab === "feed"
                      ? `Bora, ${userId ? name.split(" ")[0] : "corredor"}? A rua está chamando.`
                      : "Do primeiro quilômetro à próxima conquista."}
                  </p>
                </div>
              </div>
            </>
          )}
          {error ? (
            <div className="error-state" role="alert">
              <h3>Não conseguimos carregar o CORREFÉ.</h3>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => void store.refresh()}
              >
                Tentar novamente
              </button>
            </div>
          ) : loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" />
              <p>Preparando seu próximo corre…</p>
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : publicMatch ? (
            <section className="public-invite">
              <button
                className="text-link"
                onClick={() =>
                  navigate(publicMatch[1] === "corridas" ? "runs" : "groups")
                }
              >
                ← Explorar {publicMatch[1]}
              </button>
              <p className="eyebrow">CONVITE ABERTO · CORREFÉ</p>
              {publicMatch[1] === "corridas" ? (
                data.runs.find((r) => r.id === entityId) ? (
                  renderRun(data.runs.find((r) => r.id === entityId)!)
                ) : (
                  <NoEntity />
                )
              ) : data.groups.find((g) => g.id === entityId) ? (
                renderGroup(data.groups.find((g) => g.id === entityId)!)
              ) : (
                <NoEntity />
              )}
            </section>
          ) : (
            <>
              {tab === "feed" && (
                <div className="feed-layout">
                  <div className="feed-main">
                    <section className="hero">
                      <LogoMark className="hero-logo" />
                      <span className="hero-speed" aria-hidden="true" />
                      <div className="hero-content">
                        <span className="hero-label">
                          <span /> A CIDADE FICA MELHOR EM MOVIMENTO
                        </span>
                        <h2>
                          É CORRE.
                          <br />É FÉ.
                          <br />
                          <em>É COLETIVO.</em>
                        </h2>
                        <p>A rua é o ponto de encontro. A turma faz o resto.</p>
                        <button
                          className="button white"
                          onClick={() => navigate("groups")}
                        >
                          Encontre seu grupo <ArrowUpRight size={18} />
                        </button>
                      </div>
                      <span className="hero-coordinate">PORTO ALEGRE / RS</span>
                    </section>
                    {completedRun && (
                      <AfterRunPrompt
                        run={completedRun}
                        group={groupName(completedRun.group_id)}
                        onPost={() => openPost(completedRun)}
                        onAlbum={() =>
                          openAlbum(completedRun.group_id, completedRun.id)
                        }
                      />
                    )}

                    <SectionTitle
                      eyebrow="MARCA NA AGENDA"
                      title="Próximos encontros"
                    >
                      <TextLink onClick={() => navigate("runs")}>
                        Ver todos
                      </TextLink>
                    </SectionTitle>
                    <div className="run-grid">
                      {futureRuns.slice(0, 2).map((r) => runCard(r, true))}
                    </div>
                    {futureRuns.length === 0 && (
                      <Empty title="A agenda está aberta">
                        Crie a primeira corrida da sua comunidade.
                      </Empty>
                    )}
                    <div className="feed-heading">
                      <h2>Na rua, com a turma</h2>
                      <button
                        className="button secondary small"
                        onClick={() => requireAuth(() => openPost())}
                      >
                        <Plus size={16} /> Publicar
                      </button>
                    </div>
                    <div className="toolbar">
                      <div className="pills">
                        <button
                          className={filter === "all" ? "selected" : ""}
                          onClick={() => setFilter("all")}
                        >
                          Descobrir
                        </button>
                        <button
                          className={filter === "mine" ? "selected" : ""}
                          onClick={() => setFilter("mine")}
                        >
                          Meus grupos
                        </button>
                      </div>
                      {search}
                    </div>
                    {visiblePosts.map((p) => postCard(p))}
                    {visiblePosts.length === 0 && (
                      <Empty title="Ainda não tem histórias por aqui">
                        Participe de um grupo e compartilhe seu primeiro
                        registro.
                      </Empty>
                    )}
                  </div>
                  <aside className="right-column">
                    <div className="side-card next-card">
                      <span className="eyebrow">SEU PRÓXIMO PASSO</span>
                      <Route size={30} className="next-icon" />
                      {nextRun ? (
                        <>
                          <h3>
                            {joined(nextRun.id)
                              ? "Sua turma te espera."
                              : "Que tal esse corre?"}
                          </h3>
                          <p>{nextRun.title}</p>
                          <div className="next-time">
                            <CalendarDays size={17} />
                            {dateLabel(nextRun.starts_at)} ·{" "}
                            {timeLabel(nextRun.starts_at)}
                          </div>
                          <button
                            className="text-link"
                            onClick={() => openRun(nextRun)}
                          >
                            Conhecer o trajeto <ArrowRight size={17} />
                          </button>
                        </>
                      ) : (
                        <>
                          <h3>Um novo começo.</h3>
                          <p>Crie uma corrida e convide sua turma.</p>
                        </>
                      )}
                    </div>
                    <div className="side-card">
                      <div className="split">
                        <h3>Encontre sua turma</h3>
                        <Compass size={19} />
                      </div>
                      {data.groups.slice(0, 3).map((g, i) => (
                        <button
                          className="suggestion"
                          key={g.id}
                          onClick={() => openGroup(g)}
                        >
                          <span className={`club-icon club-${i}`}>
                            {g.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span>
                            <strong>{g.name}</strong>
                            <small>
                              {
                                data.memberships.filter(
                                  (m) => m.group_id === g.id,
                                ).length
                              }{" "}
                              corredores · {g.city.split(",")[0]}
                            </small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      <TextLink onClick={() => navigate("groups")}>
                        Explorar grupos
                      </TextLink>
                    </div>
                    <div className="manifesto">
                      <span>01 / O NOSSO MANIFESTO</span>
                      <h3>
                        Não é sobre
                        <br />
                        chegar primeiro.
                        <br />
                        <em>É sobre ir junto.</em>
                      </h3>
                      <p>Todo ritmo tem lugar aqui.</p>
                      <span className="brand">
                        <Brand />
                      </span>
                    </div>
                    <p className="footer-note">
                      CORREFÉ © {new Date().getFullYear()}
                      <br />
                      Feito para sair da tela e ir pra rua.
                    </p>
                  </aside>
                </div>
              )}
              {tab === "runs" && (
                <>
                  <DiscoveryFilters value={discovery} onChange={setDiscovery} />
                  <div className="toolbar">
                    {search}
                    {groupSelect}
                    <button
                      className="button primary small"
                      onClick={() =>
                        requireAuth(() => setDialog({ type: "run" }))
                      }
                    >
                      <Plus size={17} /> Criar corrida
                    </button>
                  </div>
                  <div className="pills section-pills">
                    <button
                      className={filter === "all" ? "selected" : ""}
                      onClick={() => setFilter("all")}
                    >
                      Todas as corridas
                    </button>
                    <button
                      className={filter === "mine" ? "selected" : ""}
                      onClick={() => setFilter("mine")}
                    >
                      Vou participar
                    </button>
                  </div>
                  <div className="cards-grid">
                    {visibleRuns.map((r) => runCard(r))}
                  </div>
                  {!visibleRuns.length && (
                    <Empty title="Nenhuma corrida encontrada">
                      Experimente outro filtro ou crie um encontro.
                    </Empty>
                  )}
                </>
              )}
              {tab === "groups" && (
                <>
                  <div className="toolbar">
                    {search}
                    <button
                      className="button primary small"
                      onClick={() =>
                        requireAuth(() => setDialog({ type: "group" }))
                      }
                    >
                      <Plus size={17} /> Criar grupo
                    </button>
                  </div>
                  <div className="cards-grid">
                    {data.groups
                      .filter((g) =>
                        match(`${g.name} ${g.city} ${g.description}`),
                      )
                      .map((g) => groupCard(g))}
                  </div>
                  {!data.groups.filter((g) =>
                    match(`${g.name} ${g.city} ${g.description}`),
                  ).length && (
                    <Empty title="Sua turma ainda não chegou">
                      Que tal criar o primeiro grupo?
                    </Empty>
                  )}
                </>
              )}
              {tab === "album" && (
                <>
                  <label className="album-run-filter">
                    Encontro
                    <select
                      aria-label="Filtrar álbum por corrida"
                      value={albumRun}
                      onChange={(e) => setAlbumRun(e.target.value)}
                    >
                      <option value="all">
                        Todos os encontros e registros
                      </option>
                      {data.runs
                        .filter(
                          (r) =>
                            groupFilter === "all" || r.group_id === groupFilter,
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="toolbar">
                    {groupSelect}
                    <button
                      className="button primary small"
                      onClick={() => requireAuth(() => openPost())}
                    >
                      <Camera size={17} /> Adicionar registro
                    </button>
                  </div>
                  <p className="section-description">
                    As fotos compartilhadas nos grupos, reunidas em um só lugar.
                    Toque para ampliar.
                  </p>
                  <div className="album-grid">
                    {visiblePosts
                      .filter(
                        (p) =>
                          p.photo_path &&
                          (albumRun === "all" || p.run_id === albumRun),
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          className="album-photo"
                          onClick={() => setDialog({ type: "photo", post: p })}
                        >
                          <img
                            src={photoUrl(p.photo_path)}
                            alt={p.body}
                            loading="lazy"
                          />
                          <span>
                            <Camera size={17} />
                            {groupName(p.group_id)}
                          </span>
                        </button>
                      ))}
                  </div>
                  {!visiblePosts.some(
                    (p) =>
                      p.photo_path &&
                      (albumRun === "all" || p.run_id === albumRun),
                  ) && (
                    <Empty title="O álbum está esperando o primeiro clique">
                      Publique uma foto da turma para começar.
                    </Empty>
                  )}
                </>
              )}
              {tab === "shop" && (
                <>
                  <div className="toolbar">
                    {groupSelect}
                    {ownGroups.length > 0 && (
                      <button
                        className="button primary small"
                        onClick={() => setDialog({ type: "product" })}
                      >
                        <Plus size={17} /> Novo produto
                      </button>
                    )}
                  </div>
                  <p className="shop-notice">
                    <ShoppingBag size={18} /> Loja da comunidade: faça um pedido
                    de interesse. Combinação e pagamento direto com o
                    organizador, fora do CORREFÉ.
                  </p>
                  <div className="cards-grid products">
                    {data.products
                      .filter(
                        (p) =>
                          p.active &&
                          (groupFilter === "all" || p.group_id === groupFilter),
                      )
                      .map((p) => (
                        <article className="product-card" key={p.id}>
                          <button
                            className={`product-art ${p.category === "Boné" ? "cap" : p.category === "Meia" ? "socks" : "shirt"}`}
                            aria-label={`Ver ${p.name}`}
                            onClick={() =>
                              setDialog({ type: "productDetail", product: p })
                            }
                          >
                            <ProductArt category={p.category} />
                            <span>ESSENTIALS / CORREFÉ</span>
                            <ArrowUpRight size={24} />
                          </button>
                          <p className="eyebrow">{groupName(p.group_id)}</p>
                          <h3>{p.name}</h3>
                          <div className="split">
                            <strong>{money(p.price_cents)}</strong>
                            <button
                              className="button secondary small"
                              onClick={() =>
                                setDialog({ type: "productDetail", product: p })
                              }
                            >
                              Ver produto <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!data.products.some(
                    (p) =>
                      p.active &&
                      (groupFilter === "all" || p.group_id === groupFilter),
                  ) && (
                    <Empty title="A coleção ainda está a caminho">
                      Os produtos do grupo vão aparecer aqui.
                    </Empty>
                  )}
                </>
              )}
              {tab === "profile" && (
                <>
                  {userId ? (
                    <>
                      <section className="profile-card">
                        <Avatar name={name} size="large" />
                        <div>
                          <span className="eyebrow">
                            {isDemo
                              ? "CORREDOR FICTÍCIO · DEMONSTRAÇÃO"
                              : "SEU PERFIL"}
                          </span>
                          <h2>{name}</h2>
                          <p className="muted">
                            {me?.city || "Conte de onde você corre"}
                          </p>
                          <p>
                            {me?.bio ||
                              "Complete seu perfil e encontre sua turma."}
                          </p>
                        </div>
                        <button
                          className="button secondary small"
                          onClick={() => setDialog({ type: "profile" })}
                        >
                          <Settings2 size={16} /> Editar perfil
                        </button>
                      </section>
                      <div className="stats-grid">
                        <div>
                          <strong>
                            {
                              data.participants.filter(
                                (p) => p.user_id === userId,
                              ).length
                            }
                          </strong>
                          <span>corridas confirmadas</span>
                        </div>
                        <div>
                          <strong>{memberGroups.length}</strong>
                          <span>grupos para chamar de seu</span>
                        </div>
                        <div>
                          <strong>{me?.pace || "—"}</strong>
                          <span>ritmo habitual /km</span>
                        </div>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setDialog({ type: "settings" })}
                      >
                        <Shield size={16} /> Conta e privacidade
                      </button>
                      <SectionTitle title="Minhas denúncias" />
                      {data.reports
                        .filter((r) => r.reporter_id === userId)
                        .map((r) => (
                          <div className="report-item" key={r.id}>
                            <p>{r.reason}</p>
                            <span className="tag">
                              {r.status === "resolved"
                                ? "Revisada"
                                : "Aguardando revisão"}
                            </span>
                          </div>
                        ))}
                      {!data.reports.some((r) => r.reporter_id === userId) && (
                        <p className="muted">Nenhuma denúncia enviada.</p>
                      )}
                      <SectionTitle title="Minha turma" />
                      <div className="cards-grid">
                        {memberGroups.map((g) => groupCard(g))}
                      </div>
                      {!memberGroups.length && (
                        <Empty title="Encontre seu primeiro grupo" />
                      )}
                      <SectionTitle title="Meus registros" />
                      {data.posts
                        .filter((p) => p.user_id === userId)
                        .map((p) => postCard(p))}
                      {!data.posts.some((p) => p.user_id === userId) && (
                        <Empty title="Seu primeiro registro está por vir" />
                      )}
                      <SectionTitle title="Meus pedidos de interesse" />
                      {data.orders
                        .filter((o) => o.user_id === userId)
                        .map((o) => (
                          <div key={o.id} className="order-row">
                            <ShoppingBag size={22} />
                            <div>
                              <strong>
                                {data.products.find(
                                  (p) => p.id === o.product_id,
                                )?.name || "Produto"}
                              </strong>
                              <p>
                                {o.quantity} un. · {o.size} ·{" "}
                                {money(o.total_cents)}
                              </p>
                            </div>
                            <span className="tag">Interesse enviado</span>
                          </div>
                        ))}
                      {!data.orders.some((o) => o.user_id === userId) && (
                        <Empty title="Nenhum pedido por enquanto" />
                      )}
                      {!isDemo && (
                        <button
                          className="button secondary"
                          onClick={() =>
                            void act(async () => {
                              const { error: e } =
                                await supabase!.auth.signOut();
                              if (e) throw e;
                              navigate("feed");
                            })
                          }
                        >
                          <LogOut size={16} /> Sair da conta
                        </button>
                      )}
                    </>
                  ) : (
                    <Empty title="Seu perfil começa com uma conta">
                      <button
                        className="button primary"
                        onClick={() => setDialog({ type: "auth" })}
                      >
                        Entrar ou criar conta
                      </button>
                    </Empty>
                  )}
                </>
              )}
            </>
          )}
          <footer className="mobile-footer">
            SEU RITMO. SUA TURMA. SEU CORREFÉ.
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação no celular">
        {[
          ...navigation.filter((n) => n.id !== "album"),
          { id: "profile" as Tab, label: "Perfil", icon: UserRound },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-label={label}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => navigate(id)}
          >
            <Icon size={21} />
            <span>
              {id === "feed" ? "Início" : id === "shop" ? "Loja" : label}
            </span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="plain"
            aria-label="Dispensar aviso"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {dialog && (
        <Modal title={dialogTitle(dialog)} onClose={() => setDialog(null)}>
          {dialog.type === "runEdit" && (
            <RunForm
              groups={memberGroups}
              run={dialog.run}
              onSave={async (values) => {
                await store.updateRun(dialog.run.id, values);
                setDialog(null);
                setToast(
                  "Encontro atualizado. Participantes receberam aviso no CORREFÉ.",
                );
              }}
            />
          )}
          {dialog.type === "groupEdit" && (
            <Form
              button="Salvar grupo"
              onSubmit={async (f) => {
                await store.updateGroup(dialog.group.id, {
                  name: String(f.get("name")).trim(),
                  city: String(f.get("city")).trim(),
                  description: String(f.get("description")).trim(),
                  rules: String(f.get("rules")).trim(),
                  contact: String(f.get("contact")).trim(),
                });
                setDialog(null);
                setToast("Grupo atualizado.");
              }}
            >
              <Field
                label="Nome do grupo"
                name="name"
                defaultValue={dialog.group.name}
                required
              />
              <Field
                label="Cidade"
                name="city"
                defaultValue={dialog.group.city}
                required
              />
              <Field label="Descrição" name="description">
                <textarea
                  name="description"
                  defaultValue={dialog.group.description}
                  maxLength={1000}
                  rows={3}
                />
              </Field>
              <Field label="Regras e combinados" name="rules">
                <textarea
                  name="rules"
                  defaultValue={dialog.group.rules}
                  maxLength={2000}
                  rows={4}
                />
              </Field>
              <Field label="Contato público do organizador" name="contact">
                <input
                  name="contact"
                  defaultValue={dialog.group.contact}
                  maxLength={240}
                  placeholder="Contato comercial ou como encontrar a turma"
                />
              </Field>
              <p className="form-note">
                O contato fica público. Use um canal comercial ou instruções
                para encontrar o organizador.
              </p>
            </Form>
          )}
          {dialog.type === "report" && (
            <Form
              button="Enviar denúncia"
              onSubmit={async (f) => {
                await store.insert("reports", {
                  reporter_id: userId,
                  group_id: dialog.groupId,
                  post_id: dialog.postId || null,
                  reason: String(f.get("reason")).trim(),
                  status: "open",
                });
                setDialog(null);
                setToast("Denúncia registrada para revisão pelo organizador.");
              }}
            >
              <p className="form-note">
                O relato fica disponível para você e para o organizador do
                grupo. Não envie dados sensíveis. Problemas com o próprio
                organizador exigem revisão independente pelo responsável da
                plataforma.
              </p>
              <Field label="O que aconteceu?" name="reason">
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={5}
                />
              </Field>
            </Form>
          )}
          {dialog.type === "removePost" && (
            <Form
              button="Remover publicação e foto"
              onSubmit={async () => {
                await store.removePost(dialog.postId);
                setDialog(null);
                setToast("Publicação removida.");
              }}
            >
              <p>
                A publicação e a foto serão removidas do CORREFÉ. Essa ação não
                remove cópias já salvas por outras pessoas.
              </p>
              <blockquote className="remove-preview">
                {data.posts.find((p) => p.id === dialog.postId)?.body}
              </blockquote>
            </Form>
          )}
          {dialog.type === "settings" && me && (
            <AccountSettings
              profile={me}
              onSave={store.saveProfile}
              onDelete={async () => {
                await store.deleteAccount();
                setDialog(null);
                go("/entrar");
              }}
            />
          )}
          {dialog.type === "notices" && (
            <div className="detail">
              <p className="form-note">
                Avisos dentro do app, atualizados ao abrir ou usar Atualizar.
                Não há notificações push ou e-mails automáticos.
              </p>
              <button
                className="button secondary small"
                onClick={() => void store.refresh()}
              >
                Atualizar avisos
              </button>
              {data.notifications
                .filter((n) => n.user_id === userId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((n) => (
                  <div
                    className={"notice-item " + (!n.read_at ? "unread" : "")}
                    key={n.id}
                  >
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <div className="split">
                      <small>
                        {dateLabel(n.created_at)} · {timeLabel(n.created_at)}
                      </small>
                      <button
                        className="text-link"
                        onClick={() =>
                          void act(async () => {
                            await store.markRead(n.id);
                            const run = data.runs.find(
                              (r) => r.id === n.run_id,
                            );
                            if (run) openRun(run);
                          })
                        }
                      >
                        Ver encontro
                      </button>
                    </div>
                  </div>
                ))}
              {!data.notifications.some((n) => n.user_id === userId) && (
                <Empty title="Tudo em dia por aqui">
                  Mudanças e cancelamentos dos encontros que você confirmou
                  aparecem aqui.
                </Empty>
              )}
            </div>
          )}
          {dialog.type === "group" && (
            <Form
              button="Criar minha turma"
              onSubmit={async (f) => {
                const id = await store.insert("groups", {
                  owner_id: userId,
                  name: String(f.get("name")).trim(),
                  city: String(f.get("city")).trim(),
                  description: String(f.get("description")).trim(),
                  color: "#ededed",
                });
                await store.toggle("memberships", "group_id", id);
                setDialog(null);
                navigate("groups");
                setToast("Grupo criado. Agora é só marcar o primeiro corre!");
              }}
            >
              <p className="form-note">
                Os grupos do MVP são públicos. Nome, descrição, corridas e fotos
                ficam visíveis para visitantes.
              </p>
              <Field label="Nome do grupo" name="name" required />
              <Field
                label="Cidade e estado"
                name="city"
                required
                placeholder="Porto Alegre, RS"
              />
              <Field label="Sobre sua turma" name="description">
                <textarea
                  name="description"
                  required
                  maxLength={1000}
                  rows={4}
                />
              </Field>
            </Form>
          )}
          {dialog.type === "run" &&
            (memberGroups.length ? (
              <RunForm
                groups={memberGroups}
                onSave={async (values) => {
                  await store.insert("runs", {
                    ...values,
                    creator_id: userId,
                    status: "scheduled",
                  });
                  setDialog(null);
                  navigate("runs");
                  setToast("Corrida criada!");
                }}
              />
            ) : (
              <Empty title="Primeiro, encontre sua turma">
                <button
                  className="button primary"
                  onClick={() => {
                    setDialog(null);
                    navigate("groups");
                  }}
                >
                  Explorar grupos
                </button>
              </Empty>
            ))}
          {dialog.type === "post" &&
            (memberGroups.length ? (
              <Form button="Compartilhar com a turma" onSubmit={createPost}>
                <Field label="Grupo" name="group_id">
                  <select
                    name="group_id"
                    defaultValue={selectedPostRun?.group_id}
                    required
                  >
                    {memberGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Registrar participação em uma corrida (opcional)"
                  name="run_id"
                >
                  <select
                    name="run_id"
                    defaultValue={selectedPostRun?.id || ""}
                  >
                    <option value="">Publicação livre</option>
                    {data.runs
                      .filter((r) => joined(r.id) && runEnded(r))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {groupName(r.group_id)} — {r.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Qual é a história de hoje?" name="body">
                  <textarea
                    name="body"
                    required
                    maxLength={2000}
                    rows={4}
                    placeholder="A corrida acabou, a história continua…"
                  />
                </Field>
                <Field label="Foto (JPG, PNG ou WebP, até 5 MB)" name="photo">
                  <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </Field>
                <p className="form-note">
                  As publicações e fotos são públicas. Compartilhe fotos de
                  outras pessoas apenas com a permissão delas.
                  {isDemo
                    ? " Na demonstração, a foto fica somente nesta sessão."
                    : ""}
                </p>
              </Form>
            ) : (
              <Empty title="Entre em um grupo para publicar">
                <button
                  className="button primary"
                  onClick={() => {
                    setDialog(null);
                    navigate("groups");
                  }}
                >
                  Encontrar minha turma
                </button>
              </Empty>
            ))}
          {dialog.type === "profile" && (
            <Form
              button="Salvar perfil"
              onSubmit={async (f) => {
                await store.saveProfile({
                  visibility: me?.visibility ?? "public",
                  id: userId!,
                  name: String(f.get("name")).trim(),
                  city: String(f.get("city")).trim(),
                  bio: String(f.get("bio")).trim(),
                  pace: String(f.get("pace")),
                });
                setDialog(null);
                setToast("Perfil atualizado!");
              }}
            >
              <Field
                label="Seu nome"
                name="name"
                defaultValue={me?.name}
                required
              />
              <Field label="Cidade" name="city" defaultValue={me?.city} />
              <Field
                label="Seu ritmo habitual (min/km)"
                name="pace"
                defaultValue={me?.pace}
              />
              <Field label="Sobre você" name="bio">
                <textarea
                  name="bio"
                  defaultValue={me?.bio}
                  rows={3}
                  maxLength={500}
                />
              </Field>
            </Form>
          )}
          {dialog.type === "product" && (
            <Form
              button="Adicionar à loja"
              onSubmit={async (f) => {
                await store.insert("products", {
                  group_id: String(f.get("group_id")),
                  name: String(f.get("name")).trim(),
                  description: String(f.get("description")).trim(),
                  price_cents: Math.round(Number(f.get("price")) * 100),
                  category: String(f.get("category")),
                  active: true,
                });
                setDialog(null);
                setToast("Produto adicionado à loja do grupo.");
              }}
            >
              <Field label="Seu grupo" name="group_id">
                <select name="group_id" required>
                  {ownGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nome" name="name" required />
              <Field label="Categoria" name="category">
                <select name="category">
                  <option>Camiseta</option>
                  <option>Boné</option>
                  <option>Meia</option>
                </select>
              </Field>
              <Field
                label="Preço (R$)"
                name="price"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                required
              />
              <Field label="Descrição" name="description">
                <textarea name="description" required rows={3} />
              </Field>
            </Form>
          )}
          {dialog.type === "productDetail" && (
            <div className="detail">
              <div className="product-art detail-art">
                <ProductArt category={dialog.product.category} />
              </div>
              <span className="eyebrow">
                {groupName(dialog.product.group_id)}
              </span>
              <h3 className="detail-title">{dialog.product.name}</h3>
              <p>{dialog.product.description}</p>
              <strong className="product-price">
                {money(dialog.product.price_cents)}
              </strong>
              {userId ? (
                <Form
                  button="Enviar pedido de interesse"
                  onSubmit={async (f) => {
                    const quantity = Number(f.get("quantity"));
                    await store.insert("orders", {
                      user_id: userId,
                      product_id: dialog.product.id,
                      quantity,
                      size: String(f.get("size")),
                      ...(isDemo
                        ? {
                            total_cents: quantity * dialog.product.price_cents,
                            status: "requested",
                          }
                        : {}),
                    });
                    setDialog(null);
                    setToast(
                      isDemo
                        ? "Pedido fictício registrado nesta sessão."
                        : "Interesse enviado ao organizador. Nenhuma cobrança foi feita.",
                    );
                  }}
                >
                  <div className="form-grid">
                    <Field label="Tamanho" name="size">
                      <select name="size">
                        {(dialog.product.category === "Camiseta"
                          ? ["P", "M", "G", "GG"]
                          : ["Único"]
                        ).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Quantidade"
                      name="quantity"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue={1}
                      required
                    />
                  </div>
                  <p className="form-note">
                    Não há pagamento no aplicativo. Este pedido registra seu
                    interesse e fica disponível para o organizador.
                    Disponibilidade e entrega devem ser combinadas diretamente.
                  </p>
                </Form>
              ) : (
                <button
                  className="button primary full"
                  onClick={() => setDialog({ type: "auth" })}
                >
                  Entrar para pedir
                </button>
              )}
            </div>
          )}
          {dialog.type === "photo" && (
            <div className="detail">
              <img
                className="lightbox"
                src={photoUrl(dialog.post.photo_path)}
                alt={dialog.post.body}
              />
              <p>{dialog.post.body}</p>
              <p className="muted">
                {groupName(dialog.post.group_id)} ·{" "}
                {dateLabel(dialog.post.created_at)}
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function dialogTitle(dialog: Dialog) {
  return {
    settings: "Conta e privacidade",
    notices: "Avisos da sua turma",
    runEdit: "Ajustar encontro",
    groupEdit: "Os combinados da sua turma",
    report: "Vamos cuidar da comunidade",
    removePost: "Remover publicação?",
    auth: "Sua turma está aqui.",
    group: "Toda turma começa com alguém.",
    run: "Bora marcar um corre?",
    post: "O corre merece um registro.",
    profile: "Seu perfil, seu ritmo.",
    product: "Um novo item para a turma.",
    runDetail: "O próximo encontro",
    groupDetail: "Conheça sua turma",
    productDetail: "Feito para acompanhar você",
    photo: "Memórias da turma",
  }[dialog.type];
}
