export function mapApiPayment(payment) {
  const start = new Date(`${payment.periodStart}T00:00:00`);
  const end = new Date(`${payment.periodEnd}T00:00:00`);
  const date = (value) =>
    value.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  let period;
  if (payment.periodicity === "Mensal") {
    period = start.toLocaleString("pt-MZ", { month: "long", year: "numeric" });
  } else {
    period =
      payment.periodStart === payment.periodEnd
        ? date(start)
        : `${date(start)} – ${date(end)}`;
  }

  return {
    id: payment.id,
    senha: payment.paymentReference,
    referencia: payment.transactionReference,
    ownerId: payment.ownerId,
    marketId: payment.marketId,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    paidAt: payment.paidAt,
    expiresAt: payment.expiresAt,
    issuedAt: payment.issuedAt,
    cashier: payment.cashier,
    cashReceivedAt: payment.cashReceivedAt,
    confirmedBy: payment.confirmedBy,
    confirmedAt: payment.confirmedAt,
    rejectionReason: payment.rejectionReason,
    comerciante: payment.merchant,
    telefone: payment.phone,
    telefonePagamento: payment.walletPhone,
    email: payment.email,
    mercado: payment.market,
    banca: payment.stall,
    produto: payment.product,
    taxa: `Taxa ${payment.product}`,
    tipo: payment.periodicity,
    periodo: period,
    metodo: payment.method,
    valor: Number(payment.amount),
    data: new Date(payment.paidAt || payment.issuedAt).toLocaleString("pt-MZ"),
    estado: payment.status,
  };
}
