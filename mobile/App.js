import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { api, apiPost, getApiBaseUrl } from "./src/api";
import AuthScreen from "./src/screens/AuthScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import PaymentsScreen from "./src/screens/PaymentsScreen";
import ResourceScreen from "./src/screens/ResourceScreen";
import {
  Button,
  Icon,
  Loading,
  Notice,
  colors,
  commonStyles,
} from "./src/components";

const adminNavigation = [
  { key: "dashboard", label: "Dashboard", icon: "view-dashboard-outline" },
  { key: "markets", label: "Mercados", icon: "store-outline" },
  { key: "merchants", label: "Comerciantes", icon: "account-group-outline" },
  { key: "rates", label: "Taxas", icon: "receipt-text-outline" },
  { key: "tickets", label: "Recibos", icon: "ticket-confirmation-outline" },
  { key: "payments", label: "Pagamentos", icon: "cash-multiple" },
  { key: "notifications", label: "Notificações", icon: "bell-outline" },
  { key: "fiscals", label: "Fiscais", icon: "shield-account-outline" },
  { key: "reports", label: "Relatórios", icon: "chart-box-outline" },
  { key: "audit", label: "Auditoria", icon: "history" },
  { key: "settings", label: "Configurações", icon: "cog-outline" },
  { key: "users", label: "Utilizadores", icon: "account-key-outline" },
];

const merchantNavigation = [
  { key: "payments", label: "Pagamentos", icon: "cash-multiple" },
  { key: "notifications", label: "Notificações", icon: "bell-outline" },
];

const financialNavigation = [
  ...merchantNavigation,
  { key: "reports", label: "Relatórios", icon: "chart-box-outline" },
];

const resourceKeys = new Set(["markets", "merchants", "rates", "fiscals", "tickets", "users"]);

