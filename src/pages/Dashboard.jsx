// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, Package, BarChart2,
  FileDown, Calendar
} from 'lucide-react';
import '../styles/dashboard.css';

// ── Helpers ────────────────────────────────────────────────
const toDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Traductor universal de fechas para Google Sheets
const parseSheetDateToYMD = (val) => {
  if (!val) return '';
  const str = String(val);

  // 1. ISO/Internacional (ej. "2026-04-14T01:04:29.000Z")
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);

  // 2. Formato argentino (ej. "14/4/2026, 15:30:00")
  if (str.includes('/')) {
    const [datePart] = str.split(',');
    const parts = datePart.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  return str;
};

const formatPrice = (n) =>
  Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const MARCAS_CONFIG = [
  { nombre: 'Adidas',      color: '#1F2937' },
  { nombre: 'Nike',        color: '#111827' },
  { nombre: 'Puma',        color: '#991B1B' },
  { nombre: 'Mizuno',      color: '#1E3A8A' },
  { nombre: 'New Balance', color: '#065F46' },
];

// ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [ventas, setVentas]       = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [tipoFiltro, setTipoFiltro] = useState('dia');

  // FIX: hoyStr calculado una sola vez con useRef para no recalcular en cada render.
  // Si el usuario necesita la fecha actualizada puede recargar la página.
  const hoyStr = useRef(toDateStr(new Date())).current;

  const primerDiaMes = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [fechaInicio, setFechaInicio]             = useState(primerDiaMes);
  const [fechaFin, setFechaFin]                   = useState(hoyStr);

  // ── GET: Cargar sistema real ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL);
        const json = await response.json();
        if (json.status === 'success') {
          setVentas(json.data.ventas || []);
          setProductos(json.data.productos || []);
          setClientes(json.data.clientes || []);
        }
      } catch (error) {
        console.error('Error al cargar métricas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Métricas principales ──
  const metricas = useMemo(() => {
    const enRango = (fechaStr) => tipoFiltro === 'dia'
      ? fechaStr === fechaSeleccionada
      : fechaStr >= fechaInicio && fechaStr <= fechaFin;

    // FIX: cálculo correcto del período anterior simétrico al actual
    const diasRango = tipoFiltro === 'dia' ? 1
      : Math.max(1, Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 86400000) + 1);

    const baseInicio = new Date(tipoFiltro === 'dia' ? fechaSeleccionada : fechaInicio);
    const inicioAnterior = new Date(baseInicio);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasRango);
    const finAnterior = new Date(inicioAnterior);
    finAnterior.setDate(finAnterior.getDate() + diasRango - 1);

    const inicioAntStr = toDateStr(inicioAnterior);
    const finAntStr    = toDateStr(finAnterior);

    const enRangoAnterior = (f) => f >= inicioAntStr && f <= finAntStr;

    let ingresos = 0, ingresosAnt = 0, ingresosHoy = 0;
    let transacciones = 0, transaccionesAnt = 0;
    const porMarca = {};

    ventas.forEach(v => {
      const fechaVentaYMD = parseSheetDateToYMD(v.fecha);
      const montoTotal    = parseFloat(v.total) || 0;
      const cant          = parseInt(v.cantidad) || 0;

      if (fechaVentaYMD === hoyStr) ingresosHoy += montoTotal;

      if (enRango(fechaVentaYMD)) {
        ingresos += montoTotal;
        transacciones += 1;

        const prodRelacionado = productos.find(p => p.id_producto === v.id_producto);
        const marca = prodRelacionado ? prodRelacionado.marca : 'Otros';
        porMarca[marca] = (porMarca[marca] || 0) + cant;
      }

      if (enRangoAnterior(fechaVentaYMD)) {
        ingresosAnt += montoTotal;
        transaccionesAnt += 1;
      }
    });

    const pctIngresos = ingresosAnt > 0
      ? Math.round(((ingresos - ingresosAnt) / ingresosAnt) * 100) : null;
    const pctTrans = transaccionesAnt > 0
      ? Math.round(((transacciones - transaccionesAnt) / transaccionesAnt) * 100) : null;

    const totalUnidades = Object.values(porMarca).reduce((a, b) => a + b, 0) || 1;

    return {
      ingresosHoy, ingresos, pctIngresos,
      transacciones, pctTrans,
      ticketPromedio: transacciones > 0 ? Math.round(ingresos / transacciones) : 0,
      porMarca, totalUnidades,
    };
  }, [ventas, productos, tipoFiltro, fechaSeleccionada, fechaInicio, fechaFin, hoyStr]);

  // ── Tendencia últimos 7 días ──
  const tendencia7d = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const str = toDateStr(d);

      const total = ventas
        .filter(v => parseSheetDateToYMD(v.fecha) === str)
        .reduce((a, v) => a + (parseFloat(v.total) || 0), 0);

      const label = d.toLocaleDateString('es-AR', { weekday: 'short' });
      return { str, total, label };
    });
  }, [ventas]);

  const maxBar = Math.max(...tendencia7d.map(d => d.total), 1);

  // ── Últimas ventas del período ──
  const ultimasVentas = useMemo(() => {
    const enRango = (f) => tipoFiltro === 'dia'
      ? f === fechaSeleccionada
      : f >= fechaInicio && f <= fechaFin;

    return [...ventas]
      .reverse()
      .filter(v => enRango(parseSheetDateToYMD(v.fecha)))
      .slice(0, 8);
  }, [ventas, tipoFiltro, fechaSeleccionada, fechaInicio, fechaFin]);

  // FIX: loading usa solo la clase CSS, sin inline styles mezclados
  if (loading) return (
    <div className="dash-loading">
      <div className="loading-spinner" />
      <span>Sincronizando métricas con la base de datos...</span>
    </div>
  );

  const labelPeriodo = tipoFiltro === 'dia'
    ? `Fecha: ${fechaSeleccionada}`
    : `${fechaInicio} → ${fechaFin}`;

  return (
    <div className="page-container dashboard-page">

      <header className="page-header dashboard-header">
        <div>
          <h2>Panel de Rendimiento</h2>
          <p>Reporte analítico de ventas y movimiento de botines.</p>
        </div>
        <div className="dashboard-controls no-print">
          <select
            className="filtro-selector"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="dia">Día específico</option>
            <option value="rango">Rango de fechas</option>
          </select>

          {tipoFiltro === 'rango' ? (
            <div className="rango-fechas">
              <input type="date" className="fecha-selector"
                value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              <span className="rango-sep">→</span>
              <input type="date" className="fecha-selector"
                value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          ) : (
            <input type="date" className="fecha-selector"
              value={fechaSeleccionada} onChange={(e) => setFechaSeleccionada(e.target.value)} />
          )}

          <button className="btn-export no-print" onClick={() => window.print()}>
            <FileDown size={15} /> Exportar PDF
          </button>
        </div>
      </header>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-highlight">
          <div className="kpi-icon"><DollarSign size={20} /></div>
          <div className="kpi-label">Ingresos de hoy</div>
          <div className="kpi-value">{formatPrice(metricas.ingresosHoy)}</div>
          <div className="kpi-sub">Cierre a las 00:00 hs</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-blue"><TrendingUp size={20} /></div>
          <div className="kpi-label">Ingresos del período</div>
          <div className="kpi-value">{formatPrice(metricas.ingresos)}</div>
          <div className="kpi-sub">{labelPeriodo}</div>
          {metricas.pctIngresos !== null && (
            <div className={`kpi-badge ${metricas.pctIngresos >= 0 ? 'badge-up' : 'badge-down'}`}>
              {metricas.pctIngresos >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(metricas.pctIngresos)}% vs período anterior
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-green"><ShoppingCart size={20} /></div>
          <div className="kpi-label">Transacciones</div>
          <div className="kpi-value">{metricas.transacciones}</div>
          <div className="kpi-sub">Ticket promedio: {formatPrice(metricas.ticketPromedio)}</div>
          {metricas.pctTrans !== null && (
            <div className={`kpi-badge ${metricas.pctTrans >= 0 ? 'badge-up' : 'badge-down'}`}>
              {metricas.pctTrans >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(metricas.pctTrans)}% vs período anterior
            </div>
          )}
        </div>
      </div>

      {/* ── Módulos ── */}
      <div className="dash-modules">

        {/* Gráfico tendencia 7d */}
        <div className="dash-module module-wide">
          <div className="module-header">
            <h3><BarChart2 size={16} /> Tendencia de ingresos — últimos 7 días</h3>
          </div>
          <div className="bar-chart">
            {tendencia7d.map((d) => {
              const pct   = Math.round((d.total / maxBar) * 100);
              const esHoy = d.str === hoyStr;
              return (
                <div className="bar-col" key={d.str}>
                  <div className="bar-amount">{formatPrice(d.total)}</div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${esHoy ? 'bar-fill-today' : ''}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <div className={`bar-label ${esHoy ? 'bar-label-today' : ''}`}>
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución por Marcas */}
        <div className="dash-module">
          <div className="module-header">
            <h3><Package size={16} /> Pares vendidos por Marca</h3>
          </div>
          <div className="cat-list">
            {MARCAS_CONFIG.map((marca) => {
              const cant = metricas.porMarca[marca.nombre] || 0;
              const pct  = metricas.totalUnidades > 1 || cant > 0
                ? Math.round((cant / metricas.totalUnidades) * 100)
                : 0;
              return (
                <div className="cat-row" key={marca.nombre}>
                  <div className="cat-info">
                    <span className="cat-dot" style={{ background: marca.color }} />
                    <span className="cat-name">{marca.nombre}</span>
                    <span className="cat-units">{cant} pares</span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill"
                      style={{ width: `${pct}%`, background: marca.color }} />
                  </div>
                  <span className="cat-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Últimas ventas ── */}
      <div className="card table-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="table-title">
          <Calendar size={16} />
          Últimas ventas del período
          <span className="table-count">{ultimasVentas.length} registros mostrados</span>
        </h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Modelo</th>
                <th>Talle (US)</th>
                <th>Cant.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ultimasVentas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                    Sin ventas en el período seleccionado.
                  </td>
                </tr>
              ) : ultimasVentas.map(v => {
                const nombreCliente  = clientes.find(c => c.id_cliente === v.id_cliente)?.nombre || v.id_cliente;
                const nombreProducto = productos.find(p => p.id_producto === v.id_producto)?.nombre || v.id_producto;
                return (
                  <tr key={v.id_venta}>
                    <td className="td-muted td-fecha">
                      {parseSheetDateToYMD(v.fecha)}
                    </td>
                    <td className="td-nombre">{nombreCliente}</td>
                    <td><strong>{nombreProducto}</strong></td>
                    <td className="td-muted">{v.talle_us}</td>
                    <td className="td-muted">×{v.cantidad}</td>
                    {/* FIX: usa clase .td-precio del CSS en lugar de inline styles */}
                    <td className="td-precio">{formatPrice(v.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print footer */}
      <div className="print-footer only-print">
        Reporte generado el {new Date().toLocaleDateString('es-AR')} · {labelPeriodo} · Desarrollado por Gerald-Dev
      </div>

    </div>
  );
}