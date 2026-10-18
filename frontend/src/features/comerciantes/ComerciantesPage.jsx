import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Lock,
  Unlock,
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
import {
  COMERCIANTES,
  MERCADOS,
  TIPOS_PRODUTO,
} from "../../data/mock";

const PAGE_SIZE = 8;

const estadoVariants = {
  Regular: "success",
  "Em dívida": "warning",
  Bloqueado: "danger",
};

export default function ComerciantesPage() {
  const [comerciantes, setComerciantes] = useState(COMERCIANTES);
  const [pesquisa, setPesquisa] = useState("");
  const [mercado, setMercado] = useState("");
  const [produto, setProduto] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return comerciantes.filter((c) => {
      const matchQ =
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.nuit.includes(q) ||
        c.contacto.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
      const matchMercado = !mercado || c.mercado === mercado;
      const matchProduto = !produto || c.produto === produto;
      const matchEstado = !estado || c.estado === estado;
      return matchQ && matchMercado && matchProduto && matchEstado;
    });
  }, [comerciantes, pesquisa, mercado, produto, estado]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage(fn) {
    return (e) => {
      fn(e.target.value);
      setPage(1);
    };
  }

  function toggleBloqueio(c) {
    const bloqueado = c.estado === "Bloqueado";
    setComerciantes((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              estado: bloqueado ? "Regular" : "Bloqueado",
              motivoBloqueio: bloqueado ? undefined : "Bloqueio manual pelo gestor",
            }
          : x
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Comerciantes</h1>
          <p className="mt-1 text-sm text-text-muted">
            {comerciantes.length} comerciantes registados nos mercados informais.
          </p>
        </div>
        <Link to="/comerciantes/novo">
          <Button>
            <Plus size={16} />
            Novo comerciante
          </Button>
        </Link>
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
            placeholder="Pesquisar por nome, NUIT ou telefone…"
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
          value={produto}
          onChange={resetPage(setProduto)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os produtos</option>
          {TIPOS_PRODUTO.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={resetPage(setEstado)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os estados</option>
          <option value="Regular">Regular</option>
          <option value="Em dívida">Em dívida</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        <Table>
          <THead>
            <TH>Nome</TH>
            <TH>NUIT</TH>
            <TH>Contacto</TH>
            <TH>Mercado / Banca</TH>
            <TH>Tipo de produto</TH>
            <TH>Taxa aplicável</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acções</TH>
          </THead>
          <TBody>
            {pageItems.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-text">{c.nome}</TD>
                <TD className="font-mono text-xs text-text-muted">{c.nuit}</TD>
                <TD className="text-text-muted">{c.contacto}</TD>
                <TD className="text-text">
                  <span className="block text-sm">{c.mercado}</span>
                  <span className="font-mono text-xs text-text-muted">
                    {c.banca}
                  </span>
                </TD>
                <TD className="text-text">{c.produto}</TD>
                <TD className="text-text-muted">{c.taxa}</TD>
                <TD>
                  <Tooltip content={c.motivoBloqueio || ""}>
                    <Badge variant={estadoVariants[c.estado]}>{c.estado}</Badge>
                  </Tooltip>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Ver"
                      onClick={() => alert(`Ver ${c.nome} (mock).`)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Editar"
                      onClick={() => alert(`Editar ${c.nome} (mock).`)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title={c.estado === "Bloqueado" ? "Desbloquear" : "Bloquear"}
                      onClick={() => toggleBloqueio(c)}
                    >
                      {c.estado === "Bloqueado" ? (
                        <Unlock size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {pageItems.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-sm text-text-muted">
                  Nenhum comerciante encontrado.
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