import { useEffect, useState } from "react";
import { RotateCcw, Save, ShieldCheck, Check } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import useLanguage from "../../context/useLanguage";
import { LANGUAGES } from "../../context/languages";
import { api, apiPost, apiPut } from "../../lib/api";

export default function ConfiguracoesPage() {
  const { language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/admin/settings")
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  function updateGeneral(field, value) {
    setSettings((current) => ({
      ...current,
      geral: { ...current.geral, [field]: value },
    }));
    setSaved(false);
  }

  function updateBilling(field, value) {
    setSettings((current) => ({
      ...current,
      cobranca: { ...current.cobranca, [field]: value },
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = await apiPut("/admin/settings", settings);
      setSettings(result);
      setLanguage(result.geral.idioma);
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    setSaving(true);
    setError("");
    try {
      const result = await apiPost("/admin/settings/reset", {});
      setSettings(result);
      setLanguage(LANGUAGES.portuguese);
      setSaved(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p role={error ? "alert" : undefined} className={error ? "text-sm text-danger" : "text-sm text-text-muted"}>{error || "A carregar configurações…"}</p>;
  }

  const general = settings.geral;
  const inputClass = "mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Configurações</h1><p className="mt-1 text-sm text-text-muted">Identidade do sistema e preferências institucionais persistidas.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={restore} disabled={saving}><RotateCcw size={16} /> Restaurar predefinições</Button><Button onClick={save} disabled={saving}>{saved ? <Check size={16} /> : <Save size={16} />}{saving ? "A guardar…" : saved ? "Guardado" : "Guardar alterações"}</Button></div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {saved && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Configurações guardadas.</p>}

      <Card className="space-y-5 p-6">
        <div><h2 className="text-base font-semibold">Identidade institucional</h2><p className="text-sm text-text-muted">Estes dados são guardados no backend para utilização institucional.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do sistema"><input value={general.nomeSistema || ""} onChange={(event) => updateGeneral("nomeSistema", event.target.value)} className={inputClass} /></Field>
          <Field label="Município"><input value={general.municipio || ""} onChange={(event) => updateGeneral("municipio", event.target.value)} className={inputClass} /></Field>
          <Field label="Província"><input value={general.provincia || ""} onChange={(event) => updateGeneral("provincia", event.target.value)} className={inputClass} /></Field>
          <Field label="Moeda"><select value={general.moeda || "MZN"} onChange={(event) => updateGeneral("moeda", event.target.value)} className={inputClass}><option value="MZN">Metical (MZN)</option></select></Field>
          <Field label="Idioma"><select value={general.idioma || language} onChange={(event) => { updateGeneral("idioma", event.target.value); setLanguage(event.target.value); }} className={inputClass}><option value={LANGUAGES.portuguese}>{LANGUAGES.portuguese}</option><option value={LANGUAGES.english}>{LANGUAGES.english}</option></select></Field>
          <Field label="Fuso horário"><select value={general.fusoHorario || "Africa/Maputo"} onChange={(event) => updateGeneral("fusoHorario", event.target.value)} className={inputClass}><option value="Africa/Maputo">Africa/Maputo</option><option value="UTC">UTC</option></select></Field>
          <Field label="Responsável"><input value={general.nomeResponsavel || ""} onChange={(event) => updateGeneral("nomeResponsavel", event.target.value)} className={inputClass} /></Field>
          <Field label="E-mail de contacto"><input type="email" value={general.emailContacto || ""} onChange={(event) => updateGeneral("emailContacto", event.target.value)} className={inputClass} /></Field>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div><h2 className="text-base font-semibold">Regras de emissão</h2><p className="text-sm text-text-muted">A validade é calculada e aplicada pelo backend.</p></div>
        <Field label="Validade de senhas não pagas (horas)">
          <input
            type="number"
            min="1"
            max="720"
            step="1"
            value={settings.cobranca.validadeSenhaHoras ?? 48}
            onChange={(event) => updateBilling("validadeSenhaHoras", Number(event.target.value))}
            className={inputClass}
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck size={18} /> Regras aplicadas pela API</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-text-muted">
          <li>Perfis de administrador, comerciante, fiscal e gestor financeiro são verificados no backend.</li>
          <li>Os valores, períodos e referências de pagamento são calculados pelo servidor.</li>
          <li>Recebimentos em numerário só entram na receita após confirmação financeira.</li>
          <li>As sessões expiram após 30 minutos de inactividade; use HTTPS fora do ambiente local.</li>
          <li>As notificações por SMS e autenticação de dois factores não estão configuradas.</li>
        </ul>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-sm font-medium">{label}{children}</label>;
}
