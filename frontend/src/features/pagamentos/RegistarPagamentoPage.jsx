import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Printer, Receipt, X } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  COMERCIANTES,
  METODOS_PAGAMENTO_OPCOES,
  PAGAMENTOS,
} from "../../data/mock";

const TIPO_TAXAS = ["Diária", "Semanal", "Mensal"];

const TAXA_POR_PRODUTO = {
  Peixe:      { Diária: 50, Semanal: 300, Mensal: 1100 },
  Hortaliças: { Diária: 40, Semanal: 240, Mensal: 900 },
  Roupa:      { Diária: 60, Semanal: 350, Mensal: 1200 },
  Carne:      { Diária: 80, Semanal: 480, Mensal: 1800 },
  Cereais:    { Diária: 40, Semanal: 240, Mensal: 900 },
};

const fmtMT = (v) =>
  v.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT";

const pad = (n) => String(n).padStart(2, "0");

function getPeriodoDefault(tipo) {
  const now = new Date();
  if (tipo === "Diária") {
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  }
  if (tipo === "Semanal") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} – ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`;
  }
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[now.getMonth()]} ${now.getFullYear()}`;
}

function parseTipo(valor) {
  if (valor.startsWith("Diária")) return "Diária";
  if (valor.startsWith("Semanal")) return "Semanal";
  return "Mensal";
}

function getNextSenha() {
  const ultimoNum = Math.max(
    ...PAGAMENTOS.map((p) => parseInt(p.senha.split("-").pop(), 10))
  );
  return `PAG-2025-${String(ultimoNum + 1).padStart(6, "0")}`;
}

const badgeEstado = {
  Regular: "success",
  "Em dívida": "warning",
  Bloqueado: "danger",
};

