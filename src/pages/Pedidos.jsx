// src/pages/Pedidos.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Search, Package, Truck, CheckCheck,
  Clock, User, ChevronDown, Hash, AlertCircle
} from 'lucide-react';
import '../styles/pedidos.css';

// ── Configuración de estados ──────────────────────────────
const ESTADOS = [
  {
    key:    'Preparación',
    label:  'Preparación',
    Icon:   Clock,
    color:  'warning',
  },
  {
    key:    'Envío',
    label:  'En envío',
    Icon:   Truck,
    color:  'primary',
  },
  {
    key:    'Entregado',
    label:  'Entregado',
    Icon:   CheckCheck,
    color:  'success',
  },
];

const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.key, e]));

const IMG_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' rx='6' fill='%2322262E'/%3E%3Cpath d='M16 44l9-12 7 9 5-7 7 10H16z' fill='%232A303A'/%3E%3Ccircle cx='40' cy='20' r='5' fill='%232A303A'/%3E%3C/svg%3E`;

// ── Helpers ───────────────────────────────────────────────
const parseSheetDate = (val) => {
  if (!val) return '';
  const str = String(val);
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
  if (str.includes('/')) {
    const [datePart] = str.split(',');
    const parts = datePart.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }
  return str;
};

const formatDate = (ymd) => {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const formatPrice = (n) =>
  Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// ─────────────────────────────────────────────────────────

export default function Pedidos() {
  const [ventas, setVentas]       = useState([]);
  const [clientes, setClientes]   = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(null); // id_venta que se está actualizando

  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [toast, setToast]               = useState({ show: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  };

  // ── GET ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_GOOGLE_API_URL);
        const json = await res.json();
        if (json.status === 'success') {
          setVentas([...(json.data.ventas || [])].reverse());
          setClientes(json.data.clientes  || []);
          setProductos(json.data.productos || []);
        } else {
          showToast('error', 'No se pudieron cargar los pedidos.');
        }
      } catch {
        showToast('error', 'Error de conexión al cargar los pedidos.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Cambiar estado de venta ──
  const handleEstadoChange = async (id_venta, nuevoEstado) => {
    setUpdating(id_venta);
    try {
      const res = await fetch(import.meta.env.VITE_GOOGLE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateEstadoVenta',
          data: { id_venta, estado: nuevoEstado }
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        setVentas(prev =>
          prev.map(v => v.id_venta === id_venta ? { ...v, estado: nuevoEstado } : v)
        );
        showToast('success', `Pedido ${id_venta} → ${nuevoEstado}`);
      } else {
        showToast('error', 'No se pudo actualizar: ' + result.message);
      }
    } catch {
      showToast('error', 'Error de conexión al actualizar el estado.');
    } finally {
      setUpdating(null);
    }
  };

  // ── Datos enriquecidos ──
  const pedidosEnriquecidos = useMemo(() => ventas.map(v => ({
    ...v,
    nombreCliente:  clientes.find(c => c.id_cliente  === v.id_cliente)?.nombre  || v.id_cliente,
    nombreProducto: productos.find(p => p.id_producto === v.id_producto)?.nombre || v.id_producto,
    imagen_url:     productos.find(p => p.id_producto === v.id_producto)?.imagen_url || '',
    fechaYMD:       parseSheetDate(v.fecha),
    estadoNorm:     v.estado || 'Preparación',
  })), [ventas, clientes, productos]);

  // ── Filtrado ──
  const pedidosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return pedidosEnriquecidos.filter(p => {
      const matchEstado  = filtroEstado === 'todos' || p.estadoNorm === filtroEstado;
      const matchBusq    = !q
        || p.nombreCliente.toLowerCase().includes(q)
        || p.nombreProducto.toLowerCase().includes(q)
        || p.id_venta.toLowerCase().includes(q);
      return matchEstado && matchBusq;
    });
  }, [pedidosEnriquecidos, filtroEstado, busqueda]);

  // ── Conteos por estado ──
  const conteos = useMemo(() => {
    const out = { todos: pedidosEnriquecidos.length };
    ESTADOS.forEach(e => {
      out[e.key] = pedidosEnriquecidos.filter(p => p.estadoNorm === e.key).length;
    });
    return out;
  }, [pedidosEnriquecidos]);

  return (
    <div className="page-container pedidos-page">

      {/* ── Header ── */}
      <header className="page-header">
        <div>
          <h2>Gestión de Pedidos</h2>
          <p>Seguimiento de estado y despacho de órdenes.</p>
        </div>
        <div className="header-badge">
          <Package size={14} />
          {loading ? '...' : `${conteos.todos} pedidos`}
        </div>
      </header>

      {/* ── Toast ── */}
      {toast.show && (
        <div className={`demo-toast demo-toast--${toast.type}`}>
          {toast.type === 'success' ? '✓' : <AlertCircle size={14} />} {toast.message}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="pedidos-toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar cliente, modelo o ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={filtroEstado === 'todos' ? 'active' : ''}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos <span className="tab-count">{conteos.todos}</span>
          </button>
          {ESTADOS.map(est => {
            const Icon = est.Icon;
            return (
              <button
                key={est.key}
                className={`tab-${est.color} ${filtroEstado === est.key ? 'active' : ''}`}
                onClick={() => setFiltroEstado(filtroEstado === est.key ? 'todos' : est.key)}
              >
                <Icon size={13} />
                {est.label}
                <span className="tab-count">{conteos[est.key] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid de pedidos ── */}
      {loading ? (
        <div className="pedidos-loading">
          <div className="loading-spinner" />
          <span>Cargando pedidos...</span>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="empty-state">
          <Package size={32} strokeWidth={1.2} />
          <strong>Sin pedidos</strong>
          <span>No hay resultados para el filtro actual.</span>
        </div>
      ) : (
        <div className="pedidos-grid">
          {pedidosFiltrados.map((p, i) => {
            const estadoCfg = ESTADO_MAP[p.estadoNorm] || ESTADO_MAP['Preparación'];
            const Icon      = estadoCfg.Icon;
            const isUpdating = updating === p.id_venta;

            return (
              <article
                key={p.id_venta}
                className={`pedido-card estado-border-${estadoCfg.color}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Franja de estado lateral */}
                <div className={`pedido-estado-strip estado-strip-${estadoCfg.color}`}>
                  <Icon size={14} />
                  <span>{estadoCfg.label}</span>
                </div>

                {/* Cuerpo */}
                <div className="pedido-body">

                  {/* Imagen */}
                  <div className="pedido-thumb">
                    <img
                      src={p.imagen_url || IMG_FALLBACK}
                      alt={p.nombreProducto}
                      onError={e => { e.target.src = IMG_FALLBACK; }}
                    />
                  </div>

                  {/* Info principal */}
                  <div className="pedido-info">
                    <p className="pedido-cliente">
                      <User size={13} />
                      {p.nombreCliente}
                    </p>
                    <p className="pedido-producto">{p.nombreProducto}</p>
                    <div className="pedido-meta">
                      <span>Talle {p.talle_us}</span>
                      <span className="meta-dot">·</span>
                      <span>×{p.cantidad}</span>
                      <span className="meta-dot">·</span>
                      <span className="pedido-total">{formatPrice(p.total)}</span>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="pedido-accion">
                    <span className="pedido-fecha">{formatDate(p.fechaYMD)}</span>
                    <div className="pedido-id">
                      <Hash size={10} />
                      {p.id_venta}
                    </div>
                    <div className={`select-wrapper ${isUpdating ? 'select-updating' : ''}`}>
                      <select
                        className={`status-select estado-select-${estadoCfg.color}`}
                        value={p.estadoNorm}
                        onChange={e => handleEstadoChange(p.id_venta, e.target.value)}
                        disabled={isUpdating}
                      >
                        {ESTADOS.map(e => (
                          <option key={e.key} value={e.key}>{e.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="select-arrow" />
                    </div>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}