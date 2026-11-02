import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api, apiPatch, apiPost, apiPut } from "../api";
import {
  Button,
  Card,
  Field,
  Icon,
  Loading,
  Notice,
  colors,
  commonStyles,
} from "../components";

const products = ["Peixe", "Hortaliças", "Roupa", "Carne", "Cereais", "Fruta"];
const periods = ["Diária", "Semanal", "Mensal"];
const zones = ["Zona A", "Zona B", "Zona C", "Zona D"];
const shifts = ["Manhã · 06h–14h", "Tarde · 14h–22h", "Noite · 22h–06h"];
const yesNo = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

const resources = {
  markets: {
    title: "Mercados",
    icon: "store-outline",
    endpoint: "/admin/markets",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "location", label: "Localização" },
      { key: "manager", label: "Gestor responsável" },
      { key: "active", label: "Estado do mercado", type: "select", options: yesNo },
    ],
    heading: (item) => item.name,
    lines: (item) => [
      item.location,
      `${item.stalls?.length || 0} banca(s) · ${item.merchantCount || 0} comerciante(s)`,
      item.manager ? `Gestor: ${item.manager}` : null,
      item.active ? "Activo" : "Inactivo",
    ],
  },
  merchants: {
    title: "Comerciantes",
    icon: "account-group-outline",
    endpoint: "/admin/merchants",
    fields: [
      { key: "name", label: "Nome completo", required: true },
      { key: "nuit", label: "NUIT (9 dígitos)", required: true, keyboardType: "number-pad" },
      { key: "phone", label: "Telefone", required: true, keyboardType: "phone-pad" },
      { key: "email", label: "E-mail", keyboardType: "email-address" },
      { key: "password", label: "Senha inicial (mínimo 8 caracteres)", required: true, secure: true, createOnly: true },
      { key: "marketId", label: "Mercado", required: true, type: "market" },
      { key: "stallId", label: "Banca", required: true, type: "stall" },
      { key: "product", label: "Produto", required: true, type: "product" },
    ],
    heading: (item) => item.name,
    lines: (item) => [
      `NUIT ${item.nuit} · ${item.phone}`,
      `${item.market} · Banca ${item.stall}`,
      `${item.product} · ${item.periodicity || "Sem taxa"}${item.amount ? ` · ${money(item.amount)}` : ""}`,
      `Estado: ${item.status}${item.statusReason ? ` · ${item.statusReason}` : ""}`,
    ],
  },
  rates: {
    title: "Taxas",
    icon: "receipt-text-outline",
    endpoint: "/admin/rates",
    fields: [
      { key: "marketId", label: "Mercado", required: true, type: "market" },
      { key: "product", label: "Produto", required: true, type: "select", options: products.map(option) },
      { key: "periodicity", label: "Periodicidade", required: true, type: "select", options: periods.map(option) },
      { key: "amount", label: "Valor (MT)", required: true, keyboardType: "decimal-pad" },
      { key: "description", label: "Descrição" },
      { key: "active", label: "Disponível para pagamentos", type: "select", options: yesNo },
    ],
    heading: (item) => item.product,
    lines: (item) => [
      item.market,
      `${item.periodicity} · ${money(item.amount)}`,
      `${item.merchants || 0} comerciante(s) · ${item.active ? "Activa" : "Suspensa"}`,
      item.description,
    ],
  },
  fiscals: {
    title: "Fiscais",
    icon: "shield-account-outline",
    endpoint: "/admin/fiscals",
    fields: [
      { key: "name", label: "Nome completo", required: true },
      { key: "nuit", label: "NUIT (9 dígitos)", required: true, keyboardType: "number-pad" },
      { key: "phone", label: "Telefone", required: true, keyboardType: "phone-pad" },
      { key: "email", label: "E-mail", required: true, keyboardType: "email-address" },
      { key: "marketId", label: "Mercado", required: true, type: "market" },
      { key: "zone", label: "Zona", required: true, type: "select", options: zones.map(option) },
      { key: "shift", label: "Turno", required: true, type: "select", options: shifts.map(option) },
    ],
    heading: (item) => item.name,
    lines: (item) => [
      `NUIT ${item.nuit} · ${item.phone}`,
      item.email,
      `${item.market} · ${item.zone} · ${item.shift}`,
      `Estado: ${item.status}${item.statusReason ? ` · ${item.statusReason}` : ""}`,
    ],
  },
  users: {
    title: "Utilizadores de equipa",
    icon: "account-key-outline",
    endpoint: "/admin/users",
    fields: [
      { key: "name", label: "Nome completo", required: true },
      { key: "email", label: "E-mail", required: true, keyboardType: "email-address" },
      { key: "phone", label: "Telefone", required: true, keyboardType: "phone-pad" },
      { key: "password", label: "Palavra-passe inicial (mín. 12 caracteres)", required: true, secure: true, createOnly: true },
      { key: "role", label: "Perfil", required: true, type: "select", options: [
        { value: "FISCAL", label: "Fiscal" },
        { value: "FINANCIAL_MANAGER", label: "Gestor Financeiro" },
      ] },
      { key: "marketId", label: "Mercado (obrigatório para fiscal)", type: "market" },
    ],
    heading: (item) => item.name,
    lines: (item) => [
      item.role === "FISCAL" ? "Fiscal" : "Gestor Financeiro",
      `${item.email} · ${item.phone}`,
      item.market || "Todos os mercados",
      `Estado: ${item.status}`,
    ],
  },
  tickets: { title: "Recibos", icon: "ticket-confirmation-outline", endpoint: "/admin/tickets", fields: [] },
};

