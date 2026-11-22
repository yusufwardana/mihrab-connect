// Serah terima 1 klik (Finance; berita acara untuk Archive).
// GET  /api/serah-terima — daftar (tanggal terbaru dulu, maks 50). Tiap item:
//   { id, tanggal, catatan, dari: {id, nama, peran} | null,
//     ke: {id, nama, peran} | null,
//     saldo_akhir: { per_kategori: [{id, nama, saldo}], total },
//     pengurus: [{id, nama, peran}] }
//   saldo_akhir dihitung dari kas_transaksi dengan tanggal <= tanggal
//   serah terima (saldo beku per tanggal, bukan saldo hari ini).
// POST /api/serah-terima — catat serah terima. Body:
//   { dari_pengurus_id, ke_pengurus_id, catatan?, tanggal?: "YYYY-MM-DD" }
//   dari_pengurus HARUS ketua (matriks izin spek: serah terima hanya
//   ketua); dari != ke; tanggal default hari ini WIB.
// Menulis baris ke log_aktivitas.
// Tabel: serah_terima, kas_kategori, kas_transaksi, pengurus, log_aktivitas.
// TANPA perubahan skema: snapshot saldo tidak disimpan di tabel — dihitung
// ulang dari kas_transaksi per tanggal. Transaksi tidak pernah dihapus,
// jadi angka beku itu stabil.
"use strict";

const { supabase, getMasjid, getMasjidId, getPengurusMap, tulisLog } = require("../lib/supabase");
const { ok, dibuat, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu } = require("../lib/http");
const { hariIniWIB } = require("../lib/prayer");

