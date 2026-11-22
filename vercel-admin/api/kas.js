// Kas (Finance, dashboard saja — TIDAK ada jalur WhatsApp).
// GET  /api/kas — kategori + transaksi + ringkasan saldo per kategori.
// POST /api/kas — tambah transaksi. Body:
//   { jenis: "masuk"|"keluar", kategori_id: uuid, jumlah: number >= 0,
//     keterangan: string, tanggal?: "YYYY-MM-DD",
//     dicatat_oleh?: uuid pengurus (peran ketua/bendahara; default: ketua) }
// Menulis baris ke log_aktivitas.
// Tabel: kas_kategori, kas_transaksi, pengurus, log_aktivitas.
"use strict";

const { supabase, getMasjidId, getKetua, getPengurusMap, tulisLog } = require("../lib/supabase");
const { ok, dibuat, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu } = require("../lib/http");

const JENIS_VALID = ["masuk", "keluar"];

function hitungSaldo(kategori, transaksi) {
  return kategori.map((k) => {
    const rows = transaksi.filter((t) => t.kategori_id === k.id);
    if (rows.length === 0) return { id: k.id, nama: k.nama, qris_url: k.qris_url, saldo: null };
    let saldo = 0;
    rows.forEach((t) => {
      saldo += t.jenis === "masuk" ? Number(t.jumlah) : -Number(t.jumlah);
    });
    return { id: k.id, nama: k.nama, qris_url: k.qris_url, saldo };
  });
}

async function getKas(sb, masjidId) {
  const [kat, trx] = await Promise.all([
    sb.from("kas_kategori").select("id, nama, qris_url").eq("masjid_id", masjidId).order("created_at", { ascending: true }),
    sb.from("kas_transaksi")
      .select("id, kategori_id, jenis, jumlah, keterangan, dicatat_oleh, tanggal, created_at")
      .eq("masjid_id", masjidId)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (kat.error) throw kat.error;
  if (trx.error) throw trx.error;
  const pengurusMap = await getPengurusMap(sb, masjidId);
  const kategori = kat.data || [];
  const transaksi = (trx.data || []).map((t) => {
    const k = kategori.find((x) => x.id === t.kategori_id);
    const p = t.dicatat_oleh ? pengurusMap[t.dicatat_oleh] || null : null;
    return {
      id: t.id,
      tanggal: t.tanggal,
      keterangan: t.keterangan,
      kategori_id: t.kategori_id,
      kategori: k ? k.nama : null,
      jenis: t.jenis,
      jumlah: t.jumlah === null ? null : Number(t.jumlah),
      dicatat_oleh: p ? { id: p.id, nama: p.nama, peran: p.peran } : null,
      created_at: t.created_at,
    };
  });
  const ringkasan = hitungSaldo(kategori, trx.data || []);
  const total = ringkasan.reduce((s, r) => s + (r.saldo === null ? 0 : r.saldo), 0);
  return { kategori: ringkasan, transaksi, total_saldo: total };
}

module.exports = async (req, res) => {
  try {
    const sb = supabase();
    const masjidId = await getMasjidId(sb);

    if (req.method === "GET") {
      if (!hanyaMethod(req, res, ["GET"])) return;
      ok(res, await getKas(sb, masjidId));
      return;
    }

    if (req.method === "POST") {
      if (!hanyaMethod(req, res, ["POST"])) return;
      const body = await bacaJson(req);

      if (!JENIS_VALID.includes(body.jenis)) {
        throw salahInput('jenis harus "masuk" atau "keluar"');
      }
      if (!body.kategori_id || typeof body.kategori_id !== "string") {
        throw salahInput("kategori_id wajib diisi");
      }
      const jumlah = Number(body.jumlah);
      if (body.jumlah === undefined || body.jumlah === null || isNaN(jumlah) || jumlah < 0) {
        throw salahInput("jumlah harus angka >= 0");
      }
      if (!body.keterangan || typeof body.keterangan !== "string" || !body.keterangan.trim()) {
        throw salahInput("keterangan wajib diisi");
      }
      let tanggal = body.tanggal;
      if (tanggal !== undefined && tanggal !== null) {
        if (typeof tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || isNaN(Date.parse(tanggal))) {
          throw salahInput("tanggal harus format YYYY-MM-DD");
        }
      }

      const { data: kat, error: katErr } = await sb
        .from("kas_kategori")
        .select("id, nama")
        .eq("id", body.kategori_id)
        .eq("masjid_id", masjidId)
        .maybeSingle();
      if (katErr) throw katErr;
      if (!kat) throw tidakKetemu("Kategori kas tidak ditemukan");

      // Pencatat: ketua/bendahara saja (keputusan founder 22 Nov 2026).
      let pencatat = null;
      if (body.dicatat_oleh) {
        const { data, error } = await sb
          .from("pengurus")
          .select("id, nama, peran")
          .eq("id", body.dicatat_oleh)
          .eq("masjid_id", masjidId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw tidakKetemu("Pengurus pencatat tidak ditemukan");
        if (data.peran !== "ketua" && data.peran !== "bendahara") {
          throw salahInput("Hanya ketua atau bendahara yang boleh mencatat kas");
        }
        pencatat = data;
      } else {
        pencatat = await getKetua(sb, masjidId);
        if (!pencatat) throw salahInput("Belum ada pengurus dengan peran ketua di database");
      }

      const { data: created, error: insErr } = await sb
        .from("kas_transaksi")
        .insert({
          masjid_id: masjidId,
          kategori_id: kat.id,
          jenis: body.jenis,
          jumlah,
          keterangan: body.keterangan.trim(),
          dicatat_oleh: pencatat.id,
          ...(tanggal ? { tanggal } : {}),
        })
        .select("id, kategori_id, jenis, jumlah, keterangan, dicatat_oleh, tanggal, created_at")
        .single();
      if (insErr) throw insErr;

      await tulisLog(sb, {
        masjidId,
        pengurusId: pencatat.id,
        aksi: "Mencatat kas",
        detail:
          "kas:" + created.id + " | " + (body.jenis === "masuk" ? "Pemasukan" : "Pengeluaran") +
          " " + kat.nama + " Rp " + jumlah.toLocaleString("id-ID") +
          ' — "' + body.keterangan.trim().slice(0, 120) + '"',
      });

      dibuat(res, { transaksi: created });
      return;
    }

    hanyaMethod(req, res, ["GET", "POST"]);
  } catch (err) {
    gagal(res, err);
  }
};
