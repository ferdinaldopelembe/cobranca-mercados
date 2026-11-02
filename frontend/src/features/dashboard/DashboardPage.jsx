import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Receipt, Users, Coins, ArrowRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import BarChart from "../../components/ui/BarChart";
import LineChart from "../../components/ui/LineChart";
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table";
import { api } from "../../lib/api";
import { formatMT } from "../../utils/format";

const periods = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "7d", label: "Últimos 7 dias", days: 7 },
  { value: "30d", label: "Últimos 30 dias", days: 30 },
];

function localIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDay(iso) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

export default function DashboardPage() {
  const [markets, setMarkets] = useState([]);
  const [marketId, setMarketId] = useState("");
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/markets").then(setMarkets).catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    let active = true;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (periods.find((item) => item.value === period)?.days || 7) + 1);
    const params = new URLSearchParams({ from: localIso(start), to: localIso(end) });
    if (marketId) params.set("marketId", marketId);
    api(`/admin/dashboard?${params}`)
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [marketId, period]);

  const trend = useMemo(() => {
    const previous = Number(data?.previousRevenue || 0);
    if (!previous) return null;
    return Math.round(((Number(data.revenue) - previous) / previous) * 1000) / 10;
  }, [data]);
  const dailySeries = (data?.daily || []).map((item) => ({
    dia: formatDay(item.date),
    valor: Number(item.revenue),
  }));
  const marketSeries = (data?.markets || []).map((item) => ({
    label: item.market.replace(/^Mercado (do|da|de) /, ""),
    valor: Number(item.revenue),
  }));
  const recentMerchants = data?.recentMerchants || [];
  const hasDemoMerchants = recentMerchants.some((merchant) => merchant.name.startsWith("[DEMO]"));
  const selectedMarket = markets.find((item) => item.id === Number(marketId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-text">Dashboard</h1><p className="mt-1 text-sm text-text-muted">Resumo calculado a partir dos pagamentos persistidos.</p></div>
        <div className="flex flex-wrap gap-2">
          <select value={marketId} onChange={(event) => { setLoading(true); setMarketId(event.target.value); }} className="h-10 rounded-lg border border-border bg-white px-3 text-sm"><option value="">Todos os mercados</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select>
          <select value={period} onChange={(event) => { setLoading(true); setPeriod(event.target.value); }} className="h-10 rounded-lg border border-border bg-white px-3 text-sm">{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {hasDemoMerchants && (
        <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Dados de demonstração: comerciantes e senhas fictícios, sem pagamentos confirmados nem receita real.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<TrendingUp size={18} />} label="Receita total" value={formatMT(Number(data?.revenue || 0))} hint={trend == null ? "Sem dados no período anterior" : `${trend >= 0 ? "+" : ""}${trend}% vs. período anterior`} accent="primary" />
        <Kpi icon={<Receipt size={18} />} label="Pagamentos" value={Number(data?.transactions || 0).toLocaleString("pt-MZ")} hint="Pagamentos confirmados" accent="info" />
        <Kpi icon={<Users size={18} />} label="Comerciantes pagantes" value={Number(data?.merchants || 0).toLocaleString("pt-MZ")} hint="Com pelo menos um pagamento no período" accent="success" />
        <Kpi icon={<Coins size={18} />} label="Média por pagamento" value={formatMT(Number(data?.average || 0))} hint="Receita dividida por pagamentos confirmados" accent="warning" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2"><h2 className="text-sm font-semibold">Evolução da receita</h2><p className="mb-4 text-xs text-text-muted">{dailySeries.length} dia(s) · {selectedMarket?.name || "todos os mercados"}</p>{dailySeries.length ? <LineChart data={dailySeries} height={240} /> : <EmptyChart loading={loading} />}</Card>
        <Card className="p-5"><h2 className="text-sm font-semibold">Receita por mercado</h2><p className="mb-4 text-xs text-text-muted">{marketSeries.length} mercado(s)</p>{marketSeries.length ? <BarChart data={marketSeries} height={240} /> : <EmptyChart loading={loading} />}</Card>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3"><div><h2 className="text-sm font-semibold">Comerciantes recentes</h2><p className="text-xs text-text-muted">{selectedMarket?.name || "Todos os mercados"}</p></div><Link to="/comerciantes" className="inline-flex items-center gap-1 text-xs font-medium text-primary">Ver todos <ArrowRight size={14} /></Link></div>
        <Table><THead><TH>Nome</TH><TH>Mercado</TH><TH>Produto</TH><TH>Estado</TH><TH className="text-right">Registado em</TH></THead><TBody>
          {recentMerchants.filter((merchant) => !marketId || merchant.market === selectedMarket?.name).map((merchant) => <TR key={merchant.id}><TD className="font-medium">{merchant.name}</TD><TD>{merchant.market || "—"}</TD><TD>{merchant.product || "—"}</TD><TD><Badge variant={merchant.status === "Bloqueado" ? "danger" : "success"}>{merchant.status}</Badge></TD><TD className="text-right">{new Date(merchant.createdAt).toLocaleDateString("pt-MZ")}</TD></TR>)}
          {!loading && recentMerchants.length === 0 && <TR><TD className="py-8 text-center text-sm text-text-muted">Ainda não existem comerciantes registados.</TD></TR>}
        </TBody></Table>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint, accent }) {
  const colors = { primary: "bg-primary/10 text-primary", info: "bg-sky-100 text-sky-700", success: "bg-emerald-100 text-emerald-700", warning: "bg-amber-100 text-amber-700" };
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase text-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-text-muted">{hint}</p></div><div className={`rounded-lg p-2 ${colors[accent]}`}>{icon}</div></div></Card>;
}

function EmptyChart({ loading }) {
  return <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">{loading ? "A carregar dados…" : "Sem pagamentos no período seleccionado"}</div>;
}