export default function App() {
  const params = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const route = {
    key: asString(params.screen) || "dashboard",
    resource: asString(params.resource),
    mode: asString(params.mode),
    id: asString(params.id),
    marketId: asString(params.marketId),
  };

  async function restoreSession() {
    setBooting(true);
    setBootError("");
    try {
      const account = await api("/auth/me");
      setUser(account);
      if (account.role !== "ADMIN"
        && !["payments", "notifications"].includes(route.key)
        && !(account.role === "FINANCIAL_MANAGER" && route.key === "reports")) {
        router.replace("/workspace/payments");
      }
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setBootError("");
      } else {
        setBootError(error.message);
      }
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => { restoreSession(); }, []);

  const isAdmin = user?.role === "ADMIN";
  const navigation = useMemo(
    () => isAdmin
      ? adminNavigation
      : user?.role === "FINANCIAL_MANAGER"
        ? financialNavigation
        : merchantNavigation,
    [isAdmin, user?.role]
  );
  const routeTitle = getRouteTitle(route);
  const showBack = Boolean(route.mode && route.mode !== "list");

  function navigate(target) {
    const destination = typeof target === "object" ? target : { key: target };
    const screen = destination.screen || destination.key ||
      (destination.resource === "stalls" ? "markets" : destination.resource);
    if (!screen) return;
    const routeParams = { screen };
    if (destination.resource) routeParams.resource = destination.resource;
    if (destination.mode) routeParams.mode = destination.mode;
    if (destination.id != null) routeParams.id = String(destination.id);
    if (destination.marketId != null) routeParams.marketId = String(destination.marketId);

    const href = { pathname: "/workspace/[screen]", params: routeParams };
    const openAsNewRoute =
      !destination.replace && (
        destination.mode === "create" ||
        destination.mode === "edit" ||
        destination.mode === "detail" ||
        destination.mode === "new" ||
        destination.resource === "stalls"
      );
    if (openAsNewRoute) router.push(href);
    else router.replace(href);
    setMenuOpen(false);
  }

  function handleBack() {
    router.back();
  }

  async function logout() {
    setMenuOpen(false);
    try {
      await apiPost("/auth/logout", {});
    } catch (error) {
      Alert.alert("Não foi possível terminar a sessão", error.message);
    } finally {
      setUser(null);
      router.replace("/workspace/dashboard");
    }
  }

  function updateUser(account) {
    setUser(account);
    setRefreshKey((value) => value + 1);
  }

  function authenticate(account) {
    setUser(account);
    const destination = account.role === "ADMIN" ? "dashboard" : "payments";
    if (route.key !== destination) {
      router.replace(`/workspace/${destination}`);
    }
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.centered}>
      <Loading label="A validar sessão…" />
      </SafeAreaView>
    );
  }

  if (!user) {
    if (bootError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={[commonStyles.page, { flex: 1, justifyContent: "center" }]}>
            <Text style={commonStyles.title}>API indisponível</Text>
            <Text style={commonStyles.subtitle}>{bootError}</Text>
            <Text style={commonStyles.mutedText}>Endereço detectado: {safeApiUrl()}</Text>
            <Button title="Tentar novamente" onPress={restoreSession} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthScreen onAuthenticated={authenticate} />
      </SafeAreaView>
    );
  }

  const screenContent = renderScreen(route, {
    user,
    navigate,
    updateUser,
    refreshKey,
    setRefreshKey,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.app}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showBack ? "Voltar" : "Abrir menu"}
            onPress={showBack ? handleBack : () => setMenuOpen(true)}
            style={styles.menuButton}
          >
            <Icon name={showBack ? "arrow-left" : "menu"} size={23} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.topbarTitle}>{routeTitle}</Text>
            <Text numberOfLines={1} style={styles.topbarSubtitle}>
              {user.name} · {roleLabel(user.role)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar"
            onPress={() => setRefreshKey((value) => value + 1)}
            style={styles.refreshButton}
          >
            <Icon name="refresh" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            key={`${route.key}-${route.resource || ""}-${route.mode || ""}-${refreshKey}`}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => setRefreshKey((value) => value + 1)}
                tintColor={colors.primary}
              />
            }
          >
            {screenContent}
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={styles.bottomBar}>
          {navigation.slice(0, isAdmin ? 4 : 1).map((item) => (
            <Pressable key={item.key} onPress={() => navigate(item.key)} style={styles.bottomItem}>
              <Icon
                name={item.icon}
                size={20}
                color={route.key === item.key ? colors.primary : colors.muted}
              />
              <Text style={[styles.bottomLabel, route.key === item.key && styles.bottomLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalScrim} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.drawer} onPress={(event) => event.stopPropagation()}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Icon name="bank" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.brand}>Cobrança Beira</Text>
              </View>
              <View style={styles.identityRow}>
                <View style={styles.avatar}>
                  <Icon name={isAdmin ? "shield-account" : "account"} size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.drawerUser}>{user.name}</Text>
                  <Text style={styles.drawerRole}>{roleLabel(user.role)}</Text>
                </View>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              {navigation.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => navigate(item.key)}
                  style={[styles.navItem, route.key === item.key && styles.navItemActive]}
                >
                  <Icon
                    name={item.icon}
                    size={21}
                    color={route.key === item.key ? colors.primary : colors.muted}
                  />
                  <Text style={[styles.navLabel, route.key === item.key && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {route.key === item.key ? <Icon name="chevron-right" size={19} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.drawerFooter}>
              <Text style={styles.apiAddress}>API · {safeApiUrl()}</Text>
              <Button title="Terminar sessão" icon="logout" variant="secondary" onPress={logout} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function renderScreen(route, props) {
  if (route.key === "dashboard") return <DashboardScreen key={props.refreshKey} />;
  if (route.key === "payments") {
    return (
      <PaymentsScreen
        key={props.refreshKey}
        user={props.user}
        mode={route.mode}
        navigate={(mode) => props.navigate(mode === "new" ? { key: "payments", mode: "new" } : "payments")}
        onUserUpdate={props.updateUser}
      />
    );
  }
  if (route.key === "reports" || route.key === "audit" || route.key === "settings" || route.key === "notifications") {
    return <InsightsScreen key={`${route.key}-${props.refreshKey}`} screen={route.key} navigate={props.navigate} />;
  }
  const resource = route.resource || (resourceKeys.has(route.key) ? route.key : null);
  if (resource) {
    return (
      <ResourceScreen
        key={`${resource}-${route.mode || "list"}-${route.id || ""}-${props.refreshKey}`}
        route={{ ...route, resource }}
        navigate={props.navigate}
      />
    );
  }
  return <View style={commonStyles.page}><Notice>Não foi possível abrir esta área.</Notice></View>;
}

function getRouteTitle(route) {
  if (route.resource === "stalls") return "Nova banca";
  if (route.resource && route.mode === "create") return `Novo registo`;
  if (route.resource && route.mode === "edit") return "Editar registo";
  if (route.resource && route.mode === "detail") return "Detalhe do mercado";
  if (route.key === "payments" && route.mode === "new") return "Registar pagamento";
  return [...adminNavigation, ...merchantNavigation].find((item) => item.key === route.key)?.label || "Cobrança Beira";
}

function roleLabel(role) {
  return ({
    ADMIN: "Administrador",
    MERCHANT: "Comerciante",
    FISCAL: "Fiscal",
    FINANCIAL_MANAGER: "Gestor Financeiro",
  })[role] || "Utilizador";
}

function safeApiUrl() {
  try {
    return getApiBaseUrl().replace("/api", "");
  } catch {
    return "Expo Go não detectado";
  }
}

function asString(value) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, justifyContent: "center" },
  app: { flex: 1, backgroundColor: colors.background },
  topbar: {
    minHeight: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  topbarTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  topbarSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  refreshButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  bottomBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  bottomItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 7 },
  bottomLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  bottomLabelActive: { color: colors.primary },
  modalScrim: { flex: 1, backgroundColor: "rgba(10,25,20,0.42)", flexDirection: "row" },
  drawer: {
    width: "84%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 12 : 12,
    paddingBottom: 16,
  },
  drawerHeader: { paddingHorizontal: 22, paddingVertical: 22, borderBottomWidth: 1, borderColor: colors.border },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  brandIcon: { width: 38, height: 38, backgroundColor: colors.primary, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  brand: { color: colors.primary, fontSize: 18, fontWeight: "800" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F2ED" },
  drawerUser: { color: colors.text, fontSize: 16, fontWeight: "700" },
  drawerRole: { color: colors.muted, fontSize: 12, marginTop: 3 },
  navItem: { minHeight: 50, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 13 },
  navItemActive: { backgroundColor: "#E8F2ED", borderRightColor: colors.primary, borderRightWidth: 3 },
  navLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  navLabelActive: { color: colors.primary },
  drawerFooter: { paddingHorizontal: 18, gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 },
  apiAddress: { color: colors.muted, fontSize: 11 },
});
