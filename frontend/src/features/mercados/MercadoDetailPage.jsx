import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  Search,
  MapPin,
  User,
  Store,
  Users,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import Breadcrumb from "../../components/ui/Breadcrumb";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
} from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { formatMT } from "../../lib/format";
import {
  MERCADOS_DETALHADOS,
  BANCAS_MAQUININO,
  TIPOS_ACTIVIDADE,
  MERCADOS,
} from "../../data/mock";

const PAGE_SIZE = 8;

export default function MercadoDetailPage() {
  const { id } = useParams();
  const mercado = useMemo(
    () => MERCADOS_DETALHADOS.find((m) => String(m.id) === String(id)) || MERCADOS_DETALHADOS[0],
    [id]
  );

  const [tab, setTab] = useState("bancas");
  const [bancas, setBancas] = useState(BANCAS_MAQUININO);
  const [pesquisa, setPesquisa] = useState("");
  const [page, setPage] = useState(1);

  // Modal
  const [novaOpen, setNovaOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", tipo: "", mercado: mercado.nome });
  const [formError, setFormError] = useState("");

  const bancasFiltradas = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return bancas.filter(
      (b) =>
        !q ||
        b.codigo.toLowerCase().includes(q) ||
        b.tipo.toLowerCase().includes(q) ||
        (b.comerciante || "").toLowerCase().includes(q)
    );
  }, [bancas, pesquisa]);

  const totalPages = Math.max(1, Math.ceil(bancasFiltradas.length / PAGE_SIZE));
  const pageItems = bancasFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function abrirNova() {
    setForm({ codigo: "", tipo: "", mercado: mercado.nome });
    setFormError("");
    setNovaOpen(true);
  }

  function guardar() {
    if (!form.codigo.trim() || !form.tipo) {
      setFormError("Preencha o código e o tipo de actividade.");
      return;
    }
    const nova = {
      id: bancas.length + 1,
      codigo: form.codigo.trim().toUpperCase(),
      tipo: form.tipo,
      comerciante: null,
      estado: "Livre",
    };
    setBancas((prev) => [nova, ...prev]);
    setNovaOpen(false);
    setPage(1);
  }

  const ocupadas = bancas.filter((b) => b.estado === "Ocupada").length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Mercados", to: "/mercados" },
          { label: mercado.nome.replace("Mercado do ", "").replace("Mercado da ", "").replace("Mercado de ", "") },
        ]}
      />

      {/* Botão voltar */}
      <Link
        to="/mercados"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} />
        Voltar aos mercados
      </Link>

      {/* Cabeçalho + indicadores */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">{mercado.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} />
                {mercado.localizacao}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User size={14} />
                Gestor: {mercado.gestor}
              </span>
              <Badge variant={mercado.estado === "Activo" ? "success" : "neutral"}>
                {mercado.estado}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Indicador
            icon={Store}
            label="Bancas"
            value={`${bancas.length} (${ocupadas} ocupadas)`}
          />
          <Indicador
            icon={Users}
            label="Comerciantes activos"
            value={mercado.comerciantes}
          />
          <Indicador
            icon={Wallet}
            label="Arrecadado no mês"
            value={formatMT(452800)}
          />
        </div>
      </div>

      {/* Separadores */}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "bancas", label: "Bancas", count: bancas.length },
          { value: "comerciantes", label: "Comerciantes", count: mercado.comerciantes },
          { value: "fiscais", label: "Fiscais" },
          { value: "taxas", label: "Taxas" },
        ]}
      />

      {/* Conteúdo do separador */}
      {tab === "bancas" && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="relative w-full max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Pesquisar banca ou comerciante…"
                value={pesquisa}
                onChange={(e) => {
                  setPesquisa(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button onClick={abrirNova}>
              <Plus size={16} />
              Nova banca
            </Button>
          </div>

          <Table>
            <THead>
              <TH>Código</TH>
              <TH>Tipo de actividade</TH>
              <TH>Comerciante associado</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acções</TH>
            </THead>
            <TBody>
              {pageItems.map((b) => (
                <TR key={b.id}>
                  <TD className="font-mono text-xs font-medium text-text">{b.codigo}</TD>
                  <TD className="text-text">{b.tipo}</TD>
                  <TD className={b.comerciante ? "text-text" : "text-text-muted italic"}>
                    {b.comerciante || "— sem comerciante —"}
                  </TD>
                  <TD>
                    <Badge variant={b.estado === "Ocupada" ? "success" : "neutral"}>
                      {b.estado}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <button
                      className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
                      onClick={() => alert(`Detalhe da banca ${b.codigo} (mock).`)}
                    >
                      Ver
                    </button>
                  </TD>
                </TR>
              ))}
              {pageItems.length === 0 && (
                <TR>
                  <TD className="py-8 text-center text-sm text-text-muted">
                    Nenhuma banca encontrada.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}

      {tab !== "bancas" && (
        <Card className="p-8 text-center">
          <p className="text-sm text-text-muted">
            Separador "{tab}" será implementado nas próximas telas.
          </p>
        </Card>
      )}

      {/* Modal Nova Banca */}
      <Modal
        open={novaOpen}
        onClose={() => setNovaOpen(false)}
        title="Nova banca"
        description={`Adicionar banca ao ${mercado.nome}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNovaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="codigo"
            label="Código"
            placeholder="Ex.: MQ-013"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            hint="Formato recomendado: prefixo do mercado + 3 dígitos."
          />
          <Select
            id="tipo"
            label="Tipo de actividade"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="">Selecione…</option>
            {TIPOS_ACTIVIDADE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            id="mercado"
            label="Mercado"
            value={form.mercado}
            onChange={(e) => setForm({ ...form, mercado: e.target.value })}
          >
            {MERCADOS.map((m) => (
              <option key={m.id} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </Select>

          {formError && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              {formError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Indicador({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="truncate text-base font-semibold text-text">{value}</p>
      </div>
    </Card>
  );
}