import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  CreditCard,
  LogOut,
} from "lucide-react";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    { path: "/menu", label: "Menu", icon: <Utensils size={20} /> },
    { path: "/pesanan", label: "Pesanan", icon: <ClipboardList size={20} /> },
    {
      path: "/pembayaran",
      label: "Pembayaran",
      icon: <CreditCard size={20} />,
    },
  ];

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white font-sans">
      <aside className="w-72 bg-[#1a1a1a] flex flex-col border-r border-gray-800 flex-shrink-0">
        <div className="p-8">
          <h2 className="text-2xl font-black tracking-tighter italic">
            EKA <span className="text-yellow-500">RESTO</span>
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
                location.pathname === item.path
                  ? "bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20"
                  : "text-gray-400 hover:bg-[#262626] hover:text-white"
              }`}
            >
              <span className="mr-4">{item.icon}</span>
              <span className="font-semibold tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold tracking-widest text-xs uppercase"
          >
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0f0f0f] p-10 custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
