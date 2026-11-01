import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api, apiPost } from "../api";
import { Button, Card, Field, Icon, Notice, colors, commonStyles } from "../components";

export default function AuthScreen({ onAuthenticated }) {
  const [registering, setRegistering] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({
    identifier: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    marketId: "",
    stallId: "",
    product: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!registering) return undefined;
    let active = true;
    api("/catalog/markets")
      .then((items) => {
        if (active) setMarkets(items.filter((market) => market.active));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [registering]);

  const selectedMarket = markets.find((market) => String(market.id) === form.marketId);
  const stalls = selectedMarket?.stalls?.filter((stall) => !stall.occupied) || [];
  const products = useMemo(
    () => [...new Set(rates.map((rate) => rate.product))].map((product) => ({
      value: product,
      label: product,
    })),
    [rates]
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function changeMarket(marketId) {
    setForm((current) => ({ ...current, marketId, stallId: "", product: "" }));
    setRates([]);
    if (!marketId) return;
    try {
      setRates(await api(`/catalog/rates?marketId=${encodeURIComponent(marketId)}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submit() {
    setError("");
    if (registering) {
      if (!form.email.trim() && !form.phone.trim()) {
        setError("Indique um e-mail ou telefone para iniciar sessão.");
        return;
      }
      if (form.password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      if (!form.marketId || !form.stallId || !form.product) {
        setError("Indique o mercado, a banca e o produto do seu negócio.");
        return;
      }
    }

    setLoading(true);
    try {
      const account = registering
        ? await apiPost("/auth/register", {
            name: form.name,
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            password: form.password,
            marketId: Number(form.marketId),
            stallId: Number(form.stallId),
            product: form.product,
          })
        : await apiPost("/auth/login", {
            identifier: form.identifier.trim(),
            password: form.password,
          });
      onAuthenticated(account);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[commonStyles.page, { flex: 1, justifyContent: "center", paddingBottom: 30 }]}>
      <View style={{ gap: 6, marginBottom: 8 }}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}><Icon name="bank" size={25} color="#FFFFFF" /></View>
          <Text style={styles.brandText}>COBRANÇA BEIRA</Text>
        </View>
        <View style={styles.welcomeIcon}>
          <Icon name={registering ? "account-plus-outline" : "hand-wave-outline"} size={27} color={colors.primary} />
        </View>
        <Text style={commonStyles.title}>{registering ? "Criar conta" : "Bem-vindo"}</Text>
        <Text style={commonStyles.subtitle}>
          {registering
            ? "Registe o seu negócio para consultar e efectuar pagamentos."
            : "Entre para gerir mercados e pagamentos."}
        </Text>
      </View>
      <Card>
        {registering ? (
          <>
            <Field label="Nome completo" value={form.name} onChangeText={(value) => update("name", value)} icon="account-outline" />
            <Field label="E-mail (ou telefone)" value={form.email} onChangeText={(value) => update("email", value)} keyboardType="email-address" autoCapitalize="none" icon="email-outline" />
            <Field label="Telefone" value={form.phone} onChangeText={(value) => update("phone", value)} keyboardType="phone-pad" icon="phone-outline" />
            <Field
              label="Mercado"
              value={form.marketId}
              onChangeText={changeMarket}
              placeholder="Seleccionar mercado…"
              icon="store-outline"
              options={markets.map((market) => ({ value: market.id, label: market.name }))}
            />
            <Field
              label="Banca"
              value={form.stallId}
              onChangeText={(value) => update("stallId", value)}
              placeholder={form.marketId ? "Seleccionar banca…" : "Escolha primeiro o mercado"}
              options={stalls.map((stall) => ({ value: stall.id, label: stall.code }))}
              editable={Boolean(form.marketId)}
              icon="store-marker-outline"
            />
            <Field
              label="Produto comercializado"
              value={form.product}
              onChangeText={(value) => update("product", value)}
              placeholder="Seleccionar produto…"
              options={products}
              editable={Boolean(form.marketId)}
              icon="food-apple-outline"
            />
            <Field label="Senha (mínimo 6 caracteres)" value={form.password} onChangeText={(value) => update("password", value)} secureTextEntry icon="lock-outline" />
            <Field label="Confirmar senha" value={form.confirmPassword} onChangeText={(value) => update("confirmPassword", value)} secureTextEntry icon="lock-check-outline" />
          </>
        ) : (
          <>
            <Field label="E-mail ou telefone" value={form.identifier} onChangeText={(value) => update("identifier", value)} autoCapitalize="none" icon="account-outline" />
            <Field label="Senha" value={form.password} onChangeText={(value) => update("password", value)} secureTextEntry icon="lock-outline" />
          </>
        )}
        {error ? <Notice>{error}</Notice> : null}
        <Button
          title={loading ? "A aguardar…" : registering ? "Criar conta" : "Entrar"}
          icon={registering ? "account-plus-outline" : "login"}
          onPress={submit}
          disabled={loading}
        />
      </Card>
      <Pressable onPress={() => { setError(""); setRegistering((value) => !value); }} style={styles.switchAccount}>
        <Icon name={registering ? "login" : "account-plus-outline"} size={18} color={colors.primary} />
        <Text style={{ textAlign: "center", color: colors.primary, fontWeight: "600", padding: 10 }}>
          {registering ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar conta"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = {
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  brandIcon: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  brandText: { color: colors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 1.1 },
  welcomeIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#E8F2ED", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  switchAccount: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
};
