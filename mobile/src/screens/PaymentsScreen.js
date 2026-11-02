import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import * as Print from "expo-print";
import QRCode from "react-native-qrcode-svg";
import { api, apiPost, apiPut } from "../api";
import { Button, Card, Field, Icon, Loading, Notice, colors, commonStyles } from "../components";
import { shareFile } from "../utils/shareFile";

const methods = [
  { value: "Numerário", label: "Numerário" },
  { value: "M-Pesa", label: "M-Pesa · simulação" },
  { value: "e-Mola", label: "e-Mola · simulação" },
  { value: "Mkesh", label: "Mkesh · simulação" },
];
const walletMethods = ["M-Pesa", "e-Mola", "Mkesh"];
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
  const [walletPhone, setWalletPhone] = useState(user?.phone || "");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payment, setPayment] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [simulationMessage, setSimulationMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const ticketQrRef = useRef(null);

  const admin = user?.role === "ADMIN";
  const fiscal = user?.role === "FISCAL";
  const financialManager = user?.role === "FINANCIAL_MANAGER";
  const creating = mode === "new";
  const usesWallet = walletMethods.includes(method);
  const availableMethods = admin ? methods.slice(0, 1) : methods;
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
      const date = (item.paidAt || item.issuedAt)?.slice(0, 10) || "";
      return (!text ||
        [item.paymentReference, item.transactionReference, item.merchant, item.market, item.stall]
          .some((value) => String(value || "").toLowerCase().includes(text))
      ) &&
        (!marketFilter || String(item.marketId) === marketFilter) &&
        (!from || date >= from) &&
        (!to || date <= to);
    });
  }, [from, marketFilter, payments, search, to]);
  const confirmedPayments = payments.filter((item) => item.status === "Pago");
  const total = confirmedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  useEffect(() => {
    if (!selectedTicket || !printRequested) return undefined;
    const timer = setTimeout(() => {
      const qrCode = ticketQrRef.current;
      if (!qrCode || typeof qrCode.toDataURL !== "function") {
        setPrintRequested(false);
        setSelectedTicket(null);
        Alert.alert("Não foi possível imprimir a senha", "Feche e volte a abrir o QR Code antes de tentar novamente.");
        return;
      }
      qrCode.toDataURL(async (base64) => {
        try {
          await Print.printAsync({ html: ticketHtml(selectedTicket, base64) });
        } catch (error) {
          Alert.alert("Não foi possível imprimir a senha", error.message);
        } finally {
          setPrintRequested(false);
          setSelectedTicket(null);
        }
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [printRequested, selectedTicket]);

  function showTicketQr(item, print = false) {
    setSelectedTicket(item);
    setPrintRequested(print);
  }

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
        : await apiPost("/payments", {
          method,
          ...(usesWallet ? { phone: walletPhone } : {}),
        });
      setPayment(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function simulateWalletOutcome(outcome) {
    setSaving(true);
    setError("");
    setSimulationMessage("");
    try {
      const result = await apiPost(
        `/payments/${payment.id}/wallet/simulation/callback`,
        { outcome }
      );
      setPayment(result);
      if (outcome === "TIMEOUT") {
        setSimulationMessage("A carteira não respondeu. A senha continua pendente até à validade indicada.");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={creating ? "A preparar pagamento…" : "A carregar pagamentos…"} />;

  if (!creating && fiscal) {
    async function searchReference() {
      setError("");
      try {
        setPayment(await api(`/payments/reference/${encodeURIComponent(search.trim())}`));
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    async function registerCash(item) {
      setSaving(true);
      setError("");
      try {
        const updated = await apiPost(`/payments/${item.id}/cash`, {});
        setPayments((current) => current.map((paymentItem) => paymentItem.id === updated.id ? updated : paymentItem));
        setPayment(updated);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <View style={commonStyles.page}>
        <Text style={commonStyles.title}>Validar senha</Text>
        <Text style={commonStyles.subtitle}>Pesquise manualmente a referência e registe o recebimento em numerário.</Text>
        <Card>
          <Field label="Referência da senha" value={search} onChangeText={setSearch} icon="magnify" />
          {error ? <Notice>{error}</Notice> : null}
          <Button title="Consultar senha" onPress={searchReference} disabled={!search.trim()} />
        </Card>
        {payment ? <TicketDetails payment={payment} onRegister={() => registerCash(payment)} saving={saving} /> : null}
        <Text style={commonStyles.sectionTitle}>Senhas do mercado</Text>
        {payments.map((item) => (
          <Card key={item.id}>
            <Text style={commonStyles.sectionTitle}>{item.paymentReference}</Text>
            <Text style={commonStyles.body}>{item.merchant} · {item.stall} · {item.product}</Text>
            <Text style={commonStyles.mutedText}>{item.periodStart} — {item.periodEnd} · {money(item.amount)}</Text>
            <Text style={commonStyles.mutedText}>Estado: {item.status}</Text>
            {item.status === "Pendente" ? <Button title={saving ? "A registar…" : "Recebi em numerário"} onPress={() => registerCash(item)} disabled={saving} /> : null}
          </Card>
        ))}
        {!payments.length ? <Card><Text style={commonStyles.mutedText}>Não existem senhas neste mercado.</Text></Card> : null}
      </View>
    );
  }

  if (!creating && financialManager) {
    async function review(item, action) {
      if (action === "reject" && !rejectionReason.trim()) {
        setError("Indique o motivo da rejeição.");
        return;
      }
      setSaving(true);
      setError("");
      try {
        const updated = await apiPost(
          `/payments/${item.id}/${action}`,
          action === "reject" ? { reason: rejectionReason.trim() } : {}
        );
        setPayments((current) => current.map((paymentItem) => paymentItem.id === updated.id ? updated : paymentItem));
        setRejectionReason("");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setSaving(false);
      }
    }
    const waiting = payments.filter((item) => item.status === "Aguardando confirmação");
    const confirmed = payments.filter((item) => item.status === "Pago");
    return (
      <View style={commonStyles.page}>
        <Text style={commonStyles.title}>Confirmação financeira</Text>
        <Text style={commonStyles.subtitle}>A receita só é contabilizada depois da sua confirmação.</Text>
        {error ? <Notice>{error}</Notice> : null}
        {waiting.map((item) => (
          <Card key={item.id}>
            <Text style={commonStyles.sectionTitle}>{item.paymentReference}</Text>
            <Text style={commonStyles.body}>{item.merchant} · {item.market} · {item.stall}</Text>
            <Text style={commonStyles.mutedText}>Fiscal: {item.cashier || "—"} · {money(item.amount)}</Text>
            <Field label="Motivo da rejeição (se aplicável)" value={rejectionReason} onChangeText={setRejectionReason} />
            <View style={commonStyles.row}>
              <Button title={saving ? "A guardar…" : "Confirmar"} onPress={() => review(item, "confirm")} disabled={saving} />
              <Button title="Rejeitar" variant="danger" onPress={() => review(item, "reject")} disabled={saving || !rejectionReason.trim()} />
            </View>
          </Card>
        ))}
        {!waiting.length ? <Card><Text style={commonStyles.mutedText}>Não existem pagamentos por confirmar.</Text></Card> : null}
        <Text style={commonStyles.sectionTitle}>Confirmados ({confirmed.length})</Text>
        {confirmed.map((item) => (
          <Card key={item.id}>
            <Text style={commonStyles.sectionTitle}>{item.paymentReference}</Text>
            <Text style={commonStyles.body}>{item.merchant} · {money(item.amount)}</Text>
            <Text style={commonStyles.mutedText}>Confirmado por {item.confirmedBy || "—"}</Text>
            <Button title="Ver / imprimir recibo" icon="receipt-text-outline" compact variant="secondary" onPress={() => setPayment(item)} />
          </Card>
        ))}
        {payment?.status === "Pago" ? (
          <View style={{ gap: 8 }}>
            <Receipt payment={payment} />
            <Button title="Imprimir recibo" icon="printer-outline" variant="secondary" onPress={() => printReceipt(payment)} />
            <Button title="Partilhar recibo PDF" icon="share-variant-outline" variant="secondary" onPress={() => shareReceipt(payment)} />
          </View>
        ) : null}
      </View>
    );
  }

  if (creating && !admin && user?.role !== "MERCHANT") {
    return <View style={commonStyles.page}><Notice>Este perfil não pode emitir senhas para comerciantes.</Notice><Button title="Voltar" onPress={() => navigate("list")} /></View>;
  }

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
          <Text style={commonStyles.title}>Senha emitida</Text>
        </View>
        <Text style={commonStyles.subtitle}>
          {walletMethods.includes(payment.method)
            ? "A carteira móvel está em modo de simulação. Nenhuma transferência real foi efectuada."
            : "O pagamento em numerário precisa de registo pelo fiscal e confirmação financeira."}
        </Text>
        {payment.status === "Pago" ? <Receipt payment={payment} /> : <TicketDetails payment={payment} />}
        {user?.role === "MERCHANT" ? (
          <>
            <Button title="Ver QR Code da senha" icon="qrcode" variant="secondary" onPress={() => showTicketQr(payment)} />
            <Button title="Imprimir senha" icon="printer-outline" variant="secondary" onPress={() => showTicketQr(payment, true)} />
          </>
        ) : null}
        <TicketQrModal
          payment={selectedTicket}
          printRequested={printRequested}
          qrRef={ticketQrRef}
          onClose={() => setSelectedTicket(null)}
          onPrint={() => setPrintRequested(true)}
        />
        {walletMethods.includes(payment.method) && payment.status === "Pendente" ? (
          <Card>
            <Text style={commonStyles.sectionTitle}>Simulação de carteira móvel</Text>
            <Text style={commonStyles.mutedText}>Não introduza PIN. Escolha um resultado demonstrativo para testar o fluxo.</Text>
            {simulationMessage ? <Notice>{simulationMessage}</Notice> : null}
            {error ? <Notice>{error}</Notice> : null}
            <Button title={saving ? "A processar…" : "Simular confirmação"} onPress={() => simulateWalletOutcome("CONFIRMED")} disabled={saving} />
            <Button title="Simular rejeição" variant="secondary" onPress={() => simulateWalletOutcome("REJECTED")} disabled={saving} />
            <Button title="Simular falta de resposta" variant="secondary" onPress={() => simulateWalletOutcome("TIMEOUT")} disabled={saving} />
          </Card>
        ) : null}
        {payment.status === "Pago" ? <Button title="Imprimir recibo" icon="printer-outline" variant="secondary" onPress={() => printReceipt(payment)} /> : null}
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
        <Text style={commonStyles.title}>Emitir senha</Text>
        <Text style={commonStyles.subtitle}>O valor e o período são calculados pela API. As carteiras móveis estão disponíveis apenas em modo de simulação.</Text>
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
          <Field label="Tipo de recebimento" value={method} onChangeText={setMethod} options={availableMethods} />
          {usesWallet ? (
            <>
              <Field
                label="Telefone da carteira móvel"
                value={walletPhone}
                onChangeText={setWalletPhone}
                placeholder="+258 84 000 0000"
                keyboardType="phone-pad"
              />
              <Notice>Simulação demonstrativa: nenhuma transferência real será efectuada. Nunca introduza o PIN da carteira.</Notice>
            </>
          ) : null}
          {error ? <Notice>{error}</Notice> : null}
          <Button
            title={saving ? "A emitir…" : "Emitir senha"}
            onPress={submitPayment}
            disabled={saving || !method || admin && !merchantId || usesWallet && !walletPhone.trim()}
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
          <Text style={commonStyles.subtitle}>{admin ? "Senhas e pagamentos de todos os mercados." : "Senhas e pagamentos da sua conta."}</Text>
        </View>
        {admin || user?.role === "MERCHANT" ? <Button title="Emitir" icon="plus" compact onPress={() => navigate("new")} /> : null}
      </View>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Text style={commonStyles.mutedText}>Total recebido</Text>
        <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>{money(total)}</Text>
        <Text style={commonStyles.mutedText}>{confirmedPayments.length} pagamento(s) confirmado(s) · {payments.length} senha(s).</Text>
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
          <Text style={commonStyles.mutedText}>{item.status === "Pago" ? new Date(item.paidAt).toLocaleString("pt-MZ") : `Estado: ${item.status}`}</Text>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>{money(item.amount)}</Text>
          {user?.role === "MERCHANT" ? (
            <View style={commonStyles.row}>
              <Button title="Ver QR Code" icon="qrcode" compact variant="secondary" onPress={() => showTicketQr(item)} />
              <Button title="Imprimir senha" icon="printer-outline" compact variant="secondary" onPress={() => showTicketQr(item, true)} />
            </View>
          ) : null}
          {item.status === "Pago" ? <Button title="Ver / imprimir recibo" icon="receipt-text-outline" compact variant="secondary" onPress={() => setPayment(item)} /> : null}
        </Card>
      ))}
      {!filtered.length && <Card><Text style={commonStyles.mutedText}>Nenhum pagamento encontrado.</Text></Card>}
      <TicketQrModal
        payment={selectedTicket}
        printRequested={printRequested}
        qrRef={ticketQrRef}
        onClose={() => setSelectedTicket(null)}
        onPrint={() => setPrintRequested(true)}
      />
    </View>
  );
}

function TicketQrModal({ payment, printRequested, qrRef, onClose, onPrint }) {
  return (
    <>
      <Modal
        visible={Boolean(payment) && !printRequested}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={styles.qrOverlay} onPress={onClose}>
          <Pressable style={styles.qrDialog} onPress={(event) => event.stopPropagation()}>
            {payment ? (
              <>
                <Text style={commonStyles.sectionTitle}>QR Code da senha</Text>
                <Text style={[commonStyles.mutedText, { textAlign: "center" }]}>{payment.paymentReference}</Text>
                <View style={styles.qrCode}>
                  <QRCode value={payment.paymentReference} size={220} ecl="M" />
                </View>
                <Text style={commonStyles.body}>Estado: {payment.status}</Text>
                <ReceiptRow label="Taxa / período" value={`${payment.product} · ${payment.periodicity} · ${payment.periodStart} — ${payment.periodEnd}`} />
                <ReceiptRow label="Valor" value={money(payment.amount)} />
                <ReceiptRow label="Validade" value={payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("pt-MZ") : "—"} />
                <Button title="Imprimir senha" icon="printer-outline" variant="secondary" onPress={onPrint} />
                <Button title="Fechar" variant="secondary" onPress={onClose} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      {payment && printRequested ? (
        <View style={styles.hiddenQrCode} pointerEvents="none">
          <QRCode
            value={payment.paymentReference}
            size={220}
            ecl="M"
            getRef={(ref) => { qrRef.current = ref; }}
          />
        </View>
      ) : null}
    </>
  );
}

function TicketDetails({ payment, onRegister, saving }) {
  return (
    <Card>
      <Text style={commonStyles.sectionTitle}>{payment.paymentReference}</Text>
      <ReceiptRow label="Comerciante" value={payment.merchant} />
      <ReceiptRow label="Mercado / banca" value={`${payment.market} · ${payment.stall}`} />
      <ReceiptRow label="Taxa / período" value={`${payment.product} · ${payment.periodicity} · ${payment.periodStart} — ${payment.periodEnd}`} />
      {walletMethods.includes(payment.method) ? <ReceiptRow label="Telefone da carteira" value={payment.walletPhone} /> : null}
      <ReceiptRow label="Valor devido" value={money(payment.amount)} />
      <ReceiptRow label="Estado" value={payment.status} />
      <ReceiptRow label="Validade" value={payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("pt-MZ") : "—"} />
      {payment.rejectionReason ? <ReceiptRow label="Motivo da rejeição" value={payment.rejectionReason} /> : null}
      {payment.status === "Pendente" && onRegister ? <Button title={saving ? "A registar…" : "Recebi em numerário"} onPress={onRegister} disabled={saving} /> : null}
    </Card>
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
      <ReceiptRow label="Fiscal responsável" value={payment.cashier} />
      <ReceiptRow label="Confirmação financeira" value={`${payment.confirmedBy || "—"} · ${payment.confirmedAt ? new Date(payment.confirmedAt).toLocaleString("pt-MZ") : "—"}`} />
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

function ticketHtml(payment, qrCode) {
  const rows = [
    ["Referência", payment.paymentReference],
    ["Comerciante", payment.merchant],
    ["Mercado / banca", `${payment.market} · ${payment.stall}`],
    ["Taxa / período", `${payment.product} · ${payment.periodicity} · ${payment.periodStart} — ${payment.periodEnd}`],
    ["Valor", money(payment.amount)],
    ["Estado", payment.status],
    ["Válida até", payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("pt-MZ") : "—"],
  ];
  const escape = (value) => String(value || "—").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  return `<html lang="pt-MZ"><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;padding:28px;color:#172A25}
    main{max-width:560px;margin:0 auto}header{text-align:center;border-bottom:2px solid #176B57;padding-bottom:14px}
    h1{font-size:22px;margin:0}header p{color:#6B7C76;margin:5px 0 0}
    .qr{text-align:center;padding:22px}.qr img{width:220px;height:220px}
    .row{border-top:1px solid #DCE6E1;padding:9px 0}
    .label{display:block;color:#6B7C76;font-size:12px;margin-bottom:3px}
    @media print{body{padding:0}}
  </style></head><body><main>
    <header><h1>Senha de pagamento</h1><p>Cobrança Beira</p></header>
    <div class="qr"><img alt="QR Code da senha" src="data:image/png;base64,${qrCode}"></div>
    ${rows.map(([label, value]) => `<div class="row"><span class="label">${escape(label)}</span><strong>${escape(value)}</strong></div>`).join("")}
  </main></body></html>`;
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
    const file = await Print.printToFileAsync({ html: receiptHtml(payment) });
    await shareFile(file.uri, "application/pdf", "Partilhar recibo");
  } catch (error) {
    console.error("Falha ao preparar ou partilhar o recibo:", error);
    Alert.alert(
      "Não foi possível partilhar o recibo",
      "Tente novamente ou use a opção «Imprimir recibo»."
    );
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
    ["Fiscal responsável", payment.cashier],
    ["Confirmação financeira", payment.confirmedBy],
    ["Identificação da confirmação", payment.transactionReference],
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
  qrOverlay: { flex: 1, backgroundColor: "rgba(10,25,20,0.5)", justifyContent: "center", padding: 20 },
  qrDialog: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12, alignItems: "stretch" },
  qrCode: { alignItems: "center", padding: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  hiddenQrCode: { position: "absolute", left: -10000, top: -10000, opacity: 0 },
};
