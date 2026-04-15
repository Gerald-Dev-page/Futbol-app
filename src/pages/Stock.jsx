// src/pages/Stock.jsx
import { useState, useEffect } from 'react';
import {
  Package, AlertTriangle, CheckCircle,
  XCircle, PlusCircle, Image as ImageIcon
} from 'lucide-react';
import '../styles/stock.css';

const getEstado = (cantidad, minimo = 2) => {
  if (cantidad === 0)     return { label: 'Sin stock',  color: 'error',   Icon: XCircle       };
  if (cantidad <= minimo) return { label: 'Stock bajo', color: 'warning', Icon: AlertTriangle };
  return                         { label: 'Normal',     color: 'success', Icon: CheckCircle   };
};

const TALLES_US = ['6.0','6.5','7.0','7.5','8.0','8.5','9.0','9.5','10.0','10.5','11.0','11.5','12.0'];

// FIX: mismo fallback SVG que Productos — sin depender de via.placeholder.com
const IMG_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='4' fill='%2322262E'/%3E%3Cpath d='M10 26l5-7 4 5 3-4 4 6H10z' fill='%232A303A'/%3E%3Ccircle cx='24' cy='13' r='3' fill='%232A303A'/%3E%3C/svg%3E`;

export default function Stock() {
  const [productos, setProductos]     = useState([]);
  const [stock, setStock]             = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast]             = useState({ show: false, type: 'success', message: '' });
  const [filtro, setFiltro]           = useState('todos');

  const [formData, setFormData] = useState({
    id_producto: '',
    talle_us: '9.0',
    cantidad: ''
  });

  // ── Helper toast ──
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  };

  const fetchData = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL);
      const json = await response.json();
      if (json.status === 'success') {
        setProductos(json.data.productos || []);
        setStock(json.data.stock || []);
      } else {
        showToast('error', 'No se pudieron cargar los datos de stock.');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showToast('error', 'Error de conexión al cargar el inventario.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReposicion = async (e) => {
    e.preventDefault();
    if (!formData.id_producto) {
      showToast('error', 'Seleccioná un producto antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'upsertStock',
          data: {
            id_producto: formData.id_producto,
            talle_us:    formData.talle_us,
            cantidad:    parseInt(formData.cantidad, 10)
          }
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        await fetchData();
        setFormData(prev => ({ ...prev, cantidad: '' }));
        showToast('success', 'Stock actualizado correctamente en la base de datos.');
      } else {
        showToast('error', 'Error al actualizar stock: ' + result.message);
      }
    } catch (error) {
      console.error('Error en el POST:', error);
      showToast('error', 'Error de conexión al actualizar el stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Stock enriquecido con datos de producto ──
  const stockEnriquecido = stock.map(item => {
    const prod = productos.find(p => p.id_producto === item.id_producto) || {};
    return {
      ...item,
      nombre:     prod.nombre    || 'Desconocido',
      marca:      prod.marca     || '-',
      imagen_url: prod.imagen_url || ''
    };
  });

  const sinStock        = stockEnriquecido.filter(p => parseInt(p.cantidad) === 0).length;
  const stockBajo       = stockEnriquecido.filter(p => { const c = parseInt(p.cantidad); return c > 0 && c <= 2; }).length;
  const normal          = stockEnriquecido.filter(p => parseInt(p.cantidad) > 2).length;
  const unidadesTotales = stock.reduce((a, p) => a + parseInt(p.cantidad || 0), 0);

  const productosFiltrados = stockEnriquecido.filter(p => {
    const cant = parseInt(p.cantidad);
    if (filtro === 'error')   return cant === 0;
    if (filtro === 'warning') return cant > 0 && cant <= 2;
    if (filtro === 'success') return cant > 2;
    return true;
  });

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <header className="page-header">
        <div>
          <h2>Control de Stock por Talles</h2>
          <p>Monitoreo de inventario e ingreso de mercadería.</p>
        </div>
        <div className="header-badge">
          <Package size={14} />
          {isLoading ? '...' : `${unidadesTotales} pares en total`}
        </div>
      </header>

      {/* ── Toast ── */}
      {toast.show && (
        <div className={`demo-toast demo-toast--${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {/* ── Formulario reposición ── */}
      {/* FIX: marginBottom movido a clase .form-card-stock en el CSS */}
      <div className="form-card form-card-stock">
        <h3 className="form-title">
          <PlusCircle size={18} />
          Ingresar / Reponer Mercadería
        </h3>
        <form onSubmit={handleReposicion}>
          {/* FIX: flex: 2 / flex: 1 reemplazados por clases .form-col-2 y .form-col-1 */}
          <div className="form-row form-row-stock">
            <div className="form-group form-col-2">
              <label>Modelo de Botín</label>
              <select
                value={formData.id_producto}
                onChange={(e) => setFormData({ ...formData, id_producto: e.target.value })}
                required
              >
                <option value="" disabled>Seleccionar modelo...</option>
                {productos.map(p => (
                  <option key={p.id_producto} value={p.id_producto}>
                    {p.nombre} ({p.marca})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group form-col-1">
              <label>Talle (US)</label>
              <select
                value={formData.talle_us}
                onChange={(e) => setFormData({ ...formData, talle_us: e.target.value })}
              >
                {TALLES_US.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group form-col-1">
              <label>Cantidad a sumar</label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 5"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                required
              />
            </div>
          </div>
          <button className="btn-primary" type="submit" disabled={isSubmitting || productos.length === 0}>
            <PlusCircle size={16} />
            {isSubmitting ? 'Procesando...' : 'Actualizar Stock'}
          </button>
        </form>
      </div>

      {/* ── Stat cards filtrables ── */}
      {/* FIX: stat-icon usa clases en lugar de inline styles */}
      <div className="stats-row stock-stats">
        <div
          className={`stat-card stat-clickable ${filtro === 'success' ? 'stat-active-success' : ''}`}
          onClick={() => setFiltro(filtro === 'success' ? 'todos' : 'success')}
        >
          <span className="stat-icon stat-icon-green"><CheckCircle size={18} /></span>
          <div>
            <p className="stat-label">Stock Normal (+2)</p>
            <p className="stat-value">{isLoading ? '—' : normal}</p>
          </div>
        </div>

        <div
          className={`stat-card stat-clickable ${filtro === 'warning' ? 'stat-active-warning' : ''}`}
          onClick={() => setFiltro(filtro === 'warning' ? 'todos' : 'warning')}
        >
          <span className="stat-icon stat-icon-amber"><AlertTriangle size={18} /></span>
          <div>
            <p className="stat-label">Poco Stock (1-2)</p>
            <p className="stat-value">{isLoading ? '—' : stockBajo}</p>
          </div>
        </div>

        <div
          className={`stat-card stat-clickable ${filtro === 'error' ? 'stat-active-error' : ''}`}
          onClick={() => setFiltro(filtro === 'error' ? 'todos' : 'error')}
        >
          <span className="stat-icon stat-icon-red"><XCircle size={18} /></span>
          <div>
            <p className="stat-label">Agotados (0)</p>
            <p className="stat-value">{isLoading ? '—' : sinStock}</p>
          </div>
        </div>
      </div>

      {/* ── Filtro activo label ── */}
      {filtro !== 'todos' && (
        <div className="filtro-activo">
          Mostrando: <strong>
            {filtro === 'error' ? 'Agotados' : filtro === 'warning' ? 'Poco Stock' : 'Stock Normal'}
          </strong>
          <button className="filtro-clear" onClick={() => setFiltro('todos')}>✕ Ver todos</button>
        </div>
      )}

      {/* ── Tabla inventario ── */}
      <div className="card table-card">
        <h3 className="table-title">
          <Package size={16} />
          Inventario Detallado
          <span className="table-count">{productosFiltrados.length} registros</span>
        </h3>
        <div className="table-wrapper">
          {isLoading ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>Cargando inventario...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>ID Stock</th>
                  <th>Modelo</th>
                  <th>Talle (US)</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No hay registros de stock que coincidan.
                    </td>
                  </tr>
                ) : productosFiltrados.map((p, index) => {
                  const cant   = parseInt(p.cantidad);
                  const estado = getEstado(cant);
                  const pct    = Math.min((cant / 10) * 100, 100);

                  return (
                    <tr key={`${p.id_stock || p.id_producto}-${p.talle_us}-${index}`}>
                      <td>
                        {/* FIX: fallback SVG inline, sin via.placeholder.com */}
                        <img
                          src={p.imagen_url || IMG_FALLBACK}
                          alt={p.nombre}
                          className="producto-img"
                          onError={(e) => { e.target.src = IMG_FALLBACK; }}
                        />
                      </td>
                      <td><span className="id-badge">{p.id_stock || '—'}</span></td>
                      <td className="td-nombre">
                        <strong>{p.nombre}</strong>
                        {/* FIX: color de marca usa variable CSS, no #666 hardcodeado */}
                        <span className="td-submarca">{p.marca}</span>
                      </td>
                      {/* FIX: fontSize inline reemplazado por clase .td-talle */}
                      <td className="td-talle"><strong>{p.talle_us}</strong></td>
                      <td>
                        <div className="stock-cell">
                          <span className={`stock-num estado-${estado.color}`}>{cant}</span>
                          <div className="stock-bar-track">
                            <div
                              className={`stock-bar-fill fill-${estado.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`estado-badge-stock color-${estado.color}`}>
                          <estado.Icon size={12} />
                          {estado.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}