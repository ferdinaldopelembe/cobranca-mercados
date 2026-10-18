import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
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
import { formatMT } from "../../lib/format";
import { FISCAIS, MERCADOS } from "../../data/mock";

const PAGE_SIZE = 7;

export default function FiscaisPage() {
  const [fiscais, setFiscais] = useState(FISCAIS);
  const [pesquisa, setPesquisa] = useState("");
  const [mercado, setMercado] = useState("");
  const [page, setPage] = useState(1);

  // Modal "Novo fiscal"
  const [novoOpen, setNovoOpen] = useState(true);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    mercado: "",
    senhaTemporaria: "",
  });
  const [formError, setFormError] = useState("");

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return fiscais.filter((f) => {
      const matchQ =
        !q ||
        f.nome.toLowerCase().includes(q) ||
        f.telefone.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
      const matchMercado = !mercado || f.mercado === mercado;
      return matchQ && matchMercado;
    });
  }, [fiscais, pesquisa, mercado]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  function abrirNovo() {
    setForm({
      nome: "",
      telefone: "",
      email: "",
      mercado: "",
      senhaTemporaria: "",
    });
    setFormError("");
    setNovoOpen(true);
  }

  function gerarSenhaTemporaria() {
    const senha =
      "FSC-" +
      Math.random().toString(36).slice(2, 6).toUpperCase() +
      Math.floor(1000 + Math.random() * 9000);
    setForm((f) => ({ ...f, senhaTemporaria: senha }));
  }

  function guardar() {
    if (!form.nome.trim() || !form.telefone.trim() || !form.mercado) {
      setFormError("Preencha Nome, Telefone e Mercado para guardar.");
      return;
    }
    if (!form.senhaTemporaria) {
      setFormError("Gere uma senha temporária para o novo fiscal.");
      return;
    }
    const novo = {
      id: fiscais.length + 1,
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || "—",
      mercado: form.mercado,
      senhasValidadas: 0,
      totalCobrado: 0,
      estado: "Activo",
    };
    setFiscais((prev) => [novo, ...prev]);
    setNovoOpen(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Fiscais</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestão dos fiscais dos mercados informais do Município da Beira.
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={16} />
          Novo fiscal
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
            placeholder="Pesquisar por nome ou telefone…"
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
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        <Table>
          <THead>
            <TH>Nome</TH>
            <TH>Telefone</TH>
            <TH>Mercado atribuído</TH>
            <TH className="text-right">Senhas validadas (mês)</TH>
            <TH className="text-right">Total cobrado (mês)</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acções</TH>
          </THead>
          <TBody>
            {pageItems.map((f) => (
              <TR key={f.id}>
                <TD>
                  <span className="block font-medium text-text">{f.nome}</span>
                  <span className="text-xs text-text-muted">{f.email}</span>
                </TD>
                <TD className="text-text-muted">{f.telefone}</TD>
                <TD className="text-text">{f.mercado}</TD>
                <TD className="text-right text-text">{f.senhasValidadas}</TD>
                <TD className="text-right font-medium text-text">
                  {formatMT(f.totalCobrado)}
                </TD>
                <TD>
                  <Badge variant={f.estado === "Activo" ? "success" : "neutral"}>
                    {f.estado}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Ver"
                      onClick={() => alert(`Ver ${f.nome} (mock).`)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                      title="Editar"
                      onClick={() => alert(`Editar ${f.nome} (mock).`)}
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
                <TD className="py-8 text-center text-sm text-text-muted">
                  Nenhum fiscal encontrado.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Card>

      {/* Texto auxiliar */}
      <p className="text-xs text-text-muted">
        O fiscal só pode validar senhas do mercado atribuído.
      </p>

      {/* Modal Novo Fiscal */}
      <Modal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        title="Novo fiscal"
        description="Registe um novo fiscal e atribua-o a um mercado."
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
            id="nome-fiscal"
            label="Nome"
            placeholder="Ex.: Armando Tembe"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            id="telefone-fiscal"
            label="Telefone"
            placeholder="+258 84 123 4567"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <Input
            id="email-fiscal"
            label="E-mail (opcional)"
            type="email"
            placeholder="nome@beira.gov.mz"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Select
            id="mercado-fiscal"
            label="Mercado"
            value={form.mercado}
            onChange={(e) => setForm({ ...form, mercado: e.target.value })}
          >
            <option value="">Selecione o mercado</option>
            {MERCADOS.map((m) => (
              <option key={m.id} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </Select>

          <div>
            <label
              htmlFor="senha-fiscal"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Senha temporária
            </label>
            <div className="flex gap-2">
              <input
                id="senha-fiscal"
                readOnly
                value={form.senhaTemporaria}
                placeholder="Clique em Gerar para criar"
                className="h-10 flex-1 rounded-lg border border-border bg-slate-50 px-3 font-mono text-sm text-text focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={gerarSenhaTemporaria}
              >
                Gerar
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              O fiscal deverá alterar esta senha no primeiro acesso à app.
            </p>
          </div>

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