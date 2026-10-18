import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Receipt,
  Printer,
  Ban,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Tooltip from "../../components/ui/Tooltip";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
} from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { PAGAMENTOS, MERCADOS } from "../../data/mock";

const PAGE_SIZE = 8;

const estadoVariants = {
  Pago: "success",
  Pendente: "warning",
  "Em atraso": "danger",
  Anulado: "neutral",
};

const fmtMT = (v) =>
  v.toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MT";

export default function PagamentosPage() {
  const [pagamentos] = useState(PAGAMENTOS);
  const [pesquisa, setPesquisa] = useState("");
  const [mercado, setMercado] = useState("");
  const [estado, setEstado] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [page, setPage] = useState(1);

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return pagamentos.filter((p) => {
      const matchQ =
        !q ||
        p.senha.toLowerCase().includes(q) ||
        p.comerciante.toLowerCase().includes(q) ||
        p.banca.toLowerCase().includes(q);
      const matchMercado = !mercado || p.mercado === mercado;
      const matchEstado = !estado || p.estado === estado;
      const matchPeriodo = !periodo || p.periodo.includes(periodo);
      return matchQ && matchMercado && matchEstado && matchPeriodo;
    });
  }, [pagamentos, pesquisa, mercado, estado, periodo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage(fn) {
    return (e) => {
      fn(e.target.value);
      setPage(1);
    };
  }

  // Totais rápidos para os cards
  const totalRecebido = pagamentos
    .filter((p) => p.estado === "Pago")
    .reduce((s, p) => s + p.valor, 0);
  const totalPendente = pagamentos
    .filter((p) => p.estado === "Pendente")
    .reduce((s, p) => s + p.valor, 0);
  const totalAtraso = pagamentos
    .filter((p) => p.estado === "Em atraso")
    .reduce((s, p) => s + p.valor, 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pagamentos</h1>
          <p className="mt-1 text-sm text-text-muted">
            Histórico de pagamentos de taxas nos mercados informais.
          </p>
        </div>
        <Link to="/pagamentos/novo">
          <Button>
            <Plus size={16} />
            Registar pagamento
          </Button>
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Recebido
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-600">
            {fmtMT(totalRecebido)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Pendente
          </p>
          <p className="mt-2 text-xl font-semibold text-amber-600">
            {fmtMT(totalPendente)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Em atraso
          </p>
          <p className="mt-2 text-xl font-semibold text-red-600">
            {fmtMT(totalAtraso)}
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Pesquisar por senha, comerciante ou banca…"
            value={pesquisa}
            onChange={resetPage(setPesquisa)}
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={mercado}
          onChange={resetPage(setMercado)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os mercados</option>
          {MERCADOS.map((m) => (
            <option key={m.id} value={m.nome}>
              {m.nome}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={resetPage(setEstado)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os estados</option>
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
          <option value="Em atraso">Em atraso</option>
          <option value="Anulado">Anulado</option>
        </select>

        <input
          type="text"
          placeholder="Período (ex.: 18/10/2025)"
          value={periodo}
          onChange={resetPage(setPeriodo)}
          className="h-10 w-56 rounded-lg border border-border bg-white px-3 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        <Table>
          <THead>
            <TH>Senha</TH>
            <TH>Comerciante</TH>
            <TH>Mercado / Banca</TH>
            <TH>Taxa</TH>
            <TH>Período</TH>
            <TH>Método</TH>
            <TH className="text-right">Valor</TH>
            <TH>Data</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acções</TH>
          </THead>
          <TBody>
            {pageItems.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono text-xs text-text">{p.senha}</TD>
                <TD className="font-medium text-text">{p.comerciante}</TD>
                <TD className="text-text">
                  <span className="block text-sm">{p.mercado}</span>
                  <span className="font-mono text-xs text-text-muted">
                    {p.banca}
                  </span>
                </TD>
                <TD className="text-text">{p.taxa}</TD>
                <TD className="text-text-muted">{p.periodo}</TD>
                <TD className="text-text">{p.metodo}</TD>
                <TD className="text-right font-medium text-text">
                  {fmtMT(p.valor)}
                </TD>
                <TD className="text-text-muted">{p.data}</TD>
                <TD>
                  <Tooltip content={p.motivo || ""}>
                    <Badge variant={estadoVariants[p.estado]}>{p.estado}</Badge>
                  </Tooltip>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Ver detalhe"
                      onClick={() => alert(`Detalhe ${p.senha} (mock).`)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text disabled:opacity-40"
                      title="Ver senha"
                      onClick={() => alert(`Senha ${p.senha} (mock).`)}
                      disabled={p.estado !== "Pago"}
                    >
                      <Receipt size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text disabled:opacity-40"
                      title="Reimprimir"
                      onClick={() => alert(`Reimprimir ${p.senha} (mock).`)}
                      disabled={p.estado !== "Pago"}
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                      title="Anular"
                      onClick={() => alert(`Anular ${p.senha} (mock).`)}
                      disabled={p.estado === "Anulado"}
                    >
                      <Ban size={16} />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {pageItems.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-sm text-text-muted">
                  Nenhum pagamento encontrado.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}