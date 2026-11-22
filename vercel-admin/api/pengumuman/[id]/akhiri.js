// POST /api/pengumuman/:id/akhiri — akhiri masa tayang, konten masuk arsip.
// tayang -> selesai; disetujui_pada tetap terisi (beda dengan tolak: selesai +
// disetujui_pada kosong = ditolak). Menulis baris ke tabel `arsip` dan ke
// log_aktivitas. Hanya status "tayang" yang bisa diakhiri.
// Tabel: pengumuman, pengurus, arsip, log_aktivitas.
"use strict";

const { supabase, getMasjidId, tulisLog } = require("../../../lib/supabase");
const { ok, gagal, hanyaMethod, tidakKetemu, konflik } = require("../../../lib/http");
const { butuhAuth } = require("../../../lib/auth");
const { hariIniWIB } = require("../../../lib/prayer");

function judulDariIsi(isi) {
  var t = String(isi || "").split("\n")[0].trim();
  if (!t) return "(tanpa judul)";
  return t.length > 200 ? t.slice(0, 200) : t;
}

function tanggalHariIniWIB() {
  const t = hariIniWIB();
  const p = (n) => String(n).padStart(2, "0");
  return t.tahun + "-" + p(t.bulan) + "-" + p(t.hari);
}

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    const saya = butuhAuth(req, res, ["ketua"]);
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const id = req.query && req.query.id;
    if (!id) throw tidakKetemu("ID pengumuman tidak ada");

    const { data: p, error } = await sb
      .from("pengumuman")
      .select("id, isi, jenis, status, masjid_id")
      .eq("id", id)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengumuman tidak ditemukan");
    if (p.status !== "tayang") {
      throw konflik("Hanya pengumuman berstatus tayang yang bisa diakhiri (saat ini: " + p.status + ")");
    }

    const judul = judulDariIsi(p.isi);
    const tanggal = tanggalHariIniWIB();
    const { data: updated, error: updErr } = await sb
      .from("pengumuman")
      .update({ status: "selesai" })
      .eq("id", id)
      .select("id, isi, jenis, status, disetujui_oleh, disetujui_pada, created_at")
      .single();
    if (updErr) throw updErr;

    const { data: arsip, error: arsErr } = await sb
      .from("arsip")
      .insert({ masjid_id: masjidId, jenis: "pengumuman", judul, konten: p.isi, tanggal })
      .select("id, jenis, judul, konten, tanggal, created_at")
      .single();
    if (arsErr) throw arsErr;

    await tulisLog(sb, {
      masjidId,
      pengurusId: saya.id,
      aksi: "Mengakhiri tayang",
      detail:
        "pengumuman:" + id + ' | "' + judul + '" — masa tayang berakhir, masuk arsip',
    });

    ok(res, { pengumuman: updated, arsip });
  } catch (err) {
    gagal(res, err);
  }
};
