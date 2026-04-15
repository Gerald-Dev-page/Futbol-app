// src/pages/Productos.jsx
import { useState, useEffect } from 'react';
import { Package, PlusCircle, LayoutGrid, DollarSign } from 'lucide-react';
import '../styles/clientes.css'; 

const MARCAS_CONFIG = {
  'Adidas':      { color: '#2b5897', bg: 'rgba(31,41,55,0.15)'   },
  'Nike':        { color: '#E5E7EB', bg: 'rgba(229,231,235,0.1)' },
  'Puma':        { color: '#FCA5A5', bg: 'rgba(153,27,27,0.15)'  },
  'Mizuno':      { color: '#93C5FD', bg: 'rgba(30,58,138,0.15)'  },
  'New Balance': { color: '#6EE7B7', bg: 'rgba(6,95,70,0.15)'    },
};

const IMG_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='4' fill='%2322262E'/%3E%3Cpath d='M10 26l5-7 4 5 3-4 4 6H10z' fill='%232A303A'/%3E%3Ccircle cx='24' cy='13' r='3' fill='%232A303A'/%3E%3C/svg%3E`;

const formatPrice = (n) =>
  Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function Productos() {
  const [productos, setProductos]   = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData]     = useState({
    nombre: '', marca: 'Adidas', precio: '', precio_transferencia: '', imagen_url: ''
  });
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL);
        const json = await response.json();
        if (json.status === 'success') {
          setProductos(json.data.productos || []);
        } else {
          showToast('error', 'No se pudieron cargar los productos.');
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
        showToast('error', 'Error de conexión al cargar productos.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductos();
  }, []);

  const activos      = productos.length;
  const promedio     = activos > 0 ? Math.round(productos.reduce((a, p) => a + Number(p.precio), 0) / activos) : 0;
  const marcasUnicas = [...new Set(productos.map(p => p.marca))].length;

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // FIX: Generamos el ID del producto localmente para enviarlo al backend
    const nuevoId = `BOT-${String(productos.length + 1).padStart(3, '0')}`;

    const nuevoProducto = {
      id_producto:          nuevoId,
      nombre:               formData.nombre,
      marca:                formData.marca,
      precio:               parseFloat(formData.precio),
      precio_transferencia: parseFloat(formData.precio_transferencia),
      imagen_url:           formData.imagen_url,
    };

    try {
      const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'insertProducto', data: nuevoProducto })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setProductos([nuevoProducto, ...productos]);
        setFormData({ nombre: '', marca: 'Adidas', precio: '', precio_transferencia: '', imagen_url: '' });
        showToast('success', 'Producto guardado exitosamente.');
      } else {
        showToast('error', 'Error al guardar: ' + result.message);
      }
    } catch (error) {
      console.error('Error en el POST:', error);
      showToast('error', 'Error de conexión al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h2>Catálogo de Botines</h2>
          <p>Administrá los modelos, marcas y precios del sistema.</p>
        </div>
        <div className="header-badge">
          <Package size={14} />
          {isLoading ? 'Cargando...' : `${activos} modelos`}
        </div>
      </header>

      {toast.show && (
        <div className={`demo-toast demo-toast--${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon stat-icon-blue"><Package size={18} /></span>
          <div>
            <p className="stat-label">Modelos Registrados</p>
            <p className="stat-value">{isLoading ? '—' : activos}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon-green"><DollarSign size={18} /></span>
          <div>
            <p className="stat-label">Precio Promedio</p>
            <p className="stat-value">{isLoading ? '—' : formatPrice(promedio)}</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon stat-icon-amber"><LayoutGrid size={18} /></span>
          <div>
            <p className="stat-label">Marcas</p>
            <p className="stat-value">{isLoading ? '—' : marcasUnicas}</p>
          </div>
        </div>
      </div>

      <div className="form-card">
        <h3 className="form-title">
          <PlusCircle size={18} /> Registrar Nuevo Botín
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre del Modelo</label>
            <input
              type="text"
              placeholder="Ej: Predator Elite"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label>Marca</label>
              <select
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              >
                <option value="Adidas">Adidas</option>
                <option value="Nike">Nike</option>
                <option value="Puma">Puma</option>
                <option value="Mizuno">Mizuno</option>
                <option value="New Balance">New Balance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Precio Lista</label>
              <input
                type="number"
                step="0.01" min="0"
                placeholder="Ej: 85000"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Precio Transferencia</label>
              <input
                type="number"
                step="0.01" min="0"
                placeholder="Ej: 78000"
                value={formData.precio_transferencia}
                onChange={(e) => setFormData({ ...formData, precio_transferencia: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>URL de la Imagen</label>
            <input
              type="url"
              placeholder="Ej: https://acdn-us.mitiendanube.com/.../imagen.webp"
              value={formData.imagen_url}
              onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            <PlusCircle size={16} />
            {isSubmitting ? 'Guardando...' : 'Registrar Modelo'}
          </button>
        </form>
      </div>

      <div className="card table-card">
        <h3 className="table-title">Catálogo Actual</h3>
        <div className="table-wrapper">
          {isLoading ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>Cargando base de datos...</p>
          ) : productos.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>No hay productos registrados.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Lista</th>
                  <th>Transferencia</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, index) => {
                  const cfg = MARCAS_CONFIG[p.marca] || MARCAS_CONFIG['Adidas'];
                  return (
                    <tr key={p.id_producto || index}>
                      <td>
                        <img
                          src={p.imagen_url || IMG_FALLBACK}
                          alt={p.nombre}
                          className="producto-img"
                          style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'var(--color-bg-main)', borderRadius: '6px' }}
                          onError={(e) => { e.target.src = IMG_FALLBACK; }}
                        />
                      </td>
                     
                      <td className="td-nombre"><strong>{p.nombre}</strong></td>
                      <td>
                        <span className="tipo-badge" style={{ color: cfg.color, background: cfg.bg }}>
                          {p.marca}
                        </span>
                      </td>
                      <td className="td-precio">{formatPrice(p.precio)}</td>
                      <td className="td-precio td-precio-transferencia" style={{ color: '#10B981' }}>
                        {formatPrice(p.precio_transferencia)}
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