// src/pages/Clientes.jsx
import { useState, useEffect } from 'react';
import { Users, MapPin, Phone, PlusCircle, AlertCircle } from 'lucide-react';
import '../styles/clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', direccion: '', telefono: '' });
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });
  const [telefonoError, setTelefonoError] = useState('');

  // ── GET: Cargar clientes desde Google Sheets ──
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL);
        const json = await response.json();
        if (json.status === 'success') {
          setClientes((json.data.clientes || []).reverse());
        } else {
          showToast('error', 'No se pudieron cargar los clientes.');
        }
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        showToast('error', 'Error de conexión al cargar los clientes.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientes();
  }, []);

  // ── Helper: mostrar toast ──
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3500);
  };

  // ── Validación de teléfono ──
  const validarTelefono = (valor) => {
    const soloNumeros = /^[0-9+\-\s()]{7,20}$/;
    if (!soloNumeros.test(valor)) {
      setTelefonoError('Ingresá solo números (mínimo 7 dígitos).');
      return false;
    }
    setTelefonoError('');
    return true;
  };

  const handleTelefonoChange = (e) => {
    const valor = e.target.value;
    setFormData({ ...formData, telefono: valor });
    if (valor) validarTelefono(valor);
  };

  // ── POST: Enviar nuevo cliente a Google Sheets ──
  // NOTA: el ID se genera en el backend (Apps Script) para evitar duplicados.
  // Apps Script debe calcular el ID basándose en el conteo real de filas en Sheets.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarTelefono(formData.telefono)) return;

    setIsSubmitting(true);

    const nuevoCliente = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      telefono: formData.telefono
    };

    try {
      const response = await fetch(import.meta.env.VITE_GOOGLE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'insertCliente',
          data: nuevoCliente
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Usamos el ID devuelto por el backend si está disponible,
        // o un placeholder temporal hasta el próximo fetch.
        const clienteConId = {
          ...nuevoCliente,
          id_cliente: result.id_cliente || '...'
        };
        setClientes([clienteConId, ...clientes]);
        setFormData({ nombre: '', direccion: '', telefono: '' });
        showToast('success', 'Cliente registrado exitosamente en la base de datos.');
      } else {
        showToast('error', 'Error al guardar: ' + result.message);
      }
    } catch (error) {
      console.error('Error en el POST:', error);
      showToast('error', 'Error de conexión al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <header className="page-header">
        <div>
          <h2>Gestión de Clientes</h2>
          <p>Visualizá y administrá la cartera de clientes asociados a tus ventas.</p>
        </div>
        <div className="header-badge">
          <Users size={14} />
          {isLoading ? 'Cargando...' : `${clientes.length} clientes`}
        </div>
      </header>

      {/* ── Toast de feedback (éxito y error) ── */}
      {toast.show && (
        <div className={`demo-toast demo-toast--${toast.type}`}>
          {toast.type === 'error' && <AlertCircle size={15} />}
          {toast.type === 'success' && '✓'} {toast.message}
        </div>
      )}

      {/* ── Formulario ── */}
      <div className="form-card">
        <h3 className="form-title">
          <PlusCircle size={18} />
          Registrar Nuevo Cliente
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre Completo o Razón Social</label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez / Club Atlético S.A."
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                placeholder="Ej: Calle Falsa 123"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono de Contacto</label>
              <input
                type="tel"
                placeholder="Ej: 2664123456"
                value={formData.telefono}
                onChange={handleTelefonoChange}
                className={telefonoError ? 'input-error' : ''}
                required
              />
              {telefonoError && (
                <span className="field-error">{telefonoError}</span>
              )}
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting || !!telefonoError}>
            <PlusCircle size={16} />
            {isSubmitting ? 'Registrando...' : 'Registrar Cliente'}
          </button>
        </form>
      </div>

      {/* ── Tabla de clientes ── */}
      <div className="card table-card">
        <h3 className="table-title">Clientes Registrados</h3>
        <div className="table-wrapper">
          {isLoading ? (
            <p style={{ padding: '20px', textAlign: 'center' }}>Cargando directorio...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre / Razón Social</th>
                  <th><MapPin size={13} /> Dirección</th>
                  <th><Phone size={13} /> Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                      No hay clientes registrados.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c, index) => (
                    <tr key={c.id_cliente || index}>
                      <td><span className="id-badge">{c.id_cliente}</span></td>
                      <td className="td-nombre"><strong>{c.nombre}</strong></td>
                      <td className="td-muted">{c.direccion}</td>
                      <td className="td-muted">{c.telefono}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}