export default function RegistarPagamentoPage() {
  const navigate = useNavigate();

  const [comercianteId, setComercianteId] = useState("");
  const [tipo, setTipo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [metodo, setMetodo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erros, setErros] = useState({});
  const [sucesso, setSucesso] = useState(null);

  const comerciante = useMemo(
    () => COMERCIANTES.find((c) => c.id === Number(comercianteId)),
    [comercianteId]
  );

  const valor = useMemo(() => {
    if (!comerciante || !tipo) return 0;
    return TAXA_POR_PRODUTO[comerciante.produto]?.[tipo] || 0;
  }, [comerciante, tipo]);

  const precisaReferencia = metodo && metodo !== "Numerário";

  function selecionarComerciante(id) {
    const c = COMERCIANTES.find((x) => x.id === Number(id));
    if (!c) {
      setComercianteId("");
      setTipo("");
      setPeriodo("");
      return;
    }
    setComercianteId(c.id);
    const t = parseTipo(c.taxa);
    setTipo(t);
    setPeriodo(getPeriodoDefault(t));
    setErros((e) => ({ ...e, comerciante: undefined, tipo: undefined, periodo: undefined }));
  }

  function validar() {
    const e = {};
    if (!comercianteId) e.comerciante = "Selecione um comerciante.";
    if (!tipo) e.tipo = "Selecione o tipo de taxa.";
    if (!periodo) e.periodo = "Indique o período.";
    if (!metodo) e.metodo = "Selecione o método de pagamento.";
    if (precisaReferencia && !referencia.trim()) {
      e.referencia = "Indique a referência da transacção.";
    }
    return e;
  }

  function confirmar() {
    const e = validar();
    if (Object.keys(e).length > 0) {
      setErros(e);
      return;
    }
    const now = new Date();
    const dataStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setSucesso({
      senha: getNextSenha(),
      comerciante: comerciante.nome,
      mercado: comerciante.mercado,
      banca: comerciante.banca,
      tipo,
      periodo,
      metodo,
      referencia: referencia.trim() || "—",
      valor,
      data: dataStr,
    });
  }

  function resetar() {
    setComercianteId("");
    setTipo("");
    setPeriodo("");
    setMetodo("");
    setReferencia("");
    setObservacoes("");
    setErros({});
    setSucesso(null);
  }

  // ==================== VISTA DE SUCESSO ====================
  if (sucesso) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/pagamentos")}
            className="rounded-md p-1.5 hover:bg-slate-100"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-text">Pagamento registado</h1>
        </div>

        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-text">
              Pagamento confirmado com sucesso
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              A senha de pagamento foi emitida.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-text-muted">Senha</span>
              <span className="font-mono font-semibold text-text">{sucesso.senha}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Comerciante</span>
              <span className="font-medium text-text">{sucesso.comerciante}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Mercado / Banca</span>
              <span className="text-text">
                {sucesso.mercado} · <span className="font-mono text-xs">{sucesso.banca}</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Taxa</span>
              <span className="text-text">{sucesso.tipo} · {sucesso.periodo}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Método</span>
              <span className="text-text">
                {sucesso.metodo}
                {sucesso.referencia !== "—" && ` · ${sucesso.referencia}`}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Data</span>
              <span className="text-text">{sucesso.data}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-text">Valor pago</span>
              <span className="text-lg font-semibold text-emerald-600">
                {fmtMT(sucesso.valor)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-slate-50"
            >
              <Printer size={16} /> Imprimir senha
            </button>
            <button
              onClick={resetar}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-slate-50"
            >
              <Receipt size={16} /> Registar outro
            </button>
            <Button onClick={() => navigate("/pagamentos")}>
              Ver todos os pagamentos
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ==================== FORMULÁRIO ====================
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/pagamentos")}
          className="rounded-md p-1.5 hover:bg-slate-100"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-text">Registar pagamento</h1>
          <p className="mt-1 text-sm text-text-muted">
            Emita uma nova senha de pagamento de taxa para um comerciante.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna esquerda — formulário */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Comerciante */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              1. Comerciante
            </h2>
            <div className="mt-3">
              {!comerciante ? (
                <>
                  <select
                    value={comercianteId}
                    onChange={(e) => selecionarComerciante(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecionar comerciante…</option>
                    {COMERCIANTES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} — {c.banca} · {c.mercado}
                      </option>
                    ))}
                  </select>
                  {erros.comerciante && (
                    <p className="mt-1 text-xs text-red-600">{erros.comerciante}</p>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-text">{comerciante.nome}</p>
                        <Badge variant={badgeEstado[comerciante.estado]}>
                          {comerciante.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted">
                        NUIT <span className="font-mono">{comerciante.nuit}</span> · {comerciante.contacto}
                      </p>
                      <p className="text-xs text-text-muted">
                        {comerciante.mercado} · <span className="font-mono">{comerciante.banca}</span> · {comerciante.produto}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setComercianteId("");
                        setTipo("");
                        setPeriodo("");
                      }}
                      className="rounded-md p-1 text-text-muted hover:bg-slate-200"
                      title="Trocar comerciante"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Taxa e período */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              2. Taxa e período
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Tipo de taxa
                </label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value);
                    setPeriodo(getPeriodoDefault(e.target.value));
                  }}
                  disabled={!comerciante}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text disabled:bg-slate-50 disabled:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selecionar…</option>
                  {TIPO_TAXAS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {erros.tipo && <p className="mt-1 text-xs text-red-600">{erros.tipo}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Período
                </label>
                <input
                  type="text"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  disabled={!comerciante}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text disabled:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {erros.periodo && <p className="mt-1 text-xs text-red-600">{erros.periodo}</p>}
              </div>
            </div>
          </Card>

          {/* 3. Pagamento */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              3. Pagamento
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Método de pagamento
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {METODOS_PAGAMENTO_OPCOES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodo(m)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        metodo === m
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-white text-text hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {erros.metodo && <p className="mt-1 text-xs text-red-600">{erros.metodo}</p>}
              </div>

              {precisaReferencia && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Referência da transacção
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder={`Número de ${metodo}`}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {erros.referencia && (
                    <p className="mt-1 text-xs text-red-600">{erros.referencia}</p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna direita — resumo */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Resumo
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted">Comerciante</span>
                <span className="max-w-[60%] truncate text-right font-medium text-text">
                  {comerciante ? comerciante.nome : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted">Tipo de taxa</span>
                <span className="text-text">{tipo || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted">Período</span>
                <span className="text-right text-text">{periodo || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-muted">Método</span>
                <span className="text-text">{metodo || "—"}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium text-text">Total a pagar</span>
              <span className="text-xl font-semibold text-primary">{fmtMT(valor)}</span>
            </div>

            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={confirmar}>
                Confirmar pagamento
              </Button>
              <button
                onClick={() => navigate("/pagamentos")}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-text hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}