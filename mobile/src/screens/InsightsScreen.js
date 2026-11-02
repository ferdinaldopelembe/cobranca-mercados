import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { api, apiPatch, apiPost, apiPut } from "../api";
import { Button, Card, Field, Icon, Loading, Notice, colors, commonStyles } from "../components";
import { shareFile as shareLocalFile } from "../utils/shareFile";

const money = (value) =>
  `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;

export default function InsightsScreen({ screen, navigate }) {
  if (screen === "reports") return <ReportsScreen />;
  if (screen === "audit") return <AuditScreen />;
  if (screen === "notifications") return <NotificationsScreen />;
  return <SettingsScreen />;
}

function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await api("/notifications"));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function markRead(item) {
    setError("");
    try {
      const updated = await apiPatch(`/notifications/${item.id}/read`, {});
      setItems((current) => current.map((notification) => notification.id === updated.id ? updated : notification));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <Loading label="A carregar notificações…" />;
  return (
    <View style={commonStyles.page}>
      <Text style={commonStyles.title}>Notificações</Text>
      <Text style={commonStyles.subtitle}>Avisos internos do sistema, guardados na sua conta.</Text>
      {error ? <Notice>{error}</Notice> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={commonStyles.sectionTitle}>{item.title}</Text>
          <Text style={commonStyles.body}>{item.message}</Text>
          <Text style={commonStyles.mutedText}>{new Date(item.createdAt).toLocaleString("pt-MZ")}</Text>
          {!item.readAt ? <Button title="Marcar como lida" icon="check" compact variant="secondary" onPress={() => markRead(item)} /> : <Text style={commonStyles.mutedText}>Lida</Text>}
        </Card>
      ))}
      {!items.length ? <Card><Text style={commonStyles.mutedText}>Sem notificações.</Text></Card> : null}
    </View>
  );
}

function ReportsScreen() {
  const [markets, setMarkets] = useState([]);
  const [marketId, setMarketId] = useState("");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(dateDaysAgo(0));
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    if (from && to && from > to) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (marketId) params.set("marketId", marketId);
      setReport(await api(`/admin/reports?${params.toString()}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [from, marketId, to]);

  useEffect(() => {
    let active = true;
    api("/admin/markets")
      .then((items) => { if (active) setMarkets(items); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function exportCsv() {
    if (!report?.payments?.length) return;
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Referência", "Transacção", "Data", "Comerciante", "Mercado", "Banca", "Produto", "Período", "Método", "Valor (MT)"],
      ...report.payments.map((payment) => [
        payment.paymentReference,
        payment.transactionReference,
        payment.paidAt,
        payment.merchant,
        payment.market,
        payment.stall,
        payment.product,
        `${payment.periodStart} - ${payment.periodEnd}`,
        payment.method,
        Number(payment.amount).toFixed(2),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(";")).join("\r\n")}`;
    try {
      const uri = `${FileSystem.cacheDirectory}pagamentos_${from}_${to}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await shareFile(uri, "text/csv", "Partilhar relatório CSV");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function exportPdf() {
    if (!report?.payments?.length) return;
    try {
      const rows = report.payments.map((payment) =>
        `<tr><td>${escapeHtml(payment.paymentReference)}</td><td>${escapeHtml(new Date(payment.paidAt).toLocaleDateString("pt-MZ"))}</td><td>${escapeHtml(payment.merchant)}</td><td>${escapeHtml(payment.market)}</td><td>${escapeHtml(money(payment.amount))}</td></tr>`
      ).join("");
      const html = `<html><body style="font-family:Arial,sans-serif;padding:24px;color:#172A25"><h1>Cobrança Beira</h1><h2>Relatório de pagamentos</h2><p>Período: ${escapeHtml(from)} a ${escapeHtml(to)} · Mercado: ${escapeHtml(markets.find((item) => String(item.id) === marketId)?.name || "Todos")}</p><p>Receita total: ${escapeHtml(money(report.revenue))} · Pagamentos: ${report.transactions} · Comerciantes: ${report.merchants}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th>Referência</th><th>Data</th><th>Comerciante</th><th>Mercado</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table><hr/><small>Cobrança Beira · Relatório gerado a partir dos pagamentos registados</small></body></html>`;
      const file = await Print.printToFileAsync({ html });
      await shareFile(file.uri, "application/pdf", "Partilhar relatório PDF");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function shareFile(uri, mimeType, dialogTitle) {
    await shareLocalFile(uri, mimeType, dialogTitle);
  }

  return (
    <View style={commonStyles.page}>
      <View style={styles.heading}><Icon name="chart-box-outline" size={25} color={colors.primary} /><Text style={commonStyles.title}>Relatórios</Text></View>
      <Text style={commonStyles.subtitle}>Pagamentos e receita por período e mercado.</Text>
      <Card>
        <Field label="Data inicial (AAAA-MM-DD)" value={from} onChangeText={setFrom} placeholder="2026-01-01" icon="calendar-start" />
        <Field label="Data final (AAAA-MM-DD)" value={to} onChangeText={setTo} placeholder="2026-01-31" icon="calendar-end" />
        <Field
          label="Mercado"
          value={marketId}
          onChangeText={setMarketId}
          icon="store-outline"
          options={[
            { value: "", label: "Todos os mercados" },
            ...markets.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Button title={loading ? "A carregar…" : "Actualizar relatório"} icon="refresh" onPress={load} disabled={loading} />
        <View style={commonStyles.row}>
          <View style={{ flex: 1 }}><Button title="CSV" icon="file-delimited-outline" variant="secondary" onPress={exportCsv} disabled={!report?.payments?.length} /></View>
          <View style={{ flex: 1 }}><Button title="PDF" icon="file-pdf-box" variant="secondary" onPress={exportPdf} disabled={!report?.payments?.length} /></View>
        </View>
      </Card>
      {error ? <Notice>{error}</Notice> : null}
      {report ? (
        <>
          <Card>
            <Metric label="Receita total" value={money(report.revenue)} />
            <Metric label="Pagamentos" value={report.transactions} />
            <Metric label="Comerciantes pagantes" value={report.merchants} />
          </Card>
          <Card>
            <View style={styles.heading}><Icon name="store-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Receita por mercado</Text></View>
            {(report.markets || []).map((item) => (
              <View key={item.marketId} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.body}>{item.market}</Text>
                  <Text style={commonStyles.mutedText}>{item.transactions} pagamento(s)</Text>
                </View>
                <Text style={styles.amount}>{money(item.revenue)}</Text>
              </View>
            ))}
            {!report.markets?.length ? <Text style={commonStyles.mutedText}>Sem dados no período.</Text> : null}
          </Card>
          <Card>
            <View style={styles.heading}><Icon name="receipt-text-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Pagamentos</Text></View>
            {(report.payments || []).slice(0, 100).map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.body}>{item.merchant} · {item.market}</Text>
                  <Text style={commonStyles.mutedText}>{item.paymentReference} · {new Date(item.paidAt).toLocaleDateString("pt-MZ")}</Text>
                </View>
                <Text style={styles.amount}>{money(item.amount)}</Text>
              </View>
            ))}
            {!report.payments?.length ? <Text style={commonStyles.mutedText}>Sem pagamentos no período.</Text> : null}
          </Card>
        </>
      ) : null}
    </View>
  );
}

function AuditScreen() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api("/admin/audit")
      .then((items) => { if (active) setEvents(items); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <Loading label="A carregar auditoria…" />;
  return (
    <View style={commonStyles.page}>
      <View style={styles.heading}><Icon name="history" size={25} color={colors.primary} /><Text style={commonStyles.title}>Auditoria</Text></View>
      <Text style={commonStyles.subtitle}>{events.length} evento(s) registado(s).</Text>
      {error ? <Notice>{error}</Notice> : null}
      {events.map((event) => (
        <Card key={event.id}>
          <View style={styles.heading}><Icon name="clipboard-text-clock-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>{event.accao} · {event.entidade}</Text></View>
          <Text style={commonStyles.body}>{event.descricao}</Text>
          <Text style={commonStyles.mutedText}>{event.utilizador} · {event.perfil}</Text>
          <Text style={commonStyles.mutedText}>{new Date(event.data).toLocaleString("pt-MZ")} · {event.ip}</Text>
        </Card>
      ))}
      {!events.length && <Card><Text style={commonStyles.mutedText}>Ainda não existem eventos de auditoria.</Text></Card>}
    </View>
  );
}

function SettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setSettings(await api("/admin/settings"));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  function update(section, key, value, originalValue) {
    let converted = value;
    if (typeof originalValue === "boolean") converted = value === "true";
    if (typeof originalValue === "number") converted = Number(value);
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: converted },
    }));
    setNotice("");
  }

  async function save() {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      setSettings(await apiPut("/admin/settings", settings));
      setNotice("Configurações guardadas.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    Alert.alert(
      "Restaurar predefinições",
      "As configurações actuais serão substituídas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            setError("");
            try {
              setSettings(await apiPost("/admin/settings/reset", {}));
              setNotice("Predefinições restauradas.");
            } catch (requestError) {
              setError(requestError.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (!settings) {
    return <View style={commonStyles.page}>{error ? <Notice>{error}</Notice> : <Loading label="A carregar configurações…" />}</View>;
  }

  return (
    <View style={commonStyles.page}>
      <View style={styles.heading}><Icon name="cog-outline" size={25} color={colors.primary} /><Text style={commonStyles.title}>Configurações</Text></View>
      <Text style={commonStyles.subtitle}>Identidade e preferências institucionais.</Text>
      {Object.entries(settings).map(([section, values]) => (
        <Card key={section}>
          <View style={styles.heading}><Icon name={sectionIcons[section] || "tune-variant"} size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>{sectionLabels[section] || section}</Text></View>
          {Object.entries(values || {}).map(([key, value]) => {
            const options = typeof value === "boolean"
              ? [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }]
              : key === "idioma"
                ? [{ value: "Português", label: "Português" }, { value: "English", label: "English" }]
                : key === "moeda"
                  ? [{ value: "MZN", label: "Metical (MZN)" }]
                  : key === "fusoHorario"
                    ? [{ value: "Africa/Maputo", label: "Africa/Maputo" }, { value: "UTC", label: "UTC" }]
                    : null;
            return (
              <Field
                key={`${section}-${key}`}
                label={fieldLabels[key] || humanize(key)}
                icon={settingFieldIcons[key]}
                value={options ? String(value) : value == null ? "" : String(value)}
                onChangeText={(next) => update(section, key, next, value)}
                options={options}
                keyboardType={typeof value === "number" ? "numeric" : undefined}
              />
            );
          })}
        </Card>
      ))}
      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <Button title={saving ? "A guardar…" : "Guardar alterações"} icon="content-save-outline" onPress={save} disabled={saving} />
      <Button title="Restaurar predefinições" icon="restore" variant="secondary" onPress={reset} disabled={saving} />
      <Card>
        <View style={styles.heading}><Icon name="shield-check-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Regras da API</Text></View>
        <Text style={commonStyles.mutedText}>Os perfis e pagamentos são validados no servidor. As sessões expiram após 30 minutos de inactividade.</Text>
        <Text style={commonStyles.mutedText}>Não exponha a API a redes públicas sem HTTPS.</Text>
      </Card>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 }}>
      <Text style={commonStyles.mutedText}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function firstDayOfMonth() {
  const date = new Date();
  date.setDate(1);
  return localIso(date);
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localIso(date);
}

function localIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value || "—").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function humanize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

const sectionLabels = {
  geral: "Identidade institucional",
  cobranca: "Regras de cobrança",
  notificacoes: "Notificações",
  seguranca: "Segurança",
};

const fieldLabels = {
  nomeSistema: "Nome do sistema",
  municipio: "Município",
  provincia: "Província",
  moeda: "Moeda",
  idioma: "Idioma",
  fusoHorario: "Fuso horário",
  nomeResponsavel: "Responsável",
  emailContacto: "E-mail de contacto",
};

const settingFieldIcons = {
  nomeSistema: "application-cog-outline",
  municipio: "city-variant-outline",
  provincia: "map-outline",
  moeda: "cash",
  idioma: "translate",
  fusoHorario: "clock-time-four-outline",
  nomeResponsavel: "account-tie-outline",
  emailContacto: "email-outline",
};

const sectionIcons = {
  geral: "office-building-outline",
  cobranca: "cash-cog",
  notificacoes: "bell-outline",
  seguranca: "shield-lock-outline",
};

const styles = {
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    gap: 10,
  },
  amount: { color: colors.primary, fontWeight: "700", fontSize: 13 },
};
