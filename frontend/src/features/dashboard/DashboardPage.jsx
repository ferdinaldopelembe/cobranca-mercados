import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Ticket,
  Users,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatMT, formatPercent, formatDateTime } from "../../lib/format";
import {
  MERCADOS,
  KPI_DADOS,
  ARRECADACAO_DIARIA,
  ARRECADACAO_POR_MERCADO,
  DESEMPENHO_FISCAIS,
  METODOS_PAGAMENTO,
  PAGAMENTOS_NUMERARIO_PENDENTES,
} from "../../data/mock";

/* ---------- Filtros ---------- */
function Filters({ mercado, periodo, onMercado, onPeriodo }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={mercado}
        onChange={(e) => onMercado(e.target.value)}
        className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Todos os mercados</option>
        {MERCADOS.map((m) => (
          <option key={m.id} value={m.nome}>
            {m.nome}
          </option>
        ))}
      </select>
      <select
        value={periodo}
        onChange={(e) => onPeriodo(e.target.value)}
        className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="hoje">Hoje</option>
        <option value="7dias">7 dias</option>
        <option value="mes">Este mês</option>
      </select>
    </div>
  );
}

/* ---------- Cartões KPI ---------- */
function KpiCard({ label, value, variacao, icon: Icon, suffix = "MT" }) {
  const positive = variacao >= 0;
  const formatted =
    suffix === "MT" ? formatMT(value) : String(value);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-text">{formatted}</p>
          <p
            className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
              positive ? "text-success" : "text-danger"
            }`}
          >
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatPercent(variacao)}
            <span className="text-text-muted font-normal">vs. período anterior</span>
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

/* ---------- Gráfico de linha (SVG puro) ---------- */
function LineChart({ data }) {
  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.valor));
  const min = 0;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * w;
    const y = padding.top + h - ((d.valor - min) / (max - min)) * h;
    return [x, y];
  });
  const line = points.map((p) => p.join(",")).join(" ");

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = min + ((max - min) * i) / yTicks;
    return {
      v,
      y: padding.top + h - (i / yTicks) * h,
    };
  });

  const xLabels = [0, 9, 19, 29].map((i) => ({
    label: `${data[i].dia}/02`,
    x: padding.left + (i / (data.length - 1)) * w,
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-60 w-full"
      role="img"
      aria-label="Arrecadação diária"
    >
      {/* Grid horizontal + labels Y */}
      {yLabels.map((t) => (
        <g key={t.v}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={t.y}
            y2={t.y}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={t.y + 4}
            textAnchor="end"
            fontSize="11"
            fill="#64748B"
          >
            {Math.round(t.v / 1000)}k
          </text>
        </g>
      ))}

      {/* Linha */}
      <polyline
        points={line}
        fill="none"
        stroke="#14532D"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Pontos */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#14532D" />
      ))}

      {/* Labels X */}
      {xLabels.map((l) => (
        <text
          key={l.label}
          x={l.x}
          y={height - 10}
          textAnchor="middle"
          fontSize="11"
          fill="#64748B"
        >
          {l.label}
        </text>
      ))}
    </svg>
  );
}

/* ---------- Barras horizontais ---------- */
function HBars({ items, valueKey = "valor", labelKey = "mercado", format = formatMT }) {
  const max = Math.max(...items.map((i) => i[valueKey]));
  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const pct = (item[valueKey] / max) * 100;
        return (
          <li key={item[labelKey]}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-text">{item[labelKey]}</span>
              <span className="font-medium text-text">{format(item[valueKey])}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Página ---------- */
export default function DashboardPage() {
  const [mercado, setMercado] = useState("");
  const [periodo, setPeriodo] = useState("hoje");
  const [pendentes, setPendentes] = useState(PAGAMENTOS_NUMERARIO_PENDENTES);

  function validar(id) {
    setPendentes((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            Visão geral da arrecadação de taxas nos mercados informais.
          </p>
        </div>
        <Filters
          mercado={mercado}
          periodo={periodo}
          onMercado={setMercado}
          onPeriodo={setPeriodo}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Arrecadado hoje"
          value={KPI_DADOS.hoje.valor}
          variacao={KPI_DADOS.hoje.variacao}
          icon={Wallet}
        />
        <KpiCard
          label="Arrecadado no mês"
          value={KPI_DADOS.mes.valor}
          variacao={KPI_DADOS.mes.variacao}
          icon={TrendingUp}
        />
        <KpiCard
          label="Senhas pendentes"
          value={KPI_DADOS.senhasPendentes.valor}
          variacao={KPI_DADOS.senhasPendentes.variacao}
          icon={Ticket}
          suffix="num"
        />
        <KpiCard
          label="Comerciantes bloqueados"
          value={KPI_DADOS.bloqueados.valor}
          variacao={KPI_DADOS.bloqueados.variacao}
          icon={Users}
          suffix="num"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-text">
              Arrecadação diária (últimos 30 dias)
            </h3>
          </div>
          <div className="p-4">
            <LineChart data={ARRECADACAO_DIARIA} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-text">
              Arrecadação por mercado
            </h3>
          </div>
          <div className="p-5">
            <HBars items={ARRECADACAO_POR_MERCADO} />
          </div>
        </Card>
      </div>

      {/* Tabela fiscais + métodos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-text">
              Desempenho por fiscal
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Fiscal</th>
                  <th className="px-5 py-3">Mercado</th>
                  <th className="px-5 py-3 text-right">Senhas</th>
                  <th className="px-5 py-3 text-right">Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DESEMPENHO_FISCAIS.map((f) => (
                  <tr key={f.fiscal} className="h-13 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-text">{f.fiscal}</td>
                    <td className="px-5 py-3 text-text-muted">{f.mercado}</td>
                    <td className="px-5 py-3 text-right text-text">{f.senhas}</td>
                    <td className="px-5 py-3 text-right font-medium text-text">
                      {formatMT(f.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-text">
              Por método de pagamento
            </h3>
          </div>
          <div className="p-5">
            <HBars items={METODOS_PAGAMENTO} labelKey="metodo" />
          </div>
        </Card>
      </div>

      {/* Pagamentos em numerário pendentes */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-warning" />
            <h3 className="text-base font-semibold text-text">
              Pagamentos em numerário a aguardar validação do gestor
            </h3>
          </div>
          <Badge variant="warning">{pendentes.length} pendentes</Badge>
        </div>

        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
            <CheckCircle2 size={24} className="text-success" />
            <p className="text-sm text-text">Nenhum pagamento pendente de validação.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Recibo</th>
                  <th className="px-5 py-3">Comerciante</th>
                  <th className="px-5 py-3">Mercado</th>
                  <th className="px-5 py-3">Fiscal</th>
                  <th className="px-5 py-3">Data e hora</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3 text-right">Acção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendentes.map((p) => (
                  <tr key={p.id} className="h-13 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-text">{p.recibo}</td>
                    <td className="px-5 py-3 text-text">{p.comerciante}</td>
                    <td className="px-5 py-3 text-text-muted">{p.mercado}</td>
                    <td className="px-5 py-3 text-text-muted">{p.fiscal}</td>
                    <td className="px-5 py-3 text-text-muted">{formatDateTime(p.data)}</td>
                    <td className="px-5 py-3 text-right font-medium text-text">
                      {formatMT(p.valor)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="md" onClick={() => validar(p.id)}>
                        Validar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}