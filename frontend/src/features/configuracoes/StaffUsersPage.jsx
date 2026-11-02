import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { api, apiPost } from "../../lib/api";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "FISCAL",
  marketId: "",
};

export default function StaffUsersPage() {
  const [users, setUsers] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [staff, marketList] = await Promise.all([api("/admin/users"), api("/admin/markets")]);
    setUsers(staff);
    setMarkets(marketList);
  }

  useEffect(() => {
    let active = true;
    Promise.all([api("/admin/users"), api("/admin/markets")])
      .then(([staff, marketList]) => {
        if (active) {
          setUsers(staff);
          setMarkets(marketList);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiPost("/admin/users", {
        ...form,
        marketId: form.marketId ? Number(form.marketId) : null,
      });
      setForm(emptyForm);
      await refresh();
      setNotice("Utilizador criado. A palavra-passe foi guardada com hash.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Tem a certeza de que pretende eliminar a conta de ${user.name}? Esta acção não pode ser desfeita.`)) {
      return;
    }
    setDeletingId(user.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/users/${user.id}`, { method: "DELETE" });
      await refresh();
      setNotice(`A conta de ${user.name} foi eliminada.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Utilizadores de equipa</h1>
        <p className="mt-1 text-sm text-text-muted">Crie credenciais de fiscais e gestores financeiros. Cada perfil tem permissões verificadas pela API.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">{notice}</p>}
      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Nome<input required maxLength={120} value={form.name} onChange={(event) => setField("name", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="text-sm font-medium">Perfil<select value={form.role} onChange={(event) => setField("role", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="FISCAL">Fiscal</option><option value="FINANCIAL_MANAGER">Gestor Financeiro</option></select></label>
          <label className="text-sm font-medium">E-mail<input required type="email" maxLength={254} value={form.email} onChange={(event) => setField("email", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="text-sm font-medium">Telefone<input required type="tel" maxLength={32} value={form.phone} onChange={(event) => setField("phone", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="text-sm font-medium">Palavra-passe inicial (mín. 12 caracteres)<input required type="password" minLength={12} maxLength={72} autoComplete="new-password" value={form.password} onChange={(event) => setField("password", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border px-3 font-normal" /></label>
          <label className="text-sm font-medium">Mercado{form.role === "FISCAL" && <span className="text-danger"> *</span>}<select required={form.role === "FISCAL"} value={form.marketId} onChange={(event) => setField("marketId", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="">Todos os mercados</option>{markets.filter((market) => market.active).map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select></label>
          <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "A criar…" : "Criar utilizador"}</Button></div>
        </form>
      </Card>
      <Card className="overflow-x-auto p-0">
        <div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1.5fr_1fr_auto] gap-3 border-b border-border bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-text-muted"><span>Nome</span><span>Perfil</span><span>E-mail / telefone</span><span>Mercado</span><span>Acções</span></div>
        {loading && <p className="p-4 text-sm text-text-muted">A carregar utilizadores…</p>}
        {!loading && users.length === 0 && <p className="p-4 text-sm text-text-muted">Nenhum utilizador de equipa registado.</p>}
        {users.map((user) => <div key={user.id} className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0"><span className="font-medium">{user.name}</span><span>{user.role === "FISCAL" ? "Fiscal" : "Gestor Financeiro"}</span><span>{user.email}<span className="block text-xs text-text-muted">{user.phone}</span></span><span>{user.market || "Todos"}</span><Button variant="secondary" className="h-9 px-3 text-danger" onClick={() => deleteUser(user)} disabled={deletingId === user.id}><Trash2 size={16} />{deletingId === user.id ? "A eliminar…" : "Eliminar"}</Button></div>)}
      </Card>
    </div>
  );
}
