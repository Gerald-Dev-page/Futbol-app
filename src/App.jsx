// src/App.jsx
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Ventas from "./pages/Ventas";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Stock  from "./pages/Stock";
import "./styles/global.css";

function App() {
  // Inicializamos la app directamente en el Dashboard
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "ventas":
        return <Ventas />;
      case "pedidos":
        return <Pedidos />;
      case "productos":
        return <Productos />;
      case "clientes":
        return <Clientes />;
      case "stock":
        return <Stock />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="page-container">{renderPage()}</main>
    </div>
  );
}

export default App;
