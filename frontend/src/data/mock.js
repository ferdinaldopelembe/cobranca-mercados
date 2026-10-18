export const MERCADOS = [
  { id: 1, nome: "Mercado do Maquinino" },
  { id: 2, nome: "Mercado do Goto" },
  { id: 3, nome: "Mercado do Chota" },
  { id: 4, nome: "Mercado da Manga" },
  { id: 5, nome: "Mercado do Esturro" },
  { id: 6, nome: "Mercado de Inhamizua" },
];

export const KPI_DADOS = {
  hoje: { valor: 287450, variacao: 12.4 },
  mes: { valor: 3824520, variacao: 8.7 },
  senhasPendentes: { valor: 142, variacao: -4.2 },
  bloqueados: { valor: 23, variacao: 2.1 },
};

// 30 pontos para gráfico de linha
export const ARRECADACAO_DIARIA = Array.from({ length: 30 }, (_, i) => {
  const base = 250000 + Math.sin(i / 2.5) * 60000;
  const noise = ((i * 37) % 40000) - 20000;
  return { dia: 30 - i, valor: Math.round(base + noise) };
});

export const ARRECADACAO_POR_MERCADO = [
  { mercado: "Maquinino", valor: 1482300 },
  { mercado: "Goto", valor: 982400 },
  { mercado: "Chota", valor: 645800 },
  { mercado: "Manga", valor: 452300 },
  { mercado: "Esturro", valor: 261720 },
];

export const DESEMPENHO_FISCAIS = [
  {
    fiscal: "Armando Tembe",
    mercado: "Maquinino",
    senhas: 128,
    total: 452800,
  },
  {
    fiscal: "Elisa Muianga",
    mercado: "Goto",
    senhas: 104,
    total: 389600,
  },
  {
    fiscal: "Carlos Nhaca",
    mercado: "Chota",
    senhas: 96,
    total: 342150,
  },
  {
    fiscal: "Fátima Sitoe",
    mercado: "Manga",
    senhas: 87,
    total: 298400,
  },
  {
    fiscal: "Rui Mabjaia",
    mercado: "Esturro",
    senhas: 72,
    total: 215900,
  },
];

export const METODOS_PAGAMENTO = [
  { metodo: "M-Pesa", valor: 1842300 },
  { metodo: "e-Mola", valor: 982400 },
  { metodo: "Mkesh", valor: 624500 },
  { metodo: "Numerário", valor: 375320 },
];

export const PAGAMENTOS_NUMERARIO_PENDENTES = [
  {
    id: 1,
    recibo: "REC-2026-001245",
    comerciante: "João Chirindza",
    mercado: "Maquinino",
    fiscal: "Armando Tembe",
    valor: 150,
    data: "2026-02-12T09:14:00",
  },
  {
    id: 2,
    recibo: "REC-2026-001244",
    comerciante: "Ana Mabunda",
    mercado: "Goto",
    fiscal: "Elisa Muianga",
    valor: 200,
    data: "2026-02-12T10:02:00",
  },
  {
    id: 3,
    recibo: "REC-2026-001243",
    comerciante: "Mateus Cossa",
    mercado: "Chota",
    fiscal: "Carlos Nhaca",
    valor: 100,
    data: "2026-02-12T10:47:00",
  },
  {
    id: 4,
    recibo: "REC-2026-001242",
    comerciante: "Salomé Macuácua",
    mercado: "Maquinino",
    fiscal: "Armando Tembe",
    valor: 250,
    data: "2026-02-12T11:22:00",
  },
];