function option(value) {
  return { value, label: value };
}

function money(value) {
  return `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

export default function ResourceScreen({ route, navigate }) {
  const [items, setItems] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resourceKey = route.resource;
  const config = resources[resourceKey];
  const mode = route.mode || "list";
  const editing = mode === "edit";
  const creating = mode === "create";
  const targetId = route.id;
  const selectedMarket = markets.find((market) => String(market.id) === String(form.marketId));
  const stallOptions = useMemo(() => {
    const available = selectedMarket?.stalls || [];
    return available
      .filter((stall) => !stall.occupied || String(stall.id) === String(form.stallId))
      .map((stall) => ({ value: stall.id, label: stall.code }));
  }, [selectedMarket, form.stallId]);
  const productOptions = useMemo(
    () => [...new Set(rates.map((rate) => rate.product))].map(option),
    [rates]
  );

  useEffect(() => {
    let active = true;
    const tasks = [
      config?.endpoint ? api(config.endpoint) : Promise.resolve([]),
      api("/admin/markets"),
    ];

    Promise.all(tasks)
      .then(async ([resourceItems, marketItems]) => {
        if (!active) return;
        setItems(resourceItems);
        setMarkets(marketItems);

        if (mode === "detail" && resourceKey === "markets") {
          const market = resourceItems.find((item) => item.id === Number(targetId));
          if (!market) throw new Error("Mercado não encontrado.");
        }

        if (config && (creating || editing)) {
          const existing = editing ? resourceItems.find((item) => item.id === Number(targetId)) : null;
          if (editing && !existing) throw new Error(`${config.title.slice(0, -1)} não encontrado.`);
          const initial = Object.fromEntries(
            config.fields
              .filter((field) => !field.createOnly || creating)
              .map((field) => {
                const initialValue = field.key === "active" ? true : "";
                return [field.key, existing?.[field.key] ?? initialValue];
              })
          );
          if (existing?.marketId != null) initial.marketId = String(existing.marketId);
          if (existing?.stallId != null) initial.stallId = String(existing.stallId);
          setForm(initial);
          if (resourceKey === "merchants" && initial.marketId) {
            const marketRates = await api(`/catalog/rates?marketId=${encodeURIComponent(initial.marketId)}`);
            if (active) setRates(marketRates);
          }
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [config, creating, editing, mode, resourceKey, targetId]);

  async function changeField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "marketId" && resourceKey === "merchants") {
      setForm((current) => ({ ...current, marketId: value, stallId: "", product: "" }));
      setRates([]);
      if (value) {
        try {
          setRates(await api(`/catalog/rates?marketId=${encodeURIComponent(value)}`));
        } catch (requestError) {
          setError(requestError.message);
        }
      }
    }
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const payload = { ...form };
      if ("marketId" in payload) payload.marketId = payload.marketId ? Number(payload.marketId) : null;
      if ("stallId" in payload) payload.stallId = Number(payload.stallId);
      if (resourceKey === "rates") payload.amount = Number(payload.amount);
      if ("active" in payload) payload.active = payload.active === true || payload.active === "true";
      if (resourceKey === "merchants" && editing) delete payload.password;
      if (resourceKey === "merchants" && !payload.email) payload.email = null;

      if (editing) await apiPut(`${config.endpoint}/${targetId}`, payload);
      else await apiPost(config.endpoint, payload);
      navigate({ resource: resourceKey, mode: "list" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    setError("");
    try {
      let updated;
      if (resourceKey === "merchants") {
        const status = item.status === "Bloqueado" ? "Regular" : "Bloqueado";
        updated = await apiPatch(`/admin/merchants/${item.id}/status`, {
          status,
          reason: status === "Bloqueado"
            ? "Bloqueio efectuado pela administração"
            : "Regularização autorizada pela administração",
        });
      } else if (resourceKey === "rates") {
        const active = !item.active;
        updated = await apiPatch(`/admin/rates/${item.id}/status`, {
          status: active ? "Activa" : "Suspensa",
        });
      } else {
        const status = item.status === "Inactivo" ? "Activo" : "Inactivo";
        updated = await apiPatch(`/admin/fiscals/${item.id}/status`, {
          status,
          reason: status === "Inactivo" ? "Desactivado pela administração" : null,
        });
      }
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function deleteUser(item) {
    Alert.alert(
      "Eliminar utilizador",
      `Tem a certeza de que pretende eliminar a conta de ${item.name}? Esta acção não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setError("");
            try {
              await api(`/admin/users/${item.id}`, { method: "DELETE" });
              setItems((current) => current.filter((entry) => entry.id !== item.id));
            } catch (requestError) {
              setError(requestError.message);
            }
          },
        },
      ]
    );
  }

  if (!config && resourceKey !== "stalls") return <View style={commonStyles.page}><Notice>Área móvel não encontrada.</Notice></View>;
  if (loading) return <Loading label={`A carregar ${config.title.toLowerCase()}…`} />;
  if (error && !items.length && mode === "list") {
    return <View style={commonStyles.page}><Notice>{error}</Notice><Button title="Tentar novamente" variant="secondary" onPress={() => navigate({ ...route })} /></View>;
  }

  if (creating || editing) {
    const fields = config.fields.filter((field) => !field.createOnly || creating);
    return (
      <View style={commonStyles.page}>
        <Text style={commonStyles.title}>{editing ? "Editar" : "Novo"} {config.title.toLowerCase().replace(/s$/, "")}</Text>
        <Text style={commonStyles.subtitle}>Os dados são guardados no mesmo sistema usado pelo frontend web.</Text>
        <Card>
          {fields.map((field) => {
            let options = field.options;
            if (field.type === "market") {
              options = markets.filter((market) => market.active || String(market.id) === String(form.marketId))
                .map((market) => ({ value: market.id, label: market.name }));
            } else if (field.type === "stall") {
              options = stallOptions;
            } else if (field.type === "product") {
              options = productOptions;
            }
            return (
              <Field
                key={field.key}
                label={field.label}
                icon={fieldIcons[field.key]}
                value={form[field.key]}
                onChangeText={(value) => changeField(field.key, value)}
                keyboardType={field.keyboardType}
                secureTextEntry={field.secure}
                options={options}
                placeholder={field.type ? "Seleccionar…" : undefined}
                editable={field.type !== "stall" || Boolean(form.marketId)}
                autoCapitalize={field.keyboardType === "email-address" ? "none" : undefined}
              />
            );
          })}
          {error ? <Notice>{error}</Notice> : null}
          <View style={commonStyles.row}>
            <View style={{ flex: 1 }}><Button title="Cancelar" icon="close" variant="secondary" onPress={() => navigate({ resource: resourceKey, mode: "list" })} /></View>
            <View style={{ flex: 1 }}><Button title={saving ? "A guardar…" : "Guardar"} icon="content-save-outline" onPress={save} disabled={saving} /></View>
          </View>
        </Card>
      </View>
    );
  }

  if (mode === "detail" && resourceKey === "markets") {
    const market = items.find((item) => item.id === Number(targetId));
    if (!market) {
      return (
        <View style={commonStyles.page}>
          <Notice>Mercado não encontrado.</Notice>
          <Button title="Voltar aos mercados" variant="secondary" onPress={() => navigate({ resource: "markets", mode: "list" })} />
        </View>
      );
    }
    return (
      <View style={commonStyles.page}>
        <View style={styles.titleRow}><Icon name="store-outline" size={25} color={colors.primary} /><Text style={commonStyles.title}>{market?.name || "Mercado"}</Text></View>
        <Text style={commonStyles.subtitle}>{market?.location || "Sem localização indicada"}</Text>
        <View style={commonStyles.row}>
          <Button title="Adicionar banca" icon="plus" onPress={() => navigate({ resource: "stalls", mode: "create", marketId: market.id })} />
          <Button title="Editar mercado" icon="pencil-outline" variant="secondary" onPress={() => navigate({ resource: "markets", mode: "edit", id: market.id })} />
        </View>
        <Card>
          <View style={styles.titleRow}><Icon name="store-marker-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Bancas ({market?.stalls?.length || 0})</Text></View>
          {(market?.stalls || []).map((stall) => (
            <View key={stall.id} style={styles.listRow}>
              <Text style={commonStyles.body}>{stall.code}</Text>
              <Text style={commonStyles.mutedText}>{stall.product || stall.merchant || (stall.occupied ? "Ocupada" : "Livre")}</Text>
            </View>
          ))}
          {!market?.stalls?.length && <Text style={commonStyles.mutedText}>Ainda não existem bancas neste mercado.</Text>}
        </Card>
        {error ? <Notice>{error}</Notice> : null}
      </View>
    );
  }

  if (resourceKey === "stalls") {
    return (
      <StallForm
        marketId={route.marketId}
        markets={markets}
        navigate={navigate}
      />
    );
  }

  if (resourceKey === "tickets") {
    const text = search.trim().toLowerCase();
    const filtered = items.filter((item) =>
      (!text || [item.numero, item.comerciante, item.nuit].some((value) =>
        String(value || "").toLowerCase().includes(text)
      )) &&
      (!marketFilter || item.mercado === marketFilter)
    );
    const today = new Date().toISOString().slice(0, 10);
    const receivedToday = items
      .filter((item) => item.dataEmissao?.slice(0, 10) === today)
      .reduce((sum, item) => sum + Number(item.valor || 0), 0);
    return (
      <View style={commonStyles.page}>
        <Heading
          title="Recibos"
          icon={config.icon}
          subtitle={`${items.length} recibo(s) emitido(s).`}
          action={<Button title="Registar" icon="plus" compact onPress={() => navigate({ key: "payments", mode: "new" })} />}
        />
        <Card>
          <View style={styles.titleRow}><Icon name="cash-check" size={19} color={colors.success} /><Text style={commonStyles.mutedText}>Recebido hoje</Text></View>
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>{money(receivedToday)}</Text>
        </Card>
        <Field label="Pesquisar referência, comerciante ou NUIT" value={search} onChangeText={setSearch} placeholder="Pesquisar…" icon="magnify" />
        <Field
          label="Mercado"
          value={marketFilter}
          onChangeText={setMarketFilter}
          options={[
            { value: "", label: "Todos os mercados" },
            ...markets.map((market) => ({ value: market.name, label: market.name })),
          ]}
        />
        {error ? <Notice>{error}</Notice> : null}
        {filtered.map((item, index) => (
          <Card key={`${item.id}-${index}`}>
            <Text style={commonStyles.sectionTitle}>{item.numero || `Recibo ${item.id}`}</Text>
            <Text style={commonStyles.body}>{item.comerciante} · {item.mercado} · {item.banca}</Text>
            <Text style={commonStyles.mutedText}>{item.tipoTaxa} · {money(item.valor)}</Text>
            <Text style={commonStyles.mutedText}>{item.estado} · {item.metodoPagamento || "—"}</Text>
            <Button
              title="Imprimir recibo"
              icon="printer-outline"
              compact
              variant="secondary"
              onPress={() => printTicket(item)}
            />
          </Card>
        ))}
        {!filtered.length && <Empty label="Nenhum recibo encontrado." />}
      </View>
    );
  }

  const searchText = search.trim().toLowerCase();
  const filteredItems = items.filter((item) =>
    (!searchText || JSON.stringify(item).toLowerCase().includes(searchText)) &&
    (!marketFilter || String(item.marketId) === marketFilter)
  );

  return (
    <View style={commonStyles.page}>
      <Heading
        title={config.title}
        icon={config.icon}
        subtitle={`${filteredItems.length} de ${items.length} registo(s).`}
        action={<Button title="Novo" icon="plus" compact onPress={() => navigate({ resource: resourceKey, mode: "create" })} />}
      />
      {error ? <Notice>{error}</Notice> : null}
      <Field label={`Pesquisar ${config.title.toLowerCase()}`} value={search} onChangeText={setSearch} placeholder="Pesquisar…" icon="magnify" />
      {["merchants", "rates", "fiscals", "users"].includes(resourceKey) ? (
        <Field
          label="Mercado"
          value={marketFilter}
          onChangeText={setMarketFilter}
          options={[
            { value: "", label: "Todos os mercados" },
            ...markets.map((market) => ({ value: market.id, label: market.name })),
          ]}
        />
      ) : null}
      {filteredItems.map((item) => (
        <Card key={item.id}>
          <Text style={commonStyles.sectionTitle}>{config.heading(item)}</Text>
          {config.lines(item).filter(Boolean).map((line, index) => (
            <Text key={index} style={index === 0 ? commonStyles.body : commonStyles.mutedText}>{line}</Text>
          ))}
          <View style={commonStyles.row}>
            {resourceKey !== "users" ? <Button title="Editar" icon="pencil-outline" compact variant="secondary" onPress={() => navigate({ resource: resourceKey, mode: "edit", id: item.id })} /> : null}
            {resourceKey === "users" ? <Button title="Eliminar" icon="delete-outline" compact variant="danger" onPress={() => deleteUser(item)} /> : null}
            {["merchants", "rates", "fiscals"].includes(resourceKey) ? (
              <Button
                title={statusAction(resourceKey, item)}
                icon={resourceKey === "rates" ? (item.active ? "pause-circle-outline" : "play-circle-outline") : resourceKey === "merchants" ? (item.status === "Bloqueado" ? "lock-open-outline" : "lock-outline") : (item.status === "Inactivo" ? "account-check-outline" : "account-cancel-outline")}
                compact
                variant={item.active === false || item.status === "Bloqueado" || item.status === "Inactivo" ? "primary" : "danger"}
                onPress={() => toggleStatus(item)}
              />
            ) : null}
            {resourceKey === "markets" ? (
              <Button title="Bancas" icon="store-marker-outline" compact variant="secondary" onPress={() => navigate({ resource: "markets", mode: "detail", id: item.id })} />
            ) : null}
          </View>
        </Card>
      ))}
      {!filteredItems.length && <Empty label={`Nenhum registo de ${config.title.toLowerCase()} encontrado.`} />}
    </View>
  );
}

