import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { api, apiPost, apiPut } from "../api";
import { Button, Card, Field, Icon, Loading, Notice, colors, commonStyles } from "../components";

const methods = [{ value: "Numerário", label: "Numerário" }];
const money = (value) =>
  `${Number(value || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;

export default function PaymentsScreen({ user, mode, navigate, onUserUpdate }) {
  const [payments, setPayments] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [rates, setRates] = useState([]);
  const [merchantId, setMerchantId] = useState("");
  const [marketId, setMarketId] = useState(String(user?.marketId || ""));
  const [stallId, setStallId] = useState(String(user?.stallId || ""));
  const [product, setProduct] = useState(user?.product || "");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const admin = user?.role === "ADMIN";
  const creating = mode === "new";
  const selectedMerchant = merchants.find((item) => String(item.id) === merchantId);
  const selectedMarket = markets.find((item) => String(item.id) === marketId);
  const productOptions = [...new Set(rates.map((item) => item.product))].map((value) => ({ value, label: value }));
  const freeStalls = selectedMarket?.stalls?.filter((stall) =>
    !stall.occupied || String(stall.id) === stallId
  ) || [];

  useEffect(() => {
    let active = true;
    const request = creating
      ? admin
        ? api("/admin/merchants")
        : Promise.all([api("/catalog/markets"), marketId ? api(`/catalog/rates?marketId=${encodeURIComponent(marketId)}`) : Promise.resolve([])])
      : admin
        ? Promise.all([api("/payments"), api("/admin/markets")])
        : api("/payments");

    request
      .then((result) => {
        if (!active) return;
        if (creating && admin) setMerchants(result.filter((item) => item.status !== "Bloqueado"));
        else if (creating) {
          setMarkets(result[0]);
          setRates(result[1]);
        } else if (admin) {
          setPayments(result[0]);
          setMarkets(result[1]);
        } else {
          setPayments(result);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, creating, marketId]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return payments.filter((item) => {
      const date = item.paidAt?.slice(0, 10) || "";
      return (!text ||
        [item.paymentReference, item.transactionReference, item.merchant, item.market, item.stall]
          .some((value) => String(value || "").toLowerCase().includes(text))
      ) &&
        (!marketFilter || String(item.marketId) === marketFilter) &&
        (!from || date >= from) &&
        (!to || date <= to);
    });
  }, [from, marketFilter, payments, search, to]);
  const total = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  async function changeMarket(value) {
    setMarketId(value);
    setStallId("");
    setProduct("");
    setRates([]);
    if (!value) return;
    try {
      setRates(await api(`/catalog/rates?marketId=${encodeURIComponent(value)}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveProfile() {
    setError("");
    setSaving(true);
    try {
      const updated = await apiPut("/auth/profile", {
        marketId: Number(marketId),
        stallId: Number(stallId),
        product,
      });
      onUserUpdate(updated);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPayment() {
    setError("");
    setSaving(true);
    try {
      const result = admin
        ? await apiPost("/admin/payments", { merchantId: Number(merchantId), method })
        : await apiPost("/payments", { method });
      setPayment(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={creating ? "A preparar pagamento…" : "A carregar pagamentos…"} />;

  if (creating && !admin && (!user?.marketId || !user?.stallId || !user?.product)) {
    return (
      <View style={commonStyles.page}>
        <Text style={commonStyles.title}>Associar o seu negócio</Text>
        <Text style={commonStyles.subtitle}>Estes dados serão usados nos pagamentos e ficam guardados no seu perfil.</Text>
        <Card>
          <Field label="Mercado" value={marketId} onChangeText={changeMarket} options={markets.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }))} />
          <Field label="Banca" value={stallId} onChangeText={setStallId} options={freeStalls.map((item) => ({ value: item.id, label: item.code }))} editable={Boolean(marketId)} />
          <Field label="Produto comercializado" value={product} onChangeText={setProduct} options={productOptions} editable={Boolean(marketId)} />
          {error ? <Notice>{error}</Notice> : null}
          <Button title={saving ? "A guardar…" : "Guardar perfil"} onPress={saveProfile} disabled={saving || !marketId || !stallId || !product} />
        </Card>
      </View>
    );
  }

  if (payment) {
    return (
      <View style={commonStyles.page}>
        <View style={styles.successHeading}>
          <View style={styles.successIcon}><Icon name="check-bold" size={23} color="#FFFFFF" /></View>
          <Text style={commonStyles.title}>Pagamento confirmado</Text>
        </View>
        <Text style={commonStyles.subtitle}>O pagamento foi gravado e o recibo emitido.</Text>
        <Receipt payment={payment} />
        <Button title="Imprimir recibo" icon="printer-outline" variant="secondary" onPress={() => printReceipt(payment)} />
        <Button title="Partilhar recibo PDF" icon="share-variant-outline" variant="secondary" onPress={() => shareReceipt(payment)} />
        <Button title="Ver pagamentos" icon="format-list-bulleted" onPress={() => { setPayment(null); navigate("list"); }} />
      </View>
    );
  }

  if (creating) {
    const rate = selectedMerchant?.amount != null
      ? `${selectedMerchant.periodicity} · ${money(selectedMerchant.amount)}`
      : "Sem taxa activa";
    return (
      <View style={commonStyles.page}>
        <Text style={commonStyles.title}>Registar pagamento</Text>
        <Text style={commonStyles.subtitle}>O valor e o período são calculados pela API com base na taxa activa.</Text>
        <Card>
          {admin ? (
            <>
              <Field
                label="Comerciante"
                value={merchantId}
                onChangeText={setMerchantId}
                options={merchants.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.stall} · ${item.market}`,
                }))}
              />
              {selectedMerchant ? (
                <View style={styles.info}>
                  <Text style={commonStyles.body}>{selectedMerchant.market} · Banca {selectedMerchant.stall}</Text>
                  <Text style={commonStyles.mutedText}>{selectedMerchant.product} · {rate}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={commonStyles.body}>{user?.name}</Text>
              <Text style={commonStyles.mutedText}>{user?.market} · Banca {user?.stall} · {user?.product}</Text>
            </>
          )}
          <Field label="Método de pagamento" value={method} onChangeText={setMethod} options={methods} />
          {error ? <Notice>{error}</Notice> : null}
          <Button
            title={saving ? "A registar…" : "Confirmar pagamento"}
            onPress={submitPayment}
            disabled={saving || !method || admin && !merchantId}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => navigate("list")} />
        </Card>
      </View>
    );
  }

  return (
    <View style={commonStyles.page}>
      <View style={[commonStyles.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1 }}>
          <Text style={commonStyles.title}>Pagamentos</Text>
          <Text style={commonStyles.subtitle}>{admin ? "Pagamentos confirmados em todos os mercados." : "Histórico dos seus pagamentos."}</Text>
        </View>
        <Button title="Registar" icon="plus" compact onPress={() => navigate("new")} />
      </View>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Text style={commonStyles.mutedText}>Total recebido</Text>
        <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>{money(total)}</Text>
        <Text style={commonStyles.mutedText}>{payments.length} pagamento(s) confirmado(s).</Text>
      </Card>
      <Field label="Pesquisar referência, comerciante ou banca" value={search} onChangeText={setSearch} placeholder="Pesquisar…" icon="magnify" />
      {admin ? (
        <Field
          label="Mercado"
          value={marketFilter}
          onChangeText={setMarketFilter}
          options={[
            { value: "", label: "Todos os mercados" },
            ...markets.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
      ) : null}
      <Field label="A partir de (AAAA-MM-DD)" value={from} onChangeText={setFrom} placeholder="Opcional" />
      <Field label="Até (AAAA-MM-DD)" value={to} onChangeText={setTo} placeholder="Opcional" />
      {filtered.map((item) => (
        <Card key={item.id}>
          <Text style={commonStyles.sectionTitle}>{item.paymentReference}</Text>
          <Text style={commonStyles.body}>{item.merchant} · {item.market} · {item.stall}</Text>
          <Text style={commonStyles.mutedText}>{item.product} · {item.periodicity} · {item.method}</Text>
          <Text style={commonStyles.mutedText}>{new Date(item.paidAt).toLocaleString("pt-MZ")}</Text>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>{money(item.amount)}</Text>
          <Button title="Ver / imprimir recibo" icon="receipt-text-outline" compact variant="secondary" onPress={() => setPayment(item)} />
        </Card>
      ))}
      {!filtered.length && <Card><Text style={commonStyles.mutedText}>Nenhum pagamento encontrado.</Text></Card>}
    </View>
  );
}

function Receipt({ payment }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="receipt-text-check-outline" size={20} color={colors.primary} />
        <Text style={commonStyles.sectionTitle}>Recibo de pagamento</Text>
      </View>
      <ReceiptRow label="Referência" value={payment.paymentReference} />
      <ReceiptRow label="Transacção" value={payment.transactionReference} />
      <ReceiptRow label="Comerciante" value={payment.merchant} />
      <ReceiptRow label="Mercado / banca" value={`${payment.market} · ${payment.stall}`} />
      <ReceiptRow label="Taxa / período" value={`${payment.product} · ${payment.periodicity}`} />
      <ReceiptRow label="Método" value={payment.method} />
      <ReceiptRow label="Data" value={new Date(payment.paidAt).toLocaleString("pt-MZ")} />
      <ReceiptRow label="Valor pago" value={money(payment.amount)} />
    </Card>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
      <Text style={commonStyles.mutedText}>{label}</Text>
      <Text style={commonStyles.body}>{value || "—"}</Text>
    </View>
  );
}

async function printReceipt(payment) {
  try {
    await Print.printAsync({ html: receiptHtml(payment) });
  } catch (error) {
    Alert.alert("Não foi possível imprimir o recibo", error.message);
  }
}

async function shareReceipt(payment) {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Partilha indisponível", "Este dispositivo não permite partilhar ficheiros.");
      return;
    }
    const file = await Print.printToFileAsync({ html: receiptHtml(payment) });
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Partilhar recibo" });
  } catch (error) {
    Alert.alert("Não foi possível partilhar o recibo", error.message);
  }
}

function receiptHtml(payment) {
  const rows = [
    ["Referência", payment.paymentReference],
    ["Transacção", payment.transactionReference],
    ["Comerciante", payment.merchant],
    ["Telefone", payment.phone],
    ["Mercado / banca", `${payment.market} · ${payment.stall}`],
    ["Produto / taxa", payment.product],
    ["Período", `${payment.periodicity} · ${payment.periodStart} — ${payment.periodEnd}`],
    ["Método", payment.method],
    ["Data", new Date(payment.paidAt).toLocaleString("pt-MZ")],
    ["Valor pago", money(payment.amount)],
  ];
  const escape = (value) => String(value || "—").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  return `<html><body style="font-family:Arial,sans-serif;padding:32px;color:#172A25"><h1>Cobrança Beira</h1><h2>Recibo de pagamento</h2>${rows.map(([key, value]) => `<p><strong>${escape(key)}:</strong> ${escape(value)}</p>`).join("")}<hr/><small>Documento emitido pelo sistema de Cobrança de Mercados.</small></body></html>`;
}

const styles = {
  info: { backgroundColor: "#F4F7F6", borderRadius: 10, padding: 12, gap: 4 },
  successHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  successIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
};
