import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import {
  Banknote,
  CreditCard,
  CheckCircle,
  Clock,
  ChevronRight,
  Save,
  X,
  Wallet,
} from "lucide-react";

export default function Pembayaran() {
  const [data, setData] = useState([]);
  const [editId, setEditId] = useState(null);
  const [selectedName, setSelectedName] = useState(""); // Untuk info di form edit
  const [form, setForm] = useState({ metode: "cash", status: "pending" });

  const swalDark = {
    background: "#1a1a1a",
    color: "#fff",
    confirmButtonColor: "#fbbf24",
  };

  const fetchBayar = async () => {
    try {
      const res = await api.get("/pembayaran");
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBayar();
  }, []);

  const handleUpdate = async () => {
    try {
      await api.put(`/pembayaran/${editId}`, form);
      setEditId(null);
      fetchBayar();
      Swal.fire({
        ...swalDark,
        title: "Transaksi Berhasil!",
        text: `Pembayaran untuk ${selectedName} telah diperbarui.`,
        icon: "success",
      });
    } catch (err) {
      Swal.fire({ ...swalDark, title: "Gagal Update", icon: "error" });
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn text-white">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-500 p-3 rounded-2xl text-black shadow-lg shadow-yellow-500/20">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">
              Kasir & Pembayaran
            </h1>
            <p className="text-gray-500 text-xs tracking-[0.2em]">
              KELOLA STATUS TRANSAKSI PELANGGAN
            </p>
          </div>
        </div>
      </div>

      {editId && (
        <div className="bg-[#1a1a1a] p-8 rounded-3xl border-2 border-yellow-500 shadow-[0_0_30px_rgba(251,191,36,0.1)] animate-bounce-short">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
              <ChevronRight className="text-yellow-500" /> Proses Pembayaran:{" "}
              <span className="text-yellow-500">{selectedName}</span>
            </h2>
            <button
              onClick={() => setEditId(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Metode Pembayaran
              </label>
              <div className="relative">
                <CreditCard
                  className="absolute left-3 top-3.5 text-yellow-500"
                  size={18}
                />
                <select
                  className="w-full bg-[#262626] border border-gray-700 p-3 pl-10 rounded-xl focus:border-yellow-500 outline-none transition-all cursor-pointer"
                  value={form.metode}
                  onChange={(e) => setForm({ ...form, metode: e.target.value })}
                >
                  <option value="cash">CASH / TUNAI</option>
                  <option value="qris">QRIS / TRANSFER</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Status Tagihan
              </label>
              <div className="relative">
                <CheckCircle
                  className="absolute left-3 top-3.5 text-yellow-500"
                  size={18}
                />
                <select
                  className="w-full bg-[#262626] border border-gray-700 p-3 pl-10 rounded-xl focus:border-yellow-500 outline-none transition-all cursor-pointer"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pending">PENDING (BELUM BAYAR)</option>
                  <option value="lunas">LUNAS (SUDAH BAYAR)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-yellow-500 text-black font-black py-3.5 rounded-xl uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#262626] text-yellow-500 text-[10px] uppercase tracking-[0.2em] font-black">
              <th className="p-6 border-b border-gray-800">Pelanggan</th>
              <th className="p-6 border-b border-gray-800 text-center">
                Metode
              </th>
              <th className="p-6 border-b border-gray-800 text-right">
                Total Tagihan
              </th>
              <th className="p-6 border-b border-gray-800 text-center">
                Status
              </th>
              <th className="p-6 border-b border-gray-800 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.map((p) => (
              <tr
                key={p.id}
                className={`group transition-all ${
                  p.status === "lunas"
                    ? "hover:bg-green-500/5"
                    : "hover:bg-red-500/5"
                }`}
              >
                <td className="p-6">
                  <div className="font-bold text-white group-hover:text-yellow-500 transition-colors uppercase tracking-tight">
                    {p.nama_pelanggan}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1 font-bold">
                    TRANSAKSI #{p.id}
                  </div>
                </td>
                <td className="p-6 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-[#262626] px-3 py-1 rounded-full border border-gray-700">
                    {p.metode}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="text-xl font-black italic text-white tracking-tighter">
                    Rp {parseInt(p.total_harga).toLocaleString("id-ID")}
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex justify-center">
                    <span
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                        p.status === "lunas"
                          ? "bg-white text-black border-white"
                          : "bg-transparent text-yellow-500 border-yellow-500/50 animate-pulse"
                      }`}
                    >
                      {p.status === "lunas" ? (
                        <CheckCircle size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {p.status}
                    </span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setEditId(p.id);
                        setSelectedName(p.nama_pelanggan);
                        setForm({ metode: p.metode, status: p.status });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="bg-[#262626] text-yellow-500 border border-gray-700 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all shadow-xl"
                    >
                      Proses
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-20 text-center text-gray-600 uppercase tracking-widest text-xs font-bold italic">
            Belum ada data pembayaran
          </div>
        )}
      </div>
    </div>
  );
}
