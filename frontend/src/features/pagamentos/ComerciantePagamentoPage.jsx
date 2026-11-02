import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Select from "../../components/ui/Select";
import useAuth from "../../context/useAuth";
import { api, apiPost } from "../../lib/api";
import { mapApiPayment } from "./paymentView";

const CASH_METHODS = ["Numerário"];
const WALLET_METHODS = ["M-Pesa", "e-Mola", "Mkesh"];
const METHODS = [...CASH_METHODS, ...WALLET_METHODS];

const fmtMT = (value) =>
  Number(value).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MT";

export default function ComerciantePagamentoPage() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [rates, setRates] = useState([]);
  const [profileMarketId, setProfileMarketId] = useState("");
  const [profileStallId, setProfileStallId] = useState("");
  const [profileProduct, setProfileProduct] = useState("");
  const [method, setMethod] = useState("");
  const [walletPhone, setWalletPhone] = useState(user.phone || "");
  const [error, setError] = useState("");
  const [simulationMessage, setSimulationMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState(null);
  const usesWallet = WALLET_METHODS.includes(method);
  const rate = rates.find((item) => item.product === user.produto);

  useEffect(() => {
    let active = true;
    api("/catalog/markets")
      .then((items) => {
        if (active) setMarkets(items);
      })
      .catch((catalogError) => {
        if (active) setError(catalogError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user.marketId) return undefined;
    let active = true;
    api(`/catalog/rates?marketId=${user.marketId}`)
      .then((items) => {
        if (active) setRates(items);
      })
      .catch((catalogError) => {
        if (active) setError(catalogError.message);
      });
    return () => {
      active = false;
    };
  }, [user.marketId]);

  async function submitPayment(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const savedPayment = await apiPost("/payments", {
        method,
        ...(usesWallet ? { phone: walletPhone } : {}),
      });
      setPayment(mapApiPayment(savedPayment));
    } catch (paymentError) {
      setError(paymentError.message);
    } finally {
      setSaving(false);
    }
  }

  async function simulateWalletOutcome(outcome) {
    setError("");
    setSimulationMessage("");
    setSaving(true);
    try {
      const result = await apiPost(
        `/payments/${payment.id}/wallet/simulation/callback`,
        { outcome }
      );
      setPayment(mapApiPayment(result));
      if (outcome === "TIMEOUT") {
        setSimulationMessage("A carteira não respondeu. A senha continua pendente e poderá expirar no prazo indicado.");
      }
    } catch (simulationError) {
      setError(simulationError.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadProfileRates(marketId) {
    setRates([]);
    setProfileProduct("");
    if (!marketId) return;
    try {
      setRates(await api(`/catalog/rates?marketId=${marketId}`));
    } catch (catalogError) {
      setError(catalogError.message);
    }
  }

  async function saveProfile() {
    setError("");
    try {
      await updateUserProfile({
        marketId: profileMarketId,
        stallId: profileStallId,
        product: profileProduct,
      });
    } catch (profileError) {
      setError(profileError.message);
    }
  }

  if (payment) {
    const walletPayment = WALLET_METHODS.includes(payment.metodo);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-text">Senha emitida</h1>
        <Card className="space-y-5 p-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 size={36} className="text-emerald-600" />
            <h2 className="mt-3 text-lg font-semibold text-text">Senha emitida para {payment.comerciante}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
            <QRCodeSVG value={payment.senha} size={176} level="M" includeMargin />
            <p className="text-center text-xs text-text-muted">
              QR Code da referência {payment.senha}
            </p>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-slate-50 p-4 text-sm">
            <p><strong>Referência de pagamento:</strong> {payment.senha}</p>
            <p><strong>Comerciante:</strong> {payment.comerciante}</p>
            <p><strong>Telefone:</strong> {payment.telefone || "—"}</p>
            {walletPayment && <p><strong>Telefone da carteira:</strong> {payment.telefonePagamento || "—"}</p>}
            <p><strong>Taxa:</strong> {payment.taxa}</p>
            <p><strong>Mercado / banca:</strong> {payment.mercado} · {payment.banca}</p>
            <p><strong>Período:</strong> {payment.periodo}</p>
            <p><strong>Estado:</strong> {payment.estado}</p>
            <p><strong>Válida até:</strong> {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("pt-MZ") : "—"}</p>
            <p><strong>Valor:</strong> {fmtMT(payment.valor)}</p>
            <p><strong>Emitida:</strong> {payment.data}</p>
          </div>
          {walletPayment && payment.estado === "Pendente" && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary-soft p-4">
              <div>
                <p className="text-sm font-semibold text-primary">Simulação de carteira móvel</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">Esta demonstração não transfere dinheiro nem substitui uma integração real. Não introduza PIN.</p>
              </div>
              {simulationMessage && <p role="status" className="text-sm text-text">{simulationMessage}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => simulateWalletOutcome("CONFIRMED")} disabled={saving}>{saving ? "A processar…" : "Simular confirmação"}</Button>
                <Button variant="secondary" onClick={() => simulateWalletOutcome("REJECTED")} disabled={saving}>Simular rejeição</Button>
                <Button variant="secondary" onClick={() => simulateWalletOutcome("TIMEOUT")} disabled={saving}>Simular falta de resposta</Button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/pagamentos")}>
              Ver as minhas senhas
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user.marketId || !user.stallId || !user.produto) {
    const selectedMarket = markets.find(
      (market) => market.id === Number(profileMarketId)
    );
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Associar o seu negócio</h1>
          <p className="mt-1 text-sm text-text-muted">
            Estes dados ficam guardados no seu perfil e serão usados nos pagamentos.
          </p>
        </div>
        <Card className="space-y-4 p-5">
          <Select
            id="profile-market"
            label="Mercado"
            value={profileMarketId}
            onChange={(event) => {
              const marketId = event.target.value;
              setProfileMarketId(marketId);
              setProfileStallId("");
              loadProfileRates(marketId);
            }}
            required
          >
            <option value="">Seleccionar mercado…</option>
            {markets.map((market) => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </Select>
          <Select
            id="profile-stall"
            label="A sua banca"
            value={profileStallId}
            onChange={(event) => setProfileStallId(event.target.value)}
            disabled={!selectedMarket}
            required
          >
            <option value="">Seleccionar banca…</option>
            {(selectedMarket?.stalls || []).map((stall) => (
              <option key={stall.id} value={stall.id}>{stall.code}</option>
            ))}
          </Select>
          <Select
            id="profile-product"
            label="Produto comercializado"
            value={profileProduct}
            onChange={(event) => setProfileProduct(event.target.value)}
            disabled={!rates.length}
            required
          >
            <option value="">Seleccionar produto…</option>
            {rates.map((item) => (
              <option key={item.id} value={item.product}>{item.product}</option>
            ))}
          </Select>
          {profileProduct && (
            <p className="text-sm text-text-muted">
              {(() => {
                const selectedRate = rates.find((item) => item.product === profileProduct);
                return selectedRate
                  ? `Taxa: ${selectedRate.periodicity} · ${fmtMT(selectedRate.amount)}`
                  : "";
              })()}
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            className="w-full"
            disabled={!profileMarketId || !profileStallId || !profileProduct}
            onClick={saveProfile}
          >
            Guardar os dados do meu negócio
          </Button>
        </Card>
      </div>
    );
  }

  if (rates.length > 0 && !rate) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">
          Não há uma taxa activa para o produto associado à sua banca. Contacte o administrador.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/pagamentos")}
          className="rounded-md p-1.5 hover:bg-slate-100"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-text">Gerar senha de cobrança</h1>
          <p className="mt-1 text-sm text-text-muted">
          O período e o valor são calculados pela taxa da sua banca. O fiscal regista o numerário e o gestor financeiro confirma o pagamento.
          </p>
        </div>
      </div>

      <form onSubmit={submitPayment} className="space-y-6">
        {user.status === "Bloqueado" && (
          <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            A sua conta está bloqueada para novas senhas. {user.statusReason || "Consulte o histórico e contacte a administração para regularizar a situação."}
          </div>
        )}
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            O seu negócio
          </h2>
          <p className="text-sm text-text"><strong>Comerciante:</strong> {user.name}</p>
          <p className="text-sm text-text"><strong>Telefone:</strong> {user.phone || "—"}</p>
          <p className="text-sm text-text"><strong>Mercado:</strong> {user.mercado}</p>
          <p className="text-sm text-text"><strong>Banca:</strong> {user.banca}</p>
          <p className="text-sm text-text"><strong>Produto:</strong> {user.produto}</p>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Taxa aplicável
          </h2>
          {rate ? (
            <>
              <p className="text-sm text-text"><strong>Periodicidade:</strong> {rate.periodicity}</p>
              <p className="text-sm text-text"><strong>Valor a pagar:</strong> {fmtMT(rate.amount)}</p>
            </>
          ) : (
            <p className="text-sm text-text-muted">A carregar a taxa aplicável…</p>
          )}
          <Select
            id="method"
            label="Tipo de recebimento"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {METHODS.map((option) => (
              <option key={option} value={option}>{option}{WALLET_METHODS.includes(option) ? " · simulação" : ""}</option>
            ))}
          </Select>
          {usesWallet && (
            <label className="block text-sm font-medium text-text">
              Número de telefone da carteira
              <input
                type="tel"
                value={walletPhone}
                onChange={(event) => setWalletPhone(event.target.value)}
                required
                autoComplete="tel"
                placeholder="+258 84 000 0000"
                className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          )}
          {usesWallet && <p className="text-xs leading-5 text-text-muted">Simulação demonstrativa: nenhuma transferência real será efectuada. Nunca introduza o PIN da sua carteira.</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={user.status === "Bloqueado" || !rate || !method || saving || usesWallet && !walletPhone.trim()}>
            {saving ? "A emitir…" : "Emitir senha"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
