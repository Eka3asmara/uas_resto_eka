import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import {
  ClipboardList,
  User,
  Plus,
  Trash2,
  ShoppingCart,
  Save,
  XCircle,
  Edit3,
} from "lucide-react";

export default function Pesanan() {
  const [pesanans, setPesanans] = useState([]);
  const [menus, setMenus] = useState([]);
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [keranjang, setKeranjang] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const swalDark = {
    background: "#1a1a1a",
    color: "#fff",
    confirmButtonColor: "#fbbf24",
  };

  const fetchData = async () => {
    try {
      const [resP, resM] = await Promise.all([
        api.get("/pesanan"),
        api.get("/menu"),
      ]);
      setPesanans(resP.data);
      setMenus(resM.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalHarga = keranjang.reduce(
    (sum, item) => sum + parseInt(item.harga),
    0,
  );

  const handleSave = async () => {
    if (!namaPelanggan || keranjang.length === 0) {
      return Swal.fire({
        ...swalDark,
        title: "Data Tidak Lengkap!",
        text: "Isi nama pelanggan dan pilih minimal 1 menu.",
        icon: "warning",
      });
    }

    const detail = keranjang.map((i) => i.nama_menu).join(", ");
    const payload = {
      nama_pelanggan: namaPelanggan,
      total_harga: totalHarga,
      detail_pesanan: detail,
    };

    try {
      if (isEdit) await api.put(`/pesanan/${editId}`, payload);
      else await api.post("/pesanan", payload);

      setNamaPelanggan("");
      setKeranjang([]);
      setIsEdit(false);
      fetchData();
      Swal.fire({
        ...swalDark,
        title: "Berhasil!",
        text: "Pesanan telah disimpan ke sistem.",
        icon: "success",
      });
    } catch (err) {
      Swal.fire({
        ...swalDark,
        title: "Gagal!",
        text: "Terjadi kesalahan saat menyimpan pesanan.",
        icon: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      ...swalDark,
      title: "Hapus Pesanan?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/pesanan/${id}`);
        fetchData();
        Swal.fire({ ...swalDark, title: "Terhapus!", icon: "success" });
      } catch (err) {
        Swal.fire({ ...swalDark, title: "Gagal!", icon: "error" });
      }
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex items-center gap-4">
        <div className="bg-yellow-500 p-3 rounded-2xl text-black shadow-lg shadow-yellow-500/20">
          <ShoppingCart size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            Entry Pesanan
          </h1>
          <p className="text-gray-500 text-xs tracking-[0.2em]">
            KASIR & MANAJEMEN TRANSAKSI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-gray-800 space-y-6">
            <div>
              <label className="block text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2">
                Nama Pelanggan
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3 text-gray-500"
                  size={18}
                />
                <input
                  className="bg-[#262626] border border-gray-700 text-white p-3 pl-10 w-full rounded-xl focus:border-yellow-500 outline-none transition-all"
                  placeholder="Contoh: Budi Santoso"
                  value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                Pilih Menu
              </label>
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <select
                    className="bg-[#262626] border border-gray-700 text-white p-3.5 w-full rounded-2xl focus:border-yellow-500 outline-none cursor-pointer appearance-none transition-all"
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                  >
                    <option value="">-- Lihat Daftar Menu --</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                        {m.nama_menu} - Rp {parseInt(m.harga).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                    </svg>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const m = menus.find((i) => i.id == selectedMenuId);
                    if (m) {
                      setKeranjang([...keranjang, { ...m, uid: Date.now() }]);
                      setSelectedMenuId("");
                    }
                  }}
                  className="bg-yellow-500 text-black h-[52px] w-[52px] rounded-2xl hover:bg-yellow-400 active:scale-90 transition-all flex items-center justify-center shrink-0 shadow-md"
                >
                  <Plus size={32} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="bg-[#0f0f0f] p-5 rounded-2xl border border-gray-800 min-h-[200px] flex flex-col">
              <h3 className="text-white font-bold text-xs uppercase mb-4 flex items-center gap-2">
                <ClipboardList size={14} className="text-yellow-500" /> Item
                Dipilih
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {keranjang.map((i) => (
                  <div
                    key={i.uid}
                    className="flex justify-between items-center group bg-[#1a1a1a] p-3 rounded-lg border border-transparent hover:border-gray-700 transition-all"
                  >
                    <span className="text-gray-300 text-sm">{i.nama_menu}</span>
                    <button
                      onClick={() =>
                        setKeranjang(keranjang.filter((x) => x.uid !== i.uid))
                      }
                      className="text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
                {keranjang.length === 0 && (
                  <div className="text-center py-10 text-gray-700 text-[10px] uppercase font-bold italic">
                    Keranjang Kosong
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-[10px] uppercase font-black">
                    Total Bayar
                  </span>
                  <span className="text-2xl font-black text-yellow-500 italic tracking-tighter">
                    Rp {totalHarga.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
                isEdit
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-yellow-500 text-black hover:bg-yellow-400"
              }`}
            >
              <Save size={20} />
              {isEdit ? "Update Pesanan" : "Proses Pesanan"}
            </button>

            {isEdit && (
              <button
                onClick={() => {
                  setIsEdit(false);
                  setNamaPelanggan("");
                  setKeranjang([]);
                }}
                className="w-full text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Batal Edit
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-[#1a1a1a] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#262626] text-yellow-500 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="p-5 border-b border-gray-800">Pelanggan</th>
                  <th className="p-5 border-b border-gray-800">
                    Detail Pesanan
                  </th>
                  <th className="p-5 border-b border-gray-800 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 text-white">
                {pesanans.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-5">
                      <div className="font-bold uppercase tracking-tight group-hover:text-yellow-500 transition-colors">
                        {p.nama_pelanggan}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1 font-bold italic tracking-tighter">
                        Rp {p.total_harga.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-xs text-gray-400 leading-relaxed max-w-[200px] truncate md:whitespace-normal">
                        {p.detail_pesanan}
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setIsEdit(true);
                            setEditId(p.id);
                            setNamaPelanggan(p.nama_pelanggan);
                            setKeranjang([
                              {
                                nama_menu: p.detail_pesanan,
                                harga: p.total_harga,
                                uid: Date.now(),
                              },
                            ]);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="p-2 bg-[#262626] text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 bg-[#262626] text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pesanans.length === 0 && (
              <div className="p-20 text-center text-gray-600 uppercase tracking-widest text-[10px] font-bold italic">
                Belum ada transaksi hari ini
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
