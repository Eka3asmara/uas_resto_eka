import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import Pesanan from "./pages/Pesanan";
import Pembayaran from "./pages/Pembayaran";
import Layout from "./components/Layout";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Publik: Login */}
        <Route path="/" element={<Login />} />

        {/* Route Terproteksi: Harus Login */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/menu"
          element={
            <PrivateRoute>
              <Layout>
                <Menu />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/pesanan"
          element={
            <PrivateRoute>
              <Layout>
                <Pesanan />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/pembayaran"
          element={
            <PrivateRoute>
              <Layout>
                <Pembayaran />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Redirect jika route tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
