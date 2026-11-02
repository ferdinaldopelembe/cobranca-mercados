import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil, Lock, Unlock } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Tooltip from "../../components/ui/Tooltip";
import { Table, THead, TH, TBody, TR, TD } from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { api, apiPatch } from "../../lib/api";

const PAGE_SIZE = 8;
const stateVariants = { Regular: "success", "Em dívida": "warning", Bloqueado: "danger" };

function mapMerchant(item) {
  return {
    ...item,
    nome: item.name,
    nuit: item.nuit || "—",
    contacto: item.phone || "—",
    mercado: item.market || "—",
    banca: item.stall || "—",
    produto: item.product || "—",
    taxa: item.periodicity && item.amount
      ? `${item.periodicity} · ${Number(item.amount).toLocaleString("pt-MZ")} MT`
      : "Sem taxa activa",
    estado: item.status,
    motivoBloqueio: item.statusReason,
  };
}

export default function ComerciantesPage() {
  const [merchants, setMerchants] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([api("/admin/merchants"), api("/admin/markets")])
      .then(([merchantItems, marketItems]) => {
        if (active) {
          setMerchants(merchantItems.map(mapMerchant));
          setMarkets(marketItems);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const products = [...new Set(merchants.map((merchant) => merchant.produto).filter((value) => value !== "—"))];
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return merchants.filter((merchant) => (
      (!text || merchant.nome.toLowerCase().includes(text)
        || merchant.nuit.toLowerCase().includes(text)
        || merchant.contacto.toLowerCase().includes(text))
      && (!marketFilter || merchant.mercado === marketFilter)
      && (!productFilter || merchant.produto === productFilter)
      && (!stateFilter || merchant.estado === stateFilter)
    ));
  }, [merchants, query, marketFilter, productFilter, stateFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleStatus(merchant) {
    const status = merchant.estado === "Bloqueado" ? "Regular" : "Bloqueado";
    try {
      const updated = await apiPatch(`/admin/merchants/${merchant.id}/status`, {
        status,
        reason: status === "Bloqueado"
          ? "Bloqueio efectuado pela administração"
          : "Regularização autorizada pela administração",
      });
      setMerchants((current) => current.map((item) =>
        item.id === updated.id ? mapMerchant(updated) : item
      ));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Comerciantes</h1>
          <p className="mt-1 text-sm text-text-muted">
            {merchants.length} comerciantes registados.
          </p>
        </div>
        <Link to="/comerciantes/novo"><Button><Plus size={16} /> Novo comerciante</Button></Link>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Pesquisar por nome, NUIT ou telefone…"
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={marketFilter} onChange={(event) => { setMarketFilter(event.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm">
          <option value="">Todos os mercados</option>
          {markets.map((market) => <option key={market.id} value={market.name}>{market.name}</option>)}
        </select>
        <select value={productFilter} onChange={(event) => { setProductFilter(event.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm">
          <option value="">Todos os produtos</option>
          {products.map((product) => <option key={product} value={product}>{product}</option>)}
        </select>
        <select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm">
          <option value="">Todos os estados</option>
          <option value="Regular">Regular</option>
          <option value="Em dívida">Em dívida</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
      </Card>

      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      <Card className="overflow-hidden p-0">
        <Table>
          <THead><TH>Nome</TH><TH>NUIT</TH><TH>Contacto</TH><TH>Mercado / Banca</TH><TH>Produto</TH><TH>Taxa</TH><TH>Estado</TH><TH className="text-right">Acções</TH></THead>
          <TBody>
            {pageItems.map((merchant) => (
              <TR key={merchant.id}>
                <TD className="font-medium text-text">{merchant.nome}</TD>
                <TD className="font-mono text-xs text-text-muted">{merchant.nuit}</TD>
                <TD className="text-text-muted">{merchant.contacto}</TD>
                <TD><span className="block text-sm">{merchant.mercado}</span><span className="font-mono text-xs text-text-muted">{merchant.banca}</span></TD>
                <TD>{merchant.produto}</TD><TD className="text-text-muted">{merchant.taxa}</TD>
                <TD><Tooltip content={merchant.motivoBloqueio || ""}><Badge variant={stateVariants[merchant.estado] || "neutral"}>{merchant.estado}</Badge></Tooltip></TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/comerciantes/novo?id=${merchant.id}`} className="rounded-md p-1.5 text-text-muted hover:bg-slate-100" title="Editar comerciante"><Pencil size={16} /></Link>
                    <button className="rounded-md p-1.5 text-text-muted hover:bg-slate-100" title={merchant.estado === "Bloqueado" ? "Desbloquear" : "Bloquear"} onClick={() => toggleStatus(merchant)}>
                      {merchant.estado === "Bloqueado" ? <Unlock size={16} /> : <Lock size={16} />}
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {!loading && pageItems.length === 0 && <TR><TD className="py-8 text-center text-sm text-text-muted">{error ? "Não foi possível carregar os comerciantes." : "Nenhum comerciante encontrado."}</TD></TR>}
            {loading && <TR><TD className="py-8 text-center text-sm text-text-muted">A carregar comerciantes…</TD></TR>}
          </TBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>
    </div>
  );
}
