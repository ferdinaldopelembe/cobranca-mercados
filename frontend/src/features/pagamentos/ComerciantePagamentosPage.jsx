import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Printer, QrCode, ReceiptText, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui/Table";
import { api } from "../../lib/api";
import { exportReceiptPdf } from "../../utils/exportReceiptPdf";
import { mapApiPayment } from "./paymentView";
import useAuth from "../../context/useAuth";

const fmtMT = (value) =>
  Number(value).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MT";

export default function ComerciantePagamentosPage() {
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);

  useEffect(() => {
    if (!selectedTicket) return undefined;
    document.body.classList.add("printing-ticket");
    return () => document.body.classList.remove("printing-ticket");
  }, [selectedTicket]);

  useEffect(() => {
    if (!printRequested || !selectedTicket) return undefined;
    const timer = window.setTimeout(() => {
      try {
        window.print();
      } finally {
        setPrintRequested(false);
        setSelectedTicket(null);
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [printRequested, selectedTicket]);

  function printTicket(payment) {
    setSelectedTicket(payment);
    setPrintRequested(true);
  }

  useEffect(() => {
    let active = true;
    api("/payments")
      .then((items) => {
        if (active) setPagamentos(items.map(mapApiPayment));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalPago = useMemo(
    () =>
      pagamentos
        .filter((payment) => payment.estado === "Pago")
        .reduce((total, payment) => total + Number(payment.valor), 0),
    [pagamentos]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Minhas senhas e pagamentos</h1>
          <p className="mt-1 text-sm text-text-muted">
          Consulte senhas emitidas, recebimentos pendentes e pagamentos confirmados.
          </p>
        </div>
        {user?.status !== "Bloqueado" && (
          <Link to="/pagamentos/novo">
            <Button>
              <Plus size={16} />
              Gerar senha
            </Button>
          </Link>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-text-muted">A carregar pagamentos…</p>}
      {!loading && !error && pagamentos.length === 0 && (
        <p className="rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-text-muted">
          Ainda não tem senhas emitidas.
        </p>
      )}

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Total pago
        </p>
        <p className="mt-2 text-xl font-semibold text-emerald-600">
          {fmtMT(totalPago)}
        </p>
      </Card>

      <div className="space-y-3 md:hidden">
        {pagamentos.map((payment) => (
          <Card key={payment.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-medium text-text">{payment.senha}</p>
                <p className="mt-1 text-sm font-medium text-text">{payment.taxa}</p>
                <p className="mt-1 text-xs text-text-muted">{payment.periodo} · {payment.metodo}</p>
                {payment.estado !== "Pago" && payment.expiresAt && (
                  <p className="mt-1 text-xs text-text-muted">
                    Válida até {new Date(payment.expiresAt).toLocaleString("pt-MZ")}
                  </p>
                )}
              </div>
              <Badge variant={payment.estado === "Pago" ? "success" : payment.estado === "Pendente" ? "warning" : "neutral"}>
                {payment.estado}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-sm font-semibold text-text">{fmtMT(payment.valor)}</p>
                <p className="mt-0.5 text-xs text-text-muted">{payment.data}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => setSelectedTicket(payment)}>
                  <QrCode size={16} /> QR
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 px-3"
                  onClick={() => printTicket(payment)}
                  title="Imprimir senha"
                >
                  <Printer size={16} />
                  Imprimir
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 px-3"
                  onClick={() => exportReceiptPdf(payment)}
                  disabled={payment.estado !== "Pago"}
                  title="Imprimir recibo"
                  aria-label="Imprimir recibo"
                >
                  <ReceiptText size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-x-auto p-0 md:block">
        <Table>
          <THead>
            <TH>Referência</TH>
            <TH>Taxa</TH>
            <TH>Período</TH>
            <TH>Método</TH>
            <TH className="text-right">Valor</TH>
            <TH>Data</TH>
            <TH>Validade</TH>
            <TH>Estado</TH>
            <TH className="text-right">Senha</TH>
            <TH className="text-right">Imprimir senha</TH>
            <TH className="text-right">Recibo</TH>
          </THead>
          <TBody>
            {pagamentos.map((payment) => (
              <TR key={payment.id}>
                <TD className="font-mono text-xs text-text">{payment.senha}</TD>
                <TD className="text-text">{payment.taxa}</TD>
                <TD className="text-text-muted">{payment.periodo}</TD>
                <TD className="text-text">{payment.metodo}</TD>
                <TD className="text-right font-medium text-text">
                  {fmtMT(payment.valor)}
                </TD>
                <TD className="text-text-muted">{payment.data}</TD>
                <TD className="text-text-muted">
                  {payment.estado === "Pago" || !payment.expiresAt
                    ? "—"
                    : new Date(payment.expiresAt).toLocaleString("pt-MZ")}
                </TD>
                <TD>
                  <Badge variant={payment.estado === "Pago" ? "success" : payment.estado === "Pendente" ? "warning" : "neutral"}>
                    {payment.estado}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                    title="Ver QR Code da senha"
                    onClick={() => setSelectedTicket(payment)}
                  >
                    <QrCode size={16} />
                  </button>
                </TD>
                <TD className="text-right">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text"
                    title="Imprimir senha"
                    aria-label={`Imprimir senha ${payment.senha}`}
                    onClick={() => printTicket(payment)}
                  >
                    <Printer size={16} />
                  </button>
                </TD>
                <TD className="text-right">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 hover:text-text disabled:opacity-40"
                    title="Imprimir recibo"
                    aria-label={`Imprimir recibo ${payment.senha}`}
                    onClick={() => exportReceiptPdf(payment)}
                    disabled={payment.estado !== "Pago"}
                  >
                    <ReceiptText size={16} />
                  </button>
                </TD>
              </TR>
            ))}
            {!loading && !error && pagamentos.length === 0 && (
              <TR>
                <TD colSpan={11} className="py-8 text-center text-sm text-text-muted">
                  Ainda não efectuou pagamentos.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
      {selectedTicket && (
        <div
          className={printRequested
            ? "ticket-print-only"
            : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTicket(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-qr-title"
            className="ticket-print-view w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="ticket-qr-title" className="font-semibold text-text">QR Code da senha</h2>
                <p className="mt-1 break-all font-mono text-xs text-text-muted">{selectedTicket.senha}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                aria-label="Fechar QR Code"
                className="rounded-lg p-2 text-text-muted hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-3">
              <QRCodeSVG value={selectedTicket.senha} size={208} level="M" includeMargin />
              <Badge variant={selectedTicket.estado === "Pago" ? "success" : selectedTicket.estado === "Pendente" ? "warning" : "neutral"}>
                {selectedTicket.estado}
              </Badge>
              <p className="text-center text-xs text-text-muted">
                Apresente este código para identificar a sua senha.
              </p>
            </div>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Taxa</dt><dd className="text-right font-medium">{selectedTicket.taxa}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Período</dt><dd className="text-right">{selectedTicket.periodo}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-muted">Valor</dt><dd className="text-right font-medium">{fmtMT(selectedTicket.valor)}</dd></div>
              {selectedTicket.expiresAt && (
                <div className="flex justify-between gap-4"><dt className="text-text-muted">Válida até</dt><dd className="text-right">{new Date(selectedTicket.expiresAt).toLocaleString("pt-MZ")}</dd></div>
              )}
            </dl>
            <div className="ticket-print-actions mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir senha
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
