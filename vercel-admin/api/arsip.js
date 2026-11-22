// GET /api/arsip — arsip tayangan (baris tersimpan) + event yang sudah lewat (turunan bacaan).
// Query opsional: ?q= (cari di judul/konten, tak sensitif huruf besar-kecil),
// ?jenis=pengumuman|kajian|event (nilai lain 400), ?limit= (default 50, maks 100).
// Baris tersimpan dari tabel `arsip` (ditulis saat tayang -> selesai); event yang
// tanggalnya sudah lewat TIDAK ditulis ke tabel arsip — dibaca langsung dari
// tabel `event` dan ditandai asal: 'event' (baris tersimpan: asal 'tersimpan').
// Tabel: arsip, event.
"use strict";

const { supabase, getMasjidId } = require("../lib/supabase");
const { ok, gagal, hanyaMethod, salahInput } = require("../lib/http");
const { hariIniWIB } = require("../lib/prayer");

const JENIS_VALID = ["pengumuman", "kajian", "event"];

function tanggalHariIniWIB() {
  const t = hariIniWIB();
  const p = (n) => String(n).padStart(2, "0");
  return t.tahun + "-" + p(t.bulan) + "-" + p(t.hari);
}

function kunciUrut(a) {
  return (a.tanggal || (a.created_at || "").slice(0, 10) || "") + "|" + (a.created_at || "");
}

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const jenis = (req.query && req.query.jenis) || "";
    if (jenis && !JENIS_VALID.includes(jenis)) {
      throw salahInput("jenis harus salah satu: pengumuman, kajian, event");
    }
    const q = ((req.query && req.query.q) || "").trim().toLowerCase();
    let limit = parseInt((req.query && req.query.limit) || "50", 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;

    const [tersimpan, lewat] = await Promise.all([
      sb
        .from("arsip")
        .select("id, jenis, judul, konten, tanggal, created_at")
        .eq("masjid_id", masjidId)
        .order("created_at", { ascending: false })
        .limit(100),
      sb
        .from("event")
        .select("id, nama, tanggal")
        .eq("masjid_id", masjidId)
        .lt("tanggal", tanggalHariIniWIB())
        .order("tanggal", { ascending: false }),
    ]);
    if (tersimpan.error) throw tersimpan.error;
    if (lewat.error) throw lewat.error;

    let arsip = (tersimpan.data || []).map((a) => ({
      id: a.id,
      jenis: a.jenis,
      judul: a.judul,
      konten: a.konten,
      tanggal: a.tanggal,
      created_at: a.created_at,
      asal: "tersimpan",
    }));
    (lewat.data || []).forEach((e) => {
      arsip.push({
        id: "event:" + e.id,
        jenis: "event",
        judul: e.nama,
        konten: null,
        tanggal: e.tanggal,
        created_at: null,
        asal: "event",
      });
    });
    // Terbaru dulu (per tanggal, lalu created_at untuk baris tersimpan).
    arsip.sort(function (a, b) {
      var ka = kunciUrut(a), kb = kunciUrut(b);
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
    if (jenis) arsip = arsip.filter(function (a) { return a.jenis === jenis; });
    if (q) {
      arsip = arsip.filter(function (a) {
        return ((a.judul || "") + " " + (a.konten || "")).toLowerCase().indexOf(q) !== -1;
      });
    }
    ok(res, { arsip: arsip.slice(0, limit) });
  } catch (err) {
    gagal(res, err);
  }
};
