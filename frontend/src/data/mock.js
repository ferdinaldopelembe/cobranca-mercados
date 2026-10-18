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

export const MERCADOS_DETALHADOS = [
  {
    id: 1,
    nome: "Mercado do Maquinino",
    localizacao: "Bairro do Maquinino, Beira",
    bancas: 148,
    comerciantes: 132,
    gestor: "Isabel Nhantumbo",
    estado: "Activo",
  },
  {
    id: 2,
    nome: "Mercado do Goto",
    localizacao: "Bairro do Goto, Beira",
    bancas: 96,
    comerciantes: 84,
    gestor: "Fernando Macuácua",
    estado: "Activo",
  },
  {
    id: 3,
    nome: "Mercado do Chota",
    localizacao: "Bairro do Chota, Beira",
    bancas: 72,
    comerciantes: 61,
    gestor: "Albertina Chirindza",
    estado: "Activo",
  },
  {
    id: 4,
    nome: "Mercado da Manga",
    localizacao: "Bairro da Manga, Beira",
    bancas: 58,
    comerciantes: 47,
    gestor: "Tomás Sitoe",
    estado: "Activo",
  },
  {
    id: 5,
    nome: "Mercado do Esturro",
    localizacao: "Bairro do Esturro, Beira",
    bancas: 41,
    comerciantes: 33,
    gestor: "Sandra Mabjaia",
    estado: "Inactivo",
  },
  {
    id: 6,
    nome: "Mercado de Inhamizua",
    localizacao: "Bairro de Inhamizua, Beira",
    bancas: 34,
    comerciantes: 28,
    gestor: "Domingos Cossa",
    estado: "Activo",
  },
];

export const GESTORES = [
  "Isabel Nhantumbo",
  "Fernando Macuácua",
  "Albertina Chirindza",
  "Tomás Sitoe",
  "Sandra Mabjaia",
  "Domingos Cossa",
];

export const BANCAS_MAQUININO = [
  { id: 1,  codigo: "MQ-001", tipo: "Peixe",      comerciante: "João Chirindza",     estado: "Ocupada" },
  { id: 2,  codigo: "MQ-002", tipo: "Peixe",      comerciante: "Ana Mabunda",         estado: "Ocupada" },
  { id: 3,  codigo: "MQ-003", tipo: "Hortaliças", comerciante: "Mateus Cossa",        estado: "Ocupada" },
  { id: 4,  codigo: "MQ-004", tipo: "Hortaliças", comerciante: null,                  estado: "Livre"   },
  { id: 5,  codigo: "MQ-005", tipo: "Roupa",      comerciante: "Salomé Macuácua",     estado: "Ocupada" },
  { id: 6,  codigo: "MQ-006", tipo: "Roupa",      comerciante: null,                  estado: "Livre"   },
  { id: 7,  codigo: "MQ-007", tipo: "Carne",      comerciante: "Rui Mabjaia",         estado: "Ocupada" },
  { id: 8,  codigo: "MQ-008", tipo: "Carne",      comerciante: "Fátima Sitoe",        estado: "Ocupada" },
  { id: 9,  codigo: "MQ-009", tipo: "Cereais",    comerciante: "Carlos Nhaca",        estado: "Ocupada" },
  { id: 10, codigo: "MQ-010", tipo: "Cereais",    comerciante: null,                  estado: "Livre"   },
  { id: 11, codigo: "MQ-011", tipo: "Peixe",      comerciante: "Elisa Muianga",       estado: "Ocupada" },
  { id: 12, codigo: "MQ-012", tipo: "Hortaliças", comerciante: "Armando Tembe",       estado: "Ocupada" },
];

export const TIPOS_ACTIVIDADE = ["Peixe", "Hortaliças", "Roupa", "Carne", "Cereais"];

export const COMERCIANTES = [
  {
    id: 1,
    nome: "João Chirindza",
    nuit: "123456789",
    contacto: "+258 84 321 4567",
    mercado: "Mercado do Maquinino",
    banca: "MQ-001",
    produto: "Peixe",
    taxa: "Diária · 50,00 MT",
    estado: "Regular",
  },
  {
    id: 2,
    nome: "Ana Mabunda",
    nuit: "234567890",
    contacto: "+258 85 456 7890",
    mercado: "Mercado do Maquinino",
    banca: "MQ-002",
    produto: "Peixe",
    taxa: "Diária · 50,00 MT",
    estado: "Em dívida",
  },
  {
    id: 3,
    nome: "Mateus Cossa",
    nuit: "345678901",
    contacto: "+258 86 234 5678",
    mercado: "Mercado do Goto",
    banca: "GT-014",
    produto: "Hortaliças",
    taxa: "Diária · 40,00 MT",
    estado: "Regular",
  },
  {
    id: 4,
    nome: "Salomé Macuácua",
    nuit: "456789012",
    contacto: "+258 84 876 5432",
    mercado: "Mercado do Maquinino",
    banca: "MQ-005",
    produto: "Roupa",
    taxa: "Semanal · 350,00 MT",
    estado: "Em dívida",
  },
  {
    id: 5,
    nome: "Rui Mabjaia",
    nuit: "567890123",
    contacto: "+258 87 111 2233",
    mercado: "Mercado do Chota",
    banca: "CH-008",
    produto: "Carne",
    taxa: "Diária · 80,00 MT",
    estado: "Regular",
  },
  {
    id: 6,
    nome: "Fátima Sitoe",
    nuit: "678901234",
    contacto: "+258 84 445 6677",
    mercado: "Mercado do Goto",
    banca: "GT-021",
    produto: "Cereais",
    taxa: "Mensal · 1200,00 MT",
    estado: "Bloqueado",
    motivoBloqueio: "Mais de 3 senhas vencidas",
  },
  {
    id: 7,
    nome: "Carlos Nhaca",
    nuit: "789012345",
    contacto: "+258 85 998 7766",
    mercado: "Mercado da Manga",
    banca: "MG-003",
    produto: "Cereais",
    taxa: "Mensal · 1200,00 MT",
    estado: "Regular",
  },
  {
    id: 8,
    nome: "Elisa Muianga",
    nuit: "890123456",
    contacto: "+258 86 667 8899",
    mercado: "Mercado do Goto",
    banca: "GT-011",
    produto: "Hortaliças",
    taxa: "Diária · 40,00 MT",
    estado: "Bloqueado",
    motivoBloqueio: "Mais de 3 senhas vencidas",
  },
];

export const TIPOS_PRODUTO = ["Peixe", "Hortaliças", "Roupa", "Carne", "Cereais"];