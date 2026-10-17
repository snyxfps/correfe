import type { Data } from "./types";
export const demoUser = "demo-me";
const upcoming = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
export const makeDemo = (): Data => ({
  notifications: [],
  reports: [],
  profiles: [
    {
      id: demoUser,
      name: "Alex Costa",
      city: "Porto Alegre, RS",
      bio: "Um quilômetro de cada vez. Café depois da corrida? Sempre.",
      pace: "6:00",
    },
    {
      id: "ana",
      name: "Ana Martins",
      city: "Porto Alegre, RS",
      bio: "Colecionando quilômetros e pores do sol.",
      pace: "5:30",
    },
    {
      id: "leo",
      name: "Leo Santos",
      city: "Porto Alegre, RS",
      bio: "O melhor pace é em boa companhia.",
      pace: "6:00",
    },
  ],
  groups: [
    {
      id: "g1",
      owner_id: demoUser,
      name: "Orla Run Club",
      city: "Porto Alegre, RS",
      rules:
        "Chegue 10 minutos antes. Leve água. Respeite os pedestres. Ninguém fica para trás.",
      contact: "Procure o organizador no ponto de saída, com a camiseta CORREFÉ.",
      description:
        "A orla é nosso ponto de encontro. Todos os ritmos, a mesma energia. Bora correr e ver o sol se pôr?",
      color: "#e6e6e3",
    },
    {
      id: "g2",
      owner_id: "ana",
      name: "Corre sem pressa",
      city: "Porto Alegre, RS",
      description:
        "Começando agora? Aqui ninguém fica para trás. Corrida leve, conversa boa e café no final.",
      color: "#e6e6e3",
    },
    {
      id: "g3",
      owner_id: "leo",
      name: "5AM Crew",
      city: "Porto Alegre, RS",
      description:
        "A cidade ainda dorme. A gente já está na rua. Treinos para quem gosta de começar cedo.",
      color: "#e6e6e3",
    },
  ],
  memberships: [
    { group_id: "g1", user_id: demoUser },
    { group_id: "g1", user_id: "ana" },
    { group_id: "g1", user_id: "leo" },
    { group_id: "g2", user_id: "ana" },
    { group_id: "g3", user_id: "leo" },
  ],
  runs: [
    {
      id: "r0",
      neighborhood: "Praia de Belas",
      beginner_friendly: true,
      no_one_left_behind: true,
      duration_minutes: 60,
      status: "scheduled",
      group_id: "g1",
      creator_id: demoUser,
      title: "Quilômetros de boas histórias",
      starts_at: upcoming(-1, 18),
      start_point: "Usina do Gasômetro",
      end_point: "Orla do Guaíba",
      distance: 5,
      pace: "6:00",
      description:
        "Nosso encontro de ontem. O álbum está aberto para os registros da turma.",
    },
    {
      id: "r1",
      neighborhood: "Centro Histórico",
      beginner_friendly: true,
      no_one_left_behind: true,
      duration_minutes: 60,
      status: "scheduled",
      group_id: "g1",
      creator_id: demoUser,
      title: "O pôr do sol é a linha de chegada.",
      starts_at: upcoming(1, 18),
      start_point: "Usina do Gasômetro",
      end_point: "Pontal do Guaíba",
      distance: 5,
      pace: "6:00–7:00",
      description:
        "Um treino leve pela orla, com pausa para a foto no final. Leve sua água. Todos os níveis são bem-vindos!",
    },
    {
      id: "r2",
      neighborhood: "Bom Fim",
      beginner_friendly: true,
      no_one_left_behind: true,
      duration_minutes: 45,
      status: "scheduled",
      group_id: "g2",
      creator_id: "ana",
      title: "Corre, conversa & café",
      starts_at: upcoming(2, 7),
      start_point: "Arco da Redenção",
      end_point: "Café do Parque",
      distance: 3,
      pace: "7:00–8:00",
      description:
        "Seu primeiro 3 km pode ser com a gente. Sem pressão e sem deixar ninguém para trás.",
    },
    {
      id: "r3",
      neighborhood: "Praia de Belas",
      beginner_friendly: false,
      no_one_left_behind: false,
      duration_minutes: 70,
      status: "scheduled",
      group_id: "g3",
      creator_id: "leo",
      title: "Antes da cidade acordar",
      starts_at: upcoming(3, 5),
      start_point: "Parque Marinha",
      end_point: "Usina do Gasômetro",
      distance: 8,
      pace: "5:00–6:00",
      description:
        "Saída pontual. Encontro no portão principal, 10 minutos antes.",
    },
  ],
  participants: [
    { run_id: "r0", user_id: demoUser },
    { run_id: "r1", user_id: "ana" },
    { run_id: "r1", user_id: "leo" },
    { run_id: "r2", user_id: "ana" },
  ],
  posts: [
    {
      id: "p1",
      user_id: "ana",
      group_id: "g1",
      run_id: null,
      body: "A gente veio pelos quilômetros e ficou pela companhia. Mais um fim de tarde que vai para a memória. 🖤",
      photo_path: "/run-community.svg",
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "p2",
      user_id: "leo",
      group_id: "g3",
      run_id: null,
      body: "O despertador foi difícil. Esse céu compensou tudo. Quem vem no próximo?",
      photo_path: "/sunrise.svg",
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
  ],
  likes: [{ post_id: "p1", user_id: "leo" }],
  products: [
    {
      id: "prod1",
      group_id: "g1",
      name: "Camiseta Club",
      description:
        "Leve no corpo. Forte na identidade. Poliamida, modelagem unissex.",
      price_cents: 8900,
      category: "Camiseta",
      active: true,
    },
    {
      id: "prod2",
      group_id: "g1",
      name: "Boné Everyday",
      description: "Ajustável, respirável e pronto para qualquer quilômetro.",
      price_cents: 6500,
      category: "Boné",
      active: true,
    },
    {
      id: "prod3",
      group_id: "g2",
      name: "Meia Vai no seu ritmo",
      description: "Conforto do primeiro ao último passo. Par, tamanho único.",
      price_cents: 3500,
      category: "Meia",
      active: true,
    },
  ],
  orders: [],
});