function fmtRp(n) {
  if (n === null || n === undefined) return "Rp —";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

// Saldo per kategori dari transaksi dengan tanggal <= tanggalBatas.
// transaksi: [{ kategori_id, jenis, jumlah, tanggal }].
function saldoPerTanggal(kategori, transaksi, tanggalBatas) {
  const perKategori = kategori.map((k) => {
    const rows = transaksi.filter(
      (t) => t.kategori_id === k.id && t.tanggal && t.tanggal.slice(0, 10) <= tanggalBatas
    );
    if (rows.length === 0) return { id: k.id, nama: k.nama, saldo: null };
    let saldo = 0;
    rows.forEach((t) => {
      saldo += t.jenis === "masuk" ? Number(t.jumlah) : -Number(t.jumlah);
    });
    return { id: k.id, nama: k.nama, saldo };
  });
  const total = perKategori.reduce((s, r) => s + (r.saldo === null ? 0 : r.saldo), 0);
  return { per_kategori: perKategori, total };
}

function bentukItem(row, pengurusMap, saldo, daftarPengurus) {
  const dari = row.dari_pengurus ? pengurusMap[row.dari_pengurus] || null : null;
  const ke = row.ke_pengurus ? pengurusMap[row.ke_pengurus] || null : null;
  const kecil = (p) => (p ? { id: p.id, nama: p.nama, peran: p.peran } : null);
  return {
    id: row.id,
    tanggal: row.tanggal,
    catatan: row.catatan,
    dari: kecil(dari),
    ke: kecil(ke),
    saldo_akhir: saldo,
    pengurus: daftarPengurus,
  };
}

async function muatDasar(sb, masjidId) {
  const [kat, trx, map] = await Promise.all([
    sb.from("kas_kategori").select("id, nama").eq("masjid_id", masjidId).order("created_at", { ascending: true }),
    sb
      .from("kas_transaksi")
      .select("kategori_id, jenis, jumlah, tanggal")
      .eq("masjid_id", masjidId)
      .order("tanggal", { ascending: true })
      .limit(5000),
    getPengurusMap(sb, masjidId),
  ]);
  if (kat.error) throw kat.error;
  if (trx.error) throw trx.error;
  const daftarPengurus = Object.values(map).map((p) => ({
    id: p.id,
    nama: p.nama,
    peran: p.peran,
  }));
  return { kategori: kat.data || [], transaksi: trx.data || [], map, daftarPengurus };
}

function tanggalHariIniWIB() {
  const t = hariIniWIB();
  const p = (n) => String(n).padStart(2, "0");
  return t.tahun + "-" + p(t.bulan) + "-" + p(t.hari);
}

module.exports = async (req, res) => {
  try {
    const sb = supabase();
    const masjidId = await getMasjidId(sb);

    if (req.method === "GET") {
      if (!hanyaMethod(req, res, ["GET"])) return;
      const masjid = await getMasjid(sb);
      const { data: rows, error } = await sb
        .from("serah_terima")
        .select("id, dari_pengurus, ke_pengurus, tanggal, catatan")
        .eq("masjid_id", masjidId)
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const dasar = await muatDasar(sb, masjidId);
      const items = (rows || []).map((r) =>
        bentukItem(r, dasar.map, saldoPerTanggal(dasar.kategori, dasar.transaksi, r.tanggal.slice(0, 10)), dasar.daftarPengurus)
      );
      ok(res, {
        serah_terima: items,
        pengurus: dasar.daftarPengurus,
        masjid: { id: masjid.id, nama: masjid.nama },
      });
      return;
    }

    if (req.method === "POST") {
      if (!hanyaMethod(req, res, ["POST"])) return;
      const body = await bacaJson(req);

      if (!body.dari_pengurus_id || typeof body.dari_pengurus_id !== "string") {
        throw salahInput("dari_pengurus_id wajib diisi");
      }
      if (!body.ke_pengurus_id || typeof body.ke_pengurus_id !== "string") {
        throw salahInput("ke_pengurus_id wajib diisi");
      }
      if (body.dari_pengurus_id === body.ke_pengurus_id) {
        throw salahInput("Pengurus asal dan pengurus tujuan tidak boleh sama");
      }
      let tanggal = tanggalHariIniWIB();
      if (body.tanggal !== undefined && body.tanggal !== null) {
        if (
          typeof body.tanggal !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal) ||
          isNaN(Date.parse(body.tanggal))
        ) {
          throw salahInput("tanggal harus format YYYY-MM-DD");
        }
        tanggal = body.tanggal;
      }
      let catatan = null;
      if (body.catatan !== undefined && body.catatan !== null) {
        if (typeof body.catatan !== "string") throw salahInput("catatan harus teks");
        catatan = body.catatan.trim() || null;
        if (catatan && catatan.length > 500) throw salahInput("catatan maks 500 karakter");
      }

      const { data: para, error: pErr } = await sb
        .from("pengurus")
        .select("id, nama, peran")
        .eq("masjid_id", masjidId)
        .in("id", [body.dari_pengurus_id, body.ke_pengurus_id]);
      if (pErr) throw pErr;
      const dari = (para || []).find((p) => p.id === body.dari_pengurus_id);
      const ke = (para || []).find((p) => p.id === body.ke_pengurus_id);
      if (!dari) throw tidakKetemu("Pengurus asal tidak ditemukan");
      if (!ke) throw tidakKetemu("Pengurus tujuan tidak ditemukan");
      // Matriks izin spek: serah terima hanya ketua.
      if (dari.peran !== "ketua") {
        throw salahInput("Hanya ketua yang boleh melakukan serah terima");
      }

      const { data: created, error: insErr } = await sb
        .from("serah_terima")
        .insert({
          masjid_id: masjidId,
          dari_pengurus: dari.id,
          ke_pengurus: ke.id,
          tanggal,
          catatan,
        })
        .select("id, dari_pengurus, ke_pengurus, tanggal, catatan")
        .single();
      if (insErr) throw insErr;

      const dasar = await muatDasar(sb, masjidId);
      const saldo = saldoPerTanggal(dasar.kategori, dasar.transaksi, tanggal);
      const rincianSaldo = saldo.per_kategori
        .map((k) => k.nama + " " + fmtRp(k.saldo))
        .join(", ");
      await tulisLog(sb, {
        masjidId,
        pengurusId: dari.id,
        aksi: "Serah terima",
        detail:
          dari.nama + " (Ketua) → " + ke.nama + " (" + ke.peran + ")" +
          " | saldo akhir: " + rincianSaldo + " | total " + fmtRp(saldo.total),
      });

      dibuat(res, {
        serah_terima: bentukItem(created, dasar.map, saldo, dasar.daftarPengurus),
      });
      return;
    }

    hanyaMethod(req, res, ["GET", "POST"]);
  } catch (err) {
    gagal(res, err);
  }
};