function statusAction(key, item) {
  if (key === "merchants") return item.status === "Bloqueado" ? "Desbloquear" : "Bloquear";
  if (key === "rates") return item.active ? "Suspender" : "Activar";
  return item.status === "Inactivo" ? "Activar" : "Desactivar";
}

function Heading({ title, subtitle, action, icon }) {
  return (
    <View style={[commonStyles.row, { justifyContent: "space-between" }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Icon name={icon || "clipboard-list-outline"} size={24} color={colors.primary} />
          <Text style={commonStyles.title}>{title}</Text>
        </View>
        <Text style={commonStyles.subtitle}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

function Empty({ label }) {
  return <Card><Text style={commonStyles.mutedText}>{label}</Text></Card>;
}

const styles = {
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
};

const fieldIcons = {
  name: "account-outline",
  nuit: "card-account-details-outline",
  phone: "phone-outline",
  email: "email-outline",
  password: "lock-outline",
  marketId: "store-outline",
  stallId: "store-marker-outline",
  product: "food-apple-outline",
  location: "map-marker-outline",
  manager: "account-tie-outline",
  periodicity: "calendar-sync-outline",
  amount: "cash",
  description: "text-box-outline",
  active: "check-circle-outline",
  zone: "map-marker-radius-outline",
  shift: "clock-outline",
  code: "tag-outline",
};

async function printTicket(ticket) {
  try {
    const { printAsync } = await import("expo-print");
    const escape = (value) => String(value || "—").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
    const html = `<html><body style="font-family:Arial,sans-serif;padding:32px;color:#172A25"><h1>Cobrança Beira</h1><h2>Recibo de pagamento</h2><p><strong>Referência:</strong> ${escape(ticket.numero)}</p><p><strong>Comerciante:</strong> ${escape(ticket.comerciante)}</p><p><strong>NUIT:</strong> ${escape(ticket.nuit)}</p><p><strong>Mercado / banca:</strong> ${escape(ticket.mercado)} · ${escape(ticket.banca)}</p><p><strong>Período:</strong> ${escape(ticket.periodoInicio)} — ${escape(ticket.periodoFim)}</p><p><strong>Taxa:</strong> ${escape(ticket.tipoTaxa)}</p><p><strong>Método:</strong> ${escape(ticket.metodoPagamento)}</p><p><strong>Data:</strong> ${escape(ticket.dataEmissao)}</p><p><strong>Valor:</strong> ${escape(money(ticket.valor))}</p><hr/><small>Documento emitido pelo sistema de Cobrança de Mercados.</small></body></html>`;
    await printAsync({ html });
  } catch (error) {
    Alert.alert("Não foi possível imprimir o recibo", error.message);
  }
}

function StallForm({ marketId, markets, navigate }) {
  const [form, setForm] = useState({ marketId: String(marketId || ""), code: "", product: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const options = markets.filter((market) => market.active).map((market) => ({ value: market.id, label: market.name }));

  async function save() {
    setError("");
    setSaving(true);
    try {
      await apiPost("/admin/stalls", {
        marketId: Number(form.marketId),
        code: form.code.trim(),
        product: form.product.trim(),
      });
      navigate({ resource: "markets", mode: "detail", id: Number(form.marketId), replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={commonStyles.page}>
      <Text style={commonStyles.title}>Nova banca</Text>
      <Card>
        <Field label="Mercado" icon={fieldIcons.marketId} value={form.marketId} onChangeText={(value) => setForm((current) => ({ ...current, marketId: value }))} options={options} />
        <Field label="Código da banca" icon={fieldIcons.code} value={form.code} onChangeText={(value) => setForm((current) => ({ ...current, code: value }))} />
        <Field label="Produto" icon={fieldIcons.product} value={form.product} onChangeText={(value) => setForm((current) => ({ ...current, product: value }))} options={products.map(option)} />
        {error ? <Notice>{error}</Notice> : null}
        <Button title={saving ? "A guardar…" : "Guardar banca"} icon="content-save-outline" onPress={save} disabled={saving} />
        <Button title="Cancelar" icon="close" variant="secondary" onPress={() => navigate({ resource: "markets", mode: "detail", id: Number(form.marketId), replace: true })} />
      </Card>
    </View>
  );
}
