import '../styles/sidebar.css';
import logo from '../public/Logo.webp'; 
import logoG from '../public/Logo-Gerald.png';
import { 
  LayoutDashboard, 
  ShoppingCart , 
  Package, 
  Users, 
  Truck,
  ClipboardList // Nuevo icono para Pedidos 
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage }) {
  // Se reemplazan los strings de emojis por referencias a los componentes de Lucide
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'ventas', label: 'Ventas', Icon: ShoppingCart  },
    { id: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
    { id: 'productos', label: 'Productos', Icon: Package },
    { id: 'clientes', label: 'Clientes', Icon: Users },
    { id: 'stock', label: 'Stock', Icon: Truck },
  ];

 return (
  <nav className="sidebar">
    <div className="sidebar-logo">
      <img src={logo} alt="Agua Vital" className="nav-logo" />
    </div>

    <ul className="sidebar-menu">
      {menuItems.map((item) => (
        <li
          key={item.id}
          className={currentPage === item.id ? 'active' : ''}
          onClick={() => setCurrentPage(item.id)}
        >
          <span className="menu-icon">
            <item.Icon size={20} strokeWidth={2} />
          </span>
          <span className="menu-label">{item.label}</span>
        </li>
      ))}
    </ul>

    {/* Logo agencia — solo visible en desktop */}
    <div className="sidebar-footer">
      <span className="sidebar-footer-label">Powered by</span>
      <img src={logoG} alt="Gerald Agency" className="agency-logo" />
    </div>
  </nav>
);
}