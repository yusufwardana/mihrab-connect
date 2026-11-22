// POST /api/pengumuman/:id/:aksi — SATU function dispatcher untuk
// ketiga aksi persetujuan ketua: setujui, tolak, akhiri.
// Alasan penggabungan: paket Hobby Vercel membatasi 12 Serverless
// Functions per deployment; tiga file terpisah (setujui.js, tolak.js,
// akhiri.js) membuat deploy gagal (exceeded_serverless_functions_per_deployment).
// Vercel menghitung SEMUA file .js di bawah api/ sebagai function,
// walau tidak di-route — jadi file-file lama DIHAPUS, bukan dibiarkan.
//
// URL yang dipanggil frontend TIDAK berubah: rewrite di vercel.json
// memetakan /api/pengumuman/:id/:aksi ->
// /api/pengumuman/:id/aksi?aksi=:aksi, dan dispatcher ini membaca aksi
// dari query `aksi` dan id pengumuman dari path (req.query.id).
// Setiap aksi mempertahankan validasi, status HTTP, pesan error, dan
// penulisan log/arsip yang sama persis seperti file asalnya.
// Hanya ketua yang boleh (403 bila peran lain, 401 tanpa sesi).
// Aksi yang tidak dikenal -> 404.
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

// POST /api/pengumuman/:id/setujui — persetujuan ketua.
// menunggu -> tayang, disetujui_oleh = pengurus peran ketua, disetujui_pada = now.
// Menulis baris ke log_aktivitas. Hanya status "menunggu" yang bisa disetujui.
async function aksiSetujui(req, res) {
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
    if (p.status !== "menunggu") {
      throw konflik("Hanya pengumuman berstatus menunggu yang bisa disetujui (saat ini: " + p.status + ")");
    }

    const sekarang = new Date().toISOString();
    const { data: updated, error: updErr } = await sb
      .from("pengumuman")
      .update({ status: "tayang", disetujui_oleh: saya.id, disetujui_pada: sekarang })
      .eq("id", id)
      .select("id, isi, jenis, status, disetujui_oleh, disetujui_pada, created_at")
      .single();
    if (updErr) throw updErr;

    await tulisLog(sb, {
      masjidId,
      pengurusId: saya.id,
      aksi: "Menyetujui kiriman",
      detail:
        "pengumuman:" + id + " | " + (p.jenis || "pengumuman") + ': "' +
        (p.isi || "").slice(0, 120) + '" — kini tayang di Board',
    });

    ok(res, { pengumuman: updated });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/pengumuman/:id/tolak — penolakan ketua.
// CATATAN SKEMA: kolom status pengumuman hanya mengizinkan
// draft|menunggu|tayang|selesai (check constraint di supabase-schema.sql),
// jadi tidak ada nilai "ditolak" di database. Penolakan dicatat sebagai
// status "selesai" (terminal, tidak pernah tayang) + baris log_aktivitas
// "Menolak kiriman". Frontend membedakan: selesai + disetujui_pada kosong
// berarti ditolak; selesai + disetujui_pada terisi berarti masa tayang habis.
// Bila nanti ingin status "ditolak" yang eksplisit, perlu migrasi:
//   alter table pengumuman drop constraint pengumuman_status_check;
//   alter table pengumuman add constraint pengumuman_status_check
//     check (status in ('draft','menunggu','tayang','selesai','ditolak'));
// Tabel: pengumuman, pengurus, log_aktivitas.
async function aksiTolak(req, res) {
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
    if (p.status !== "menunggu") {
      throw konflik("Hanya pengumuman berstatus menunggu yang bisa ditolak (saat ini: " + p.status + ")");
    }

    const { data: updated, error: updErr } = await sb
      .from("pengumuman")
      .update({ status: "selesai" })
      .eq("id", id)
      .select("id, isi, jenis, status, disetujui_oleh, disetujui_pada, created_at")
      .single();
    if (updErr) throw updErr;

    await tulisLog(sb, {
      masjidId,
      pengurusId: saya.id,
      aksi: "Menolak kiriman",
      detail:
        "pengumuman:" + id + " | " + (p.jenis || "pengumuman") + ': "' +
        (p.isi || "").slice(0, 120) + '" — ditolak ketua, tidak tayang',
    });

    ok(res, { pengumuman: updated });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/pengumuman/:id/akhiri — akhiri masa tayang, konten masuk arsip.
// tayang -> selesai; disetujui_pada tetap terisi (beda dengan tolak: selesai +
// disetujui_pada kosong = ditolak). Menulis baris ke tabel `arsip` dan ke
// log_aktivitas. Hanya status "tayang" yang bisa diakhiri.
async function aksiAkhiri(req, res) {
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
}

module.exports = async (req, res) => {
  try {
    const aksi = req.query && req.query.aksi;
    if (aksi === "setujui") return aksiSetujui(req, res);
    if (aksi === "tolak") return aksiTolak(req, res);
    if (aksi === "akhiri") return aksiAkhiri(req, res);
    throw tidakKetemu("Aksi pengumuman tidak dikenal: " + (aksi || "(kosong)"));
  } catch (err) {
    gagal(res, err);
  }
};
