import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Pencil, MoreHorizontal } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
} from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { MERCADOS_DETALHADOS, GESTORES } from "../../data/mock";

const PAGE_SIZE = 5;

export default function MercadosPage() {
  const [mercados, setMercados] = useState(MERCADOS_DETALHADOS);
  const [pesquisa, setPesquisa] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [page, setPage] = useState(1);

  // Modal "Novo mercado"
  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", localizacao: "", gestor: "" });
  const [formError, setFormError] = useState("");

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return mercados.filter((m) => {
      const matchQ =
        !q ||
        m.nome.toLowerCase().includes(q) ||
        m.localizacao.toLowerCase().includes(q) ||
        m.gestor.toLowerCase().includes(q);
      const matchEstado = !estadoFiltro || m.estado === estadoFiltro;
      return matchQ && matchEstado;
    });
  }, [mercados, pesquisa, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function abrirNovo() {
    setForm({ nome: "", localizacao: "", gestor: "" });
    setFormError("");
    setNovoOpen(true);
  }

  function guardar() {
    if (!form.nome.trim() || !form.localizacao.trim() || !form.gestor) {
      setFormError("Preencha todos os campos para guardar o mercado.");
      return;
    }
    const novo = {
      id: mercados.length + 1,
      nome: form.nome.trim(),
      localizacao: form.localizacao.trim(),
      bancas: 0,
      comerciantes: 0,
      gestor: form.gestor,
      estado: "Activo",
    };
    setMercados((prev) => [novo, ...prev]);
    setNovoOpen(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Mercados</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestão dos mercados informais do Município da Beira.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={16} />
          Novo mercado
        </Button>
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
            placeholder="Pesquisar por nome, localização ou gestor…"
            value={pesquisa}
            onChange={(e) => {
              setPesquisa(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos os estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        <Table>
          <THead>
            <TH>Nome</TH>
            <TH>Localização</TH>
            <TH className="text-right">Bancas</TH>
            <TH className="text-right">Comerciantes</TH>
            <TH>Gestor</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acções</TH>
          </THead>
          <TBody>
            {pageItems.map((m) => (
              <TR key={m.id}>
                <TD>
                  <Link
                    to={`/mercados/${m.id}`}
                    className="font-medium text-text hover:text-primary"
                  >
                    {m.nome}
                  </Link>
                </TD>
                <TD className="text-text-muted">{m.localizacao}</TD>
                <TD className="text-right text-text">{m.bancas}</TD>
                <TD className="text-right text-text">{m.comerciantes}</TD>
                <TD className="text-text-muted">{m.gestor}</TD>
                <TD>
                  <Badge variant={m.estado === "Activo" ? "success" : "neutral"}>
                    {m.estado}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/mercados/${m.id}`}
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Ver detalhe"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Editar"
                      onClick={() =>
                        alert(`Editar "${m.nome}" (mock). Implementamos na tela de detalhe.`)
                      }
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Mais acções"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}

            {pageItems.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-text-muted" >
                  <span className="block text-sm">
                    Nenhum mercado encontrado.
                  </span>
                </TD>
              </TR>
            )}
          </TBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {/* Modal Novo Mercado */}
      <Modal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        title="Novo mercado"
        description="Adicione um novo mercado informal ao município."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNovoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="nome"
            label="Nome"
            placeholder="Ex.: Mercado do Maquinino"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            id="localizacao"
            label="Localização"
            placeholder="Ex.: Bairro do Maquinino, Beira"
            value={form.localizacao}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
          <Select
            id="gestor"
            label="Gestor responsável"
            value={form.gestor}
            onChange={(e) => setForm({ ...form, gestor: e.target.value })}
          >
            <option value="">Selecione um gestor</option>
            {GESTORES.map((g) => (
              <option key={g} value={g}>
                {g}
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