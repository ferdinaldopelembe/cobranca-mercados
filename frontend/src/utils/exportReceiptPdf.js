function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportReceiptPdf(payment) {
  const details = [
    ["Referência do pagamento", payment.senha],
    ["Comerciante", payment.comerciante],
    ["Telefone", payment.telefone],
    ["E-mail", payment.email],
    ["Telefone da carteira", payment.telefonePagamento],
    ["Mercado", payment.mercado],
    ["Banca", payment.banca],
    ["Taxa", payment.taxa || payment.tipo],
    ["Período", payment.periodo],
    ["Método de pagamento", payment.metodo],
    ["Referência da transacção", payment.referencia],
    ["Fiscal responsável", payment.cashier],
    ["Confirmado por", payment.confirmedBy],
    ["Identificação da confirmação", payment.referencia],
    ["Estado", payment.estado],
    ["Data do pagamento", payment.data],
  ].filter(([, value]) => value && value !== "—");

  const detailsHtml = details
    .map(
      ([label, value]) => `
        <div class="detail">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-MZ">
<head>
  <meta charset="utf-8">
  <title>Recibo ${escapeHtml(payment.senha)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      color: #0f172a;
      font: 14px/1.5 Arial, sans-serif;
    }
    main { max-width: 680px; margin: 0 auto; }
    header { border-bottom: 2px solid #0d9488; padding-bottom: 18px; }
    h1 { margin: 0; font-size: 22px; }
    header p { margin: 5px 0 0; color: #64748b; }
    .amount {
      margin: 24px 0;
      padding: 18px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      text-align: center;
    }
    .amount span { display: block; color: #64748b; font-size: 12px; }
    .amount strong { display: block; margin-top: 4px; font-size: 24px; }
    .details { border-top: 1px solid #e2e8f0; }
    .detail {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail span { color: #64748b; }
    .detail strong { text-align: right; }
    @media print {
      body { padding: 0; }
      main { max-width: none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Recibo de pagamento</h1>
      <p>Cobrança Beira</p>
    </header>
    <section class="amount">
      <span>Valor pago</span>
      <strong>${escapeHtml(Number(payment.valor).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }))} MT</strong>
    </section>
    <section class="details">${detailsHtml}</section>
  </main>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 150);
    };
  </script>
</body>
</html>`;

  const receiptWindow = window.open("", "_blank", "width=760,height=800");
  if (!receiptWindow) {
    alert("O navegador bloqueou a janela do recibo. Permita pop-ups e tente novamente.");
    return;
  }
  receiptWindow.document.open();
  receiptWindow.document.write(html);
  receiptWindow.document.close();
}
