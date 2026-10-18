import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { formatMT } from "../../lib/format";
import {
  MERCADOS,
  TIPOS_PRODUTO,
  TAXAS_POR_PRODUTO,
  BANCAS_POR_MERCADO,
} from "../../data/mock";

const initialForm = {
  nome: "",
  nuit: "",
  contacto: "",
  mercado: "",
  banca: "",
  produto: "",
  tipoTaxa: "",
  periodicidade: "",
};

export default function NovoComerciantePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Valor da taxa derivado do tipo de produto
  const taxa = useMemo(() => {
    if (!form.produto) return null;
    return TAXAS_POR_PRODUTO[form.produto] || null;
  }, [form.produto]);

  // Bancas disponíveis dependem do mercado
  const bancasDisponiveis = useMemo(() => {
    if (!form.mercado) return [];
    return BANCAS_POR_MERCADO[form.mercado] || [];
  }, [form.mercado]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) {
      setErrors((e) => ({ ...e, [name]: undefined }));
    }
  }

  function validate() {
    const next = {};
    if (!form.nome.trim()) next.nome = "Indique o nome completo.";
    if (!/^\d{9}$/.test(form.nuit.trim()))
      next.nuit = "O NUIT deve ter exactamente 9 dígitos numéricos.";
    if (!/^\+258\s(8[4-7])\s\d{3}\s\d{4}$/.test(form.contacto.trim()))
      next.contacto =
        "Use o formato +258 84/85/86/87 xxx xxxx.";
    if (!form.mercado) next.mercado = "Selecione o mercado.";
    if (!form.banca) next.banca = "Selecione a banca/posto.";
    if (!form.produto) next.produto = "Selecione o tipo de produto.";
    if (!form.tipoTaxa) next.tipoTaxa = "Selecione o tipo de taxa.";
    return next;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length === 0) {
      alert(
        `Comerciante "${form.nome}" guardado com sucesso (mock).\nNuit: ${form.nuit}`
      );
      navigate("/comerciantes");
    }
  }

  function handleCancel() {
    navigate("/comerciantes");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Comerciantes", to: "/comerciantes" },
          { label: "Novo" },
        ]}
      />

      <Link
        to="/comerciantes"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} />
        Voltar aos comerciantes
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-text">Novo comerciante</h1>
        <p className="mt-1 text-sm text-text-muted">
          Registe um novo comerciante num mercado informal do município.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[800px]">
        <Card className="divide-y divide-border">
          {/* Secção 1 — Identificação */}
          <section className="space-y-4 p-6">
            <h2 className="text-base font-semibold text-text">Identificação</h2>

            <Input
              id="nome"
              label="Nome completo"
              placeholder="Ex.: João Chirindza"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              error={submitted ? errors.nome : undefined}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="nuit"
                label="NUIT"
                placeholder="123456789"
                inputMode="numeric"
                maxLength={9}
                value={form.nuit}
                onChange={(e) =>
                  setField("nuit", e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                error={submitted ? errors.nuit : undefined}
                hint="9 dígitos, sem pontos nem espaços."
                required
              />
              <Input
                id="contacto"
                label="Contacto telefónico"
                placeholder="+258 84 123 4567"
                value={form.contacto}
                onChange={(e) => setField("contacto", e.target.value)}
                error={submitted ? errors.contacto : undefined}
                hint="Formato: +258 84/85/86/87 xxx xxxx."
                required
              />
            </div>
          </section>

          {/* Secção 2 — Localização */}
          <section className="space-y-4 p-6">
            <h2 className="text-base font-semibold text-text">Localização</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="mercado"
                label="Mercado"
                value={form.mercado}
                onChange={(e) => {
                  setField("mercado", e.target.value);
                  setField("banca", "");
                }}
                error={submitted ? errors.mercado : undefined}
                required
              >
                <option value="">Selecione o mercado</option>
                {MERCADOS.map((m) => (
                  <option key={m.id} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </Select>

              <Select
                id="banca"
                label="Banca / Posto"
                value={form.banca}
                onChange={(e) => setField("banca", e.target.value)}
                error={submitted ? errors.banca : undefined}
                disabled={!form.mercado}
                required
              >
                <option value="">
                  {form.mercado
                    ? "Selecione a banca"
                    : "Escolha primeiro o mercado"}
                </option>
                {bancasDisponiveis.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              id="produto"
              label="Tipo de produto"
              value={form.produto}
              onChange={(e) => {
                setField("produto", e.target.value);
                // preenche automaticamente tipo de taxa e periodicidade
                const t = TAXAS_POR_PRODUTO[e.target.value];
                if (t) {
                  setForm((f) => ({
                    ...f,
                    produto: e.target.value,
                    tipoTaxa: e.target.value,
                    periodicidade: t.periodicidade,
                  }));
                }
              }}
              error={submitted ? errors.produto : undefined}
              required
            >
              <option value="">Selecione o tipo de produto</option>
              {TIPOS_PRODUTO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </section>

          {/* Secção 3 — Taxa aplicável */}
          <section className="space-y-4 p-6">
            <h2 className="text-base font-semibold text-text">Taxa aplicável</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                id="tipoTaxa"
                label="Tipo de taxa"
                value={form.tipoTaxa}
                onChange={(e) => setField("tipoTaxa", e.target.value)}
                error={submitted ? errors.tipoTaxa : undefined}
                required
              >
                <option value="">Selecione o tipo</option>
                {TIPOS_PRODUTO.map((p) => (
                  <option key={p} value={p}>
                    Taxa de {p}
                  </option>
                ))}
              </Select>

              <Input
                id="periodicidade"
                label="Periodicidade"
                value={
                  taxa
                    ? TAXAS_POR_PRODUTO[form.produto].periodicidade
                    : form.periodicidade || ""
                }
                readOnly
                placeholder="—"
                hint="Definida pela taxa do produto."
                className="bg-slate-50"
              />

              <Input
                id="valor"
                label="Valor"
                value={taxa ? formatMT(taxa.valor) : "—"}
                readOnly
                hint="Valor definido na tabela de taxas."
                className="bg-slate-50 font-medium text-text"
              />
            </div>

            <p className="text-xs text-text-muted">
              O valor e a periodicidade são calculados automaticamente a partir
              do tipo de taxa do produto seleccionado.
            </p>
          </section>
        </Card>

        {/* Rodapé do formulário */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar comerciante</Button>
        </div>
      </form>
    </div>
  );
}