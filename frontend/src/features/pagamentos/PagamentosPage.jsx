import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Printer } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import useAuth from "../../context/useAuth";
import ComerciantePagamentosPage from "./ComerciantePagamentosPage";
import { exportReceiptPdf } from "../../utils/exportReceiptPdf";
import { api } from "../../lib/api";
import { mapApiPayment } from "./paymentView";
import { formatMT } from "../../lib/format";
import FiscalOperationsPage from "./FiscalOperationsPage";
import FinanceApprovalsPage from "./FinanceApprovalsPage";

const PAGE_SIZE = 8;

export default function PagamentosPage() {
  const { user } = useAuth();
  if (user?.role === "Administrador") return <AdminPagamentosPage />;
  if (user?.role === "Fiscal") return <FiscalOperationsPage />;
  if (user?.role === "Gestor Financeiro") return <FinanceApprovalsPage />;
  return <ComerciantePagamentosPage />;
}

function AdminPagamentosPage() {
  const [payments, setPayments] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api("/payments"), api("/admin/markets")])
      .then(([items, marketItems]) => {
        if (!active) return;
        setPayments(items.map(mapApiPayment));
        setMarkets(marketItems);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const date = (payment.paidAt || payment.issuedAt)?.slice(0, 10) || "";
      return (!text || payment.senha.toLowerCase().includes(text)
        || payment.comerciante.toLowerCase().includes(text)
        || payment.banca.toLowerCase().includes(text))
        && (!marketFilter || payment.marketId === Number(marketFilter))
        && (!from || date >= from)
        && (!to || date <= to);
    });
  }, [payments, search, marketFilter, from, to]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const confirmedPayments = payments.filter((payment) => payment.estado === "Pago");
  const total = confirmedPayments.reduce((sum, payment) => sum + Number(payment.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Pagamentos</h1><p className="mt-1 text-sm text-text-muted">Senhas emitidas, recebimentos pendentes e pagamentos confirmados.</p></div><Link to="/pagamentos/novo"><Button><Plus size={16} /> Emitir senha</Button></Link></div>
      <div className="grid gap-4 sm:grid-cols-2"><Card className="p-4"><p className="text-xs font-medium uppercase text-text-muted">Total confirmado</p><p className="mt-2 text-xl font-semibold text-success">{formatMT(total)}</p></Card><Card className="p-4"><p className="text-xs font-medium uppercase text-text-muted">Pagamentos confirmados</p><p className="mt-2 text-xl font-semibold">{confirmedPayments.length}</p></Card></div>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-sm"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Pesquisar referência, comerciante ou banca…" className="h-10 w-full rounded-lg border border-border pl-9 pr-3 text-sm" /></div>
        <select value={marketFilter} onChange={(event) => { setMarketFilter(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-border bg-white px-3 text-sm"><option value="">Todos os mercados</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select>
        <label className="text-xs text-text-muted">De <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="ml-1 h-10 rounded-lg border border-border px-2 text-sm text-text" /></label>
        <label className="text-xs text-text-muted">Até <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="ml-1 h-10 rounded-lg border border-border px-2 text-sm text-text" /></label>
      </Card>
      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      <Card className="overflow-hidden p-0"><Table>
        <THead><TH>Referência</TH><TH>Comerciante</TH><TH>Mercado / Banca</TH><TH>Produto / Taxa</TH><TH>Período</TH><TH>Método</TH><TH className="text-right">Valor</TH><TH>Data</TH><TH>Estado</TH><TH className="text-right">Recibo</TH></THead>
        <TBody>
          {items.map((payment) => <TR key={payment.id}><TD className="font-mono text-xs">{payment.senha}</TD><TD className="font-medium">{payment.comerciante}</TD><TD><span className="block">{payment.mercado}</span><span className="font-mono text-xs text-text-muted">{payment.banca}</span></TD><TD>{payment.produto}</TD><TD>{payment.periodo}</TD><TD>{payment.metodo}</TD><TD className="text-right">{formatMT(payment.valor)}</TD><TD>{payment.data}</TD><TD><Badge variant={payment.estado === "Pago" ? "success" : payment.estado === "Pendente" ? "warning" : "neutral"}>{payment.estado}</Badge></TD><TD className="text-right"><button disabled={payment.estado !== "Pago"} onClick={() => exportReceiptPdf(payment)} title="Imprimir recibo" className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 disabled:opacity-40"><Printer size={16} /></button></TD></TR>)}
          {loading && <TR><TD className="py-8 text-center text-sm text-text-muted">A carregar pagamentos…</TD></TR>}
          {!loading && items.length === 0 && <TR><TD className="py-8 text-center text-sm text-text-muted">Nenhum pagamento encontrado.</TD></TR>}
        </TBody>
      </Table><Pagination page={page} totalPages={totalPages} onChange={setPage} /></Card>
    </div>
  );
}
