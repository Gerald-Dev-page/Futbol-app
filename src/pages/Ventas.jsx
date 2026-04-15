// src/pages/Ventas.jsx
import { useState, useEffect } from "react";
import {
  ShoppingCart, User, Package,
  Clock, TrendingUp, DollarSign,
  Truck
} from "lucide-react";
import { fetchAppData, insertRecord } from "../services/api";
import "../styles/ventas.css";

const formatPrice = (n) =>
  Number(n).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

export default function Ventas() {
  const [clientes, setClientes]   = useState([]);
  const [productos, setProductos] = useState([]);
  const [stock, setStock]         = useState([]);
  const [historial, setHistorial] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ show: false, type: "success", message: "" });

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [formData, setFormData] = useState({
    id_cliente:      "",
    id_producto:     "",
    talle_us:        "",
    cantidad:        1,
    tipo_precio:     "precio",
    precio_unitario: 0,
    total:           0,
  });

  // ── Helper toast ──
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: "success", message: "" }), 3500);
  };

  const loadData = async () => {
    try {
      const data = await fetchAppData();
      setClientes(data.clientes || []);
      setProductos(data.productos || []);
      setStock(data.stock || []);
      setHistorial([...(data.ventas || [])].reverse());
    } catch (error) {
      console.error("Error al cargar sistema:", error);
      showToast("error", "Error de conexión al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleClienteBuscador = (e) => {
    const val = e.target.value;
    setBusquedaCliente(val);
    const encontrado = clientes.find(
      (c) => c.nombre.toLowerCase() === val.toLowerCase()
    );
    setFormData((prev) => ({ ...prev, id_cliente: encontrado?.id_cliente || "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = { ...formData, [name]: value };

    const prod = productos.find(
      (p) => p.id_producto === (name === "id_producto" ? value : next.id_producto)
    );

    if (prod) {
      if (name === "id_producto" || name === "tipo_precio") {
        // Soporta ambos nombres de columna posibles en Google Sheets
        let claveExcel = "precio";
        if (next.tipo_precio === "precio_transferencia") {
          claveExcel = "precio_transferencia" in prod ? "precio_transferencia" : "precio con transferencia";
        }
        
        next.precio_unitario = Number(prod[claveExcel]) || 0;
        if (name === "id_producto") next.talle_us = "";
      }
    }

    const cant = name === "cantidad" ? parseInt(value) || 0 : next.cantidad;
    next.total = next.precio_unitario * cant;
    setFormData(next);
  };

  const tallesDisponibles = stock
    .filter(
      (s) =>
        s.id_producto &&
        String(s.id_producto).trim() === String(formData.id_producto).trim() &&
        parseInt(s.cantidad, 10) > 0
    )
    .sort((a, b) => parseFloat(a.talle_us) - parseFloat(b.talle_us));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id_cliente || !formData.id_producto || !formData.talle_us || formData.cantidad <= 0) {
      showToast("error", "Por favor completá todos los campos antes de confirmar.");
      return;
    }

    const stockActual =
      tallesDisponibles.find(
        (s) => String(s.talle_us).trim() === String(formData.talle_us).trim()
      )?.cantidad || 0;

    if (formData.cantidad > parseInt(stockActual, 10)) {
      showToast("error", `Stock insuficiente. Solo hay ${stockActual} pares disponibles.`);
      return;
    }

    setSaving(true);
    const id_venta   = `VTA-${Date.now()}`;
    const ahora      = new Date();
    const fechaLimpia = `${String(ahora.getDate()).padStart(2, "0")}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${ahora.getFullYear()}`;

    const nuevaVenta = {
      id_venta,
      fecha:           fechaLimpia,
      id_cliente:      formData.id_cliente,
      id_producto:     formData.id_producto,
      talle_us:        formData.talle_us,
      cantidad:        formData.cantidad,
      precio_unitario: formData.precio_unitario,
      total:           formData.total,
      estado:          "Preparación",
    };

    try {
      await insertRecord("insertVenta", nuevaVenta);
      await insertRecord("upsertStock", {
        id_producto: formData.id_producto,
        talle_us:    formData.talle_us,
        cantidad:    -Math.abs(formData.cantidad),
      });

      setHistorial([nuevaVenta, ...historial]);
      setFormData((prev) => ({
        ...prev,
        id_producto:     "",
        talle_us:        "",
        cantidad:        1,
        precio_unitario: 0,
        total:           0,
      }));
      showToast("success", "Venta registrada exitosamente. Pedido en Preparación.");
    } catch (error) {
      console.error("Error al registrar venta:", error);
      showToast("error", "Hubo un error al registrar la venta. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const totalHistorico = historial.reduce((a, v) => a + (parseFloat(v.total) || 0), 0);

  if (loading) return (
    <div className="ventas-loading">
      <div className="loading-spinner" />
      <span>Cargando catálogo...</span>
    </div>
  );

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <header className="page-header">
        <div>
          <h2>Punto de Venta</h2>
          <p>Registrar transacciones y enviar a preparación.</p>
        </div>
        <div className="header-badge">
          <TrendingUp size={14} />
          {formatPrice(totalHistorico)} facturados
        </div>
      </header>

      {/* ── Toast ── */}
      {toast.show && (
        <div className={`demo-toast demo-toast--${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.message}
        </div>
      )}

      {/* ── Formulario ── */}
      <div className="card ventas-form">
        <div className="form-group">
          <label><User size={13} /> Cliente</label>
          <input
            list="lista-clientes"
            placeholder="Buscar por nombre..."
            value={busquedaCliente}
            onChange={handleClienteBuscador}
            autoComplete="off"
          />
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.nombre} />
            ))}
          </datalist>
          {busquedaCliente && !formData.id_cliente && (
            <small className="field-hint error">Cliente no encontrado. Debe registrarlo en la pestaña Clientes.</small>
          )}
          {formData.id_cliente && (
            <small className="field-hint success">✓ Cliente ID: {formData.id_cliente} vinculado</small>
          )}
        </div>

        <div className="ventas-row">
          <div className="form-group venta-col-producto">
            <label><Package size={13} /> Botín</label>
            <select name="id_producto" value={formData.id_producto} onChange={handleChange} required>
              <option value="">— Seleccione —</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} ({p.marca})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group venta-col-pago">
            <label><DollarSign size={13} /> Tipo de Pago</label>
            <select
              name="tipo_precio"
              value={formData.tipo_precio}
              onChange={handleChange}
              disabled={!formData.id_producto}
            >
              <option value="precio">Precio Lista</option>
              <option value="precio_transferencia">Transferencia</option>
            </select>
          </div>

          <div className="form-group venta-col-talle">
            <label>Talle (US)</label>
            <select
              name="talle_us"
              value={formData.talle_us}
              onChange={handleChange}
              required
              disabled={!formData.id_producto}
            >
              <option value="">Talle</option>
              {tallesDisponibles.map((s) => (
                <option key={`${s.id_producto}-${s.talle_us}`} value={s.talle_us}>
                  {s.talle_us} (Disp: {s.cantidad})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group venta-col-cantidad">
            <label>Pares</label>
            <input
              type="number"
              name="cantidad"
              min="1"
              value={formData.cantidad}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-summary">
          <div className="summary-item">
            <span>Unitario ({formData.tipo_precio === "precio" ? "Lista" : "Transferencia"})</span>
            <strong>{formatPrice(formData.precio_unitario)}</strong>
          </div>
          <div className="summary-item highlight">
            <span>Total a cobrar</span>
            <strong>{formatPrice(formData.total)}</strong>
          </div>
        </div>

        <button
          className="btn-primary btn-full"
          onClick={handleSubmit}
          disabled={saving || !formData.id_cliente || !formData.id_producto || !formData.talle_us}
        >
          {saving
            ? <><span className="btn-spinner" /> Procesando...</>
            : <><ShoppingCart size={16} /> Confirmar Venta</>
          }
        </button>
      </div>

      {/* ── Historial de ventas ── */}
      <div className="card table-card ventas-table-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="table-title">
          <Clock size={16} /> Registro de Ventas
          <span className="table-count">{historial.length} registros</span>
        </h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Botín</th>
                <th>Talle</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                    No hay ventas registradas.
                  </td>
                </tr>
              ) : historial.map((v) => {
                const esEnvio = v.estado === "Envío";
                return (
                  <tr key={v.id_venta}>
                    <td className="td-muted td-fecha">{v.fecha}</td>
                    <td className="td-nombre">
                      {clientes.find((c) => c.id_cliente === v.id_cliente)?.nombre || v.id_cliente}
                    </td>
                    <td className="td-muted">
                      {productos.find((p) => p.id_producto === v.id_producto)?.nombre || v.id_producto}
                    </td>
                    <td><strong>{v.talle_us}</strong></td>
                    <td className="td-muted">×{v.cantidad}</td>
                    <td className="td-precio text-highlight">{formatPrice(v.total)}</td>
                    <td>
                      <span className={`estado-venta-badge ${esEnvio ? "estado-enviado" : "estado-preparacion"}`}>
                        {esEnvio ? <Truck size={12} /> : <Package size={12} />}
                        {v.estado || "Preparación"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer con total histórico */}
        <div className="table-footer">
          <span>Total acumulado en historial</span>
          <span className="total-dia">{formatPrice(totalHistorico)}</span>
        </div>
      </div>

    </div>
  );
}