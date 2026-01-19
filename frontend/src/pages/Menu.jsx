import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import {
  Edit3,
  Trash2,
  Plus,
  Save,
  UtensilsCrossed,
  ChevronDown,
} from "lucide-react";

export default function Menu() {
  const [menus, setMenus] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    nama_menu: "",
    harga: "",
    kategori: "makanan",
  });

  const swalDark = {
    background: "#1a1a1a",
    color: "#fff",
    confirmButtonColor: "#fbbf24",
  };

  const fetchMenu = async () => {
    try {
      const res = await api.get("/menu");
      setMenus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/menu/${editId}`, form);
        Swal.fire({
          ...swalDark,
          title: "Diperbarui!",
          text: "Menu berhasil diupdate",
          icon: "success",
        });
      } else {
        await api.post("/menu", form);
        Swal.fire({
          ...swalDark,
          title: "Berhasil!",
          text: "Menu baru telah ditambahkan",
          icon: "success",
        });
      }
      setForm({ nama_menu: "", harga: "", kategori: "makanan" });
      setIsEdit(false);
      fetchMenu();
    } catch (err) {
      Swal.fire({
        ...swalDark,
        title: "Gagal!",
        text: "Terjadi kesalahan sistem",
        icon: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      ...swalDark,
      title: "Hapus Menu?",
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      cancelButtonColor: "#3f3f46",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/menu/${id}`);
        fetchMenu();
        Swal.fire({ ...swalDark, title: "Terhapus!", icon: "success" });
      } catch (err) {
        Swal.fire({ ...swalDark, title: "Gagal!", icon: "error" });
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-4">
        <div className="bg-yellow-500 p-3 rounded-2xl text-black">
          <UtensilsCrossed size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            Kelola Menu
          </h1>
          <p className="text-gray-500 text-xs tracking-[0.2em]">
            PENGATURAN DAFTAR MAKANAN & MINUMAN
          </p>
        </div>
      </div>

      <div
        className={`bg-[#1a1a1a] p-6 rounded-3xl border-2 transition-all duration-500 ${isEdit ? "border-yellow-500 shadow-[0_0_20px_rgba(251,191,36,0.1)]" : "border-gray-800"}`}
      >
        <h2 className="text-yellow-500 font-bold text-sm mb-4 flex items-center gap-2">
          {isEdit ? "MODE EDIT MENU" : "TAMBAH MENU BARU"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-4"
        >
          <input
            className="bg-[#262626] border border-gray-700 text-white p-3 flex-1 rounded-xl focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600"
            placeholder="Nama Menu (Contoh: Nasi Goreng)"
            value={form.nama_menu}
            onChange={(e) => setForm({ ...form, nama_menu: e.target.value })}
            required
          />
          <div className="relative group flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none border-r border-gray-700 my-2 px-3">
              <span className="text-yellow-500 font-black text-xs  tracking-tighter">
                RP
              </span>
            </div>
            <input
              className="bg-[#262626] border border-gray-700 text-white p-3 pl-16 w-full md:w-48 rounded-xl focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 font-mono font-bold"
              type="number"
              placeholder="0"
              value={form.harga}
              onChange={(e) => setForm({ ...form, harga: e.target.value })}
              required
            />
          </div>

          <div className="relative">
            <select
              className="bg-[#262626] border border-gray-700 text-white p-3 pr-10 rounded-xl focus:border-yellow-500 outline-none transition-all cursor-pointer appearance-none w-full md:w-40"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
            >
              <option value="makanan">Makanan</option>
              <option value="minuman">Minuman</option>
            </select>
            <ChevronDown
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          <button
            type="submit"
            className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              isEdit
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
            }`}
          >
            {isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? "Update" : "Simpan"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                setIsEdit(false);
                setForm({ nama_menu: "", harga: "", kategori: "makanan" });
              }}
              className="px-6 py-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 font-bold uppercase text-xs"
            >
              Batal
            </button>
          )}
        </form>
      </div>

      <div className="bg-[#1a1a1a] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#262626] text-yellow-500 text-[10px] uppercase tracking-[0.2em] font-black">
              <th className="p-5 border-b border-gray-800">Detail Menu</th>
              <th className="p-5 border-b border-gray-800">Kategori</th>
              <th className="p-5 border-b border-gray-800 text-right">
                Harga Jual
              </th>
              <th className="p-5 border-b border-gray-800 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {menus.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-white/5 transition-colors group"
              >
                <td className="p-5">
                  <div className="font-bold text-white group-hover:text-yellow-500 transition-colors">
                    {m.nama_menu}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-tighter">
                    ID: #{m.id}
                  </div>
                </td>
                <td className="p-5">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      m.kategori === "makanan"
                        ? "border-orange-500/30 text-orange-500 bg-orange-500/5"
                        : "border-blue-500/30 text-blue-500 bg-blue-500/5"
                    }`}
                  >
                    {m.kategori}
                  </span>
                </td>
                <td className="p-5 text-right font-black text-white italic tracking-tighter">
                  Rp {parseInt(m.harga).toLocaleString("id-ID")}
                </td>
                <td className="p-5">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setIsEdit(true);
                        setEditId(m.id);
                        setForm({
                          nama_menu: m.nama_menu,
                          harga: m.harga,
                          kategori: m.kategori,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-2 bg-[#262626] text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-all shadow-lg"
                      title="Edit Menu"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 bg-[#262626] text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg"
                      title="Hapus Menu"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
