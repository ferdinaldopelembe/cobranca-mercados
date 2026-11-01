import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../api";
import { Card, Field, Icon, Loading, Notice, colors, commonStyles } from "../components";

const isoDate = (date) => date.toISOString().slice(0, 10);
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;

export default function DashboardScreen() {
  const [markets, setMarkets] = useState([]);
  const [marketId, setMarketId] = useState("");
  const [period, setPeriod] = useState("7");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - Number(period) + 1);
      const params = new URLSearchParams({ from: isoDate(start), to: isoDate(end) });
      if (marketId) params.set("marketId", marketId);
      const result = await api(`/admin/dashboard?${params.toString()}`);
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [marketId, period]);

  useEffect(() => {
    let active = true;
    api("/admin/markets")
      .then((items) => { if (active) setMarkets(items); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => { active = false; };
  }, [load]);

  const marketOptions = [
    { value: "", label: "Todos os mercados" },
    ...markets.map((market) => ({ value: market.id, label: market.name })),
  ];

  if (loading && !data) return <Loading label="A carregar dashboard…" />;

  return (
    <View style={commonStyles.page}>
      <View style={{ gap: 4 }}>
        <Text style={commonStyles.title}>Dashboard</Text>
        <Text style={commonStyles.subtitle}>Resumo dos pagamentos persistidos.</Text>
      </View>
      {error ? <Notice>{error}</Notice> : null}
      <Field label="Mercado" value={marketId} onChangeText={setMarketId} options={marketOptions} />
      <Field
        label="Período"
        value={period}
        onChangeText={setPeriod}
        options={[
          { value: "1", label: "Hoje" },
          { value: "7", label: "Últimos 7 dias" },
          { value: "30", label: "Últimos 30 dias" },
        ]}
      />
      <View style={{ gap: 10 }}>
        <Metric icon="cash-multiple" label="Receita total" value={formatMoney(data?.revenue)} />
        <Metric icon="receipt-text-check-outline" label="Pagamentos confirmados" value={Number(data?.transactions || 0).toLocaleString("pt-MZ")} />
        <Metric icon="account-group-outline" label="Comerciantes pagantes" value={Number(data?.merchants || 0).toLocaleString("pt-MZ")} />
        <Metric icon="chart-line" label="Média por pagamento" value={formatMoney(data?.average)} />
      </View>
      <Card>
        <View style={styles.sectionHeading}><Icon name="store-outline" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Receita por mercado</Text></View>
        {(data?.markets || []).length ? data.markets.map((market) => (
          <View key={market.marketId} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.body}>{market.market}</Text>
              <Text style={commonStyles.mutedText}>{market.transactions} pagamento(s)</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(market.revenue)}</Text>
          </View>
        )) : <Text style={commonStyles.mutedText}>Sem pagamentos no período seleccionado.</Text>}
      </Card>
      <Card>
        <View style={styles.sectionHeading}><Icon name="history" size={20} color={colors.primary} /><Text style={commonStyles.sectionTitle}>Pagamentos recentes</Text></View>
        {(data?.recentPayments || []).slice(0, 6).map((payment) => (
          <View key={payment.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.body}>{payment.merchant}</Text>
              <Text style={commonStyles.mutedText}>{payment.market} · {payment.paymentReference}</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>
          </View>
        ))}
        {!data?.recentPayments?.length && <Text style={commonStyles.mutedText}>Ainda não existem pagamentos recentes.</Text>}
      </Card>
    </View>
  );
}

function Metric({ label, value, icon }) {
  return (
    <Card style={{ paddingVertical: 13 }}>
      <View style={styles.metricHeader}>
        <Text style={[commonStyles.mutedText, { flex: 1 }]}>{label}</Text>
        <View style={styles.metricIcon}><Icon name={icon} size={19} color={colors.primary} /></View>
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{value}</Text>
    </Card>
  );
}

const styles = {
  metricHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#E8F2ED", alignItems: "center", justifyContent: "center" },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  listRow: {
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
