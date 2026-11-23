// GET /api/board — paket tayang untuk Board / Pratinjau Board.
// Satu paket terkini (sesuai GET /board/paket-tayang di spesifikasi backend):
// profil masjid, pengaturan + jadwal sholat terhitung, pengumuman berstatus
// TAYANG saja, ringkasan kas (saldo per kategori + total, bukan detail
// transaksi), QRIS per kategori, event countdown aktif, kajian tayang
// mendatang (maks 5, untuk slide agenda), pengaturan murotal.
// Endpoint ini baca-saja; Board tidak pernah menulis lewat sini.
// Tabel: masjid, jadwal_settings, iqomah_durations, pengumuman, pengurus,
//        kas_kategori, kas_transaksi, event, kajian, jadwal_petugas,
//        murotal_settings.
"use strict";

const { supabase, getMasjid, getPengurusMap } = require("../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../lib/http");
const { hariIniWIB, formatTanggalId, hitungJadwalSholat, tanggalHijriyah } = require("../lib/prayer");

module.exports = async (req, res) => {
  // Board di-deploy di domain Vercel yang berbeda dan memanggil endpoint
  // baca-publik ini lintas origin -> izinkan CORS untuk semua origin.
  // Endpoint ini baca-saja (hanya GET); tidak ada data sensitif di paket tayang.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjid = await getMasjid(sb);
    const masjidId = masjid.id;
    const hariIni = hariIniWIB();
    const hariIniStr =
      hariIni.tahun + "-" + String(hariIni.bulan).padStart(2, "0") + "-" + String(hariIni.hari).padStart(2, "0");

    const [set, iq, tayang, kat, trx, evt, mur, kj, ptg] = await Promise.all([
      sb.from("jadwal_settings").select("metode, koreksi_menit, offset_hijriyah").eq("masjid_id", masjidId).maybeSingle(),
      sb.from("iqomah_durations").select("waktu, durasi_menit").eq("masjid_id", masjidId),
      sb.from("pengumuman")
        .select("id, isi, jenis, sumber, pengirim_id, created_at")
        .eq("masjid_id", masjidId)
        .eq("status", "tayang")
        .order("created_at", { ascending: false }),
      sb.from("kas_kategori").select("id, nama, qris_url").eq("masjid_id", masjidId).order("created_at", { ascending: true }),
      sb.from("kas_transaksi").select("kategori_id, jenis, jumlah").eq("masjid_id", masjidId),
      sb.from("event").select("id, nama, tanggal, tampil_countdown").eq("masjid_id", masjidId).eq("tampil_countdown", true).order("tanggal", { ascending: true }),
      sb.from("murotal_settings").select("surah, qari, durasi_menit, volume, aktif").eq("masjid_id", masjidId).maybeSingle(),
      sb.from("kajian").select("id, judul, tanggal, waktu, pemateri").eq("masjid_id", masjidId).eq("status", "tayang").gte("tanggal", hariIniStr).order("tanggal", { ascending: true }).limit(5),
      // Petugas Jumat terdekat: semua baris tanggal >= hari ini, urut tanggal.
      sb.from("jadwal_petugas").select("id, tanggal, peran, nama").eq("masjid_id", masjidId).gte("tanggal", hariIniStr).order("tanggal", { ascending: true }).limit(12),
    ]);
    for (const r of [set, iq, tayang, kat, trx, evt, mur, kj, ptg]) if (r.error) throw r.error;

    const settings = set.data || { metode: "Kemenag", koreksi_menit: 0, offset_hijriyah: 0 };
    const waktuMentah = hitungJadwalSholat({
      lat: masjid.koordinat_lat === null ? null : Number(masjid.koordinat_lat),
      lng: masjid.koordinat_lng === null ? null : Number(masjid.koordinat_lng),
      tanggal: hariIni,
      koreksiMenit: settings.koreksi_menit,
    });
    const iqMap = {};
    (iq.data || []).forEach((r) => {
      iqMap[r.waktu] = r.durasi_menit;
    });
    const waktu = waktuMentah
      ? waktuMentah.map((w) => ({
          nama: w.nama,
          jam: w.jam,
          iqomah: iqMap[w.nama.toLowerCase()] ?? null,
        }))
      : null;

    const pengurusMap = await getPengurusMap(sb, masjidId);
    const pengumumanTayang = (tayang.data || []).map((p) => {
      const pengirim = p.pengirim_id ? pengurusMap[p.pengirim_id] || null : null;
      return {
        id: p.id,
        jenis: p.jenis,
        isi: p.isi,
        sumber: p.sumber,
        pengirim: pengirim ? { nama: pengirim.nama, peran: pengirim.peran } : null,
        created_at: p.created_at,
      };
    });

    const kategori = kat.data || [];
    const ringkasanKas = kategori.map((k) => {
      const rows = (trx.data || []).filter((t) => t.kategori_id === k.id);
      if (rows.length === 0) return { id: k.id, nama: k.nama, saldo: null };
      let saldo = 0;
      rows.forEach((t) => {
        saldo += t.jenis === "masuk" ? Number(t.jumlah) : -Number(t.jumlah);
      });
      return { id: k.id, nama: k.nama, saldo };
    });
    const totalKas = ringkasanKas.reduce((s, r) => s + (r.saldo === null ? 0 : r.saldo), 0);
    const qris = kategori.map((k) => ({ kategori: k.nama, qris_url: k.qris_url }));

    const events = (evt.data || []).map((e) => ({ id: e.id, nama: e.nama, tanggal: e.tanggal }));
    const countdownBerikutnya = events.find((e) => e.tanggal >= hariIniStr) || null;

    // Kajian tayang mendatang saja (status tayang, tanggal >= hari ini).
    const kajian = (kj.data || []).map((k) => ({
      id: k.id,
      judul: k.judul,
      tanggal: k.tanggal,
      waktu: k.waktu,
      pemateri: k.pemateri,
    }));

    // Petugas Jumat terdekat: tanggal paling awal yang punya baris petugas
    // (tanggal >= hari ini). Null bila belum ada data petugas sama sekali.
    // Khutbah mulai = Dzuhur pada tanggal petugas itu (dihitung dari
    // koordinat + koreksi, bukan Dzuhur hari ini).
    let petugasJumat = null;
    const ptgRows = ptg.data || [];
    if (ptgRows.length) {
      const tglPetugas = ptgRows[0].tanggal;
      const byPeran = {};
      ptgRows
        .filter((r) => r.tanggal === tglPetugas)
        .forEach((r) => {
          byPeran[r.peran] = r.nama;
        });
      let khutbahMulai = null;
      const tp = String(tglPetugas).split("-");
      const jadwalTgl = hitungJadwalSholat({
        lat: masjid.koordinat_lat === null ? null : Number(masjid.koordinat_lat),
        lng: masjid.koordinat_lng === null ? null : Number(masjid.koordinat_lng),
        tanggal: { tahun: +tp[0], bulan: +tp[1], hari: +tp[2] },
        koreksiMenit: settings.koreksi_menit,
      });
      if (jadwalTgl) {
        const dz = jadwalTgl.find((w) => w.nama === "Dzuhur");
        if (dz) khutbahMulai = dz.jam;
      }
      petugasJumat = {
        tanggal: tglPetugas,
        khutbah_mulai: khutbahMulai,
        khatib: byPeran.khatib || null,
        imam: byPeran.imam || null,
        muadzin: byPeran.muadzin || null,
      };
    }

    ok(res, {
      masjid: {
        nama: masjid.nama,
        alamat: masjid.alamat,
        koordinat_lat: masjid.koordinat_lat,
        koordinat_lng: masjid.koordinat_lng,
        logo_url: masjid.logo_url,
        foto_url: masjid.foto_url,
        kontak: masjid.kontak,
      },
      jadwal: {
        metode: settings.metode,
        koreksi_menit: settings.koreksi_menit,
        offset_hijriyah: settings.offset_hijriyah,
        waktu,
      },
      pengumuman_tayang: pengumumanTayang,
      ringkasan_kas: { per_kategori: ringkasanKas, total: totalKas },
      qris,
      event: events,
      countdown_berikutnya: countdownBerikutnya,
      kajian,
      petugas_jumat: petugasJumat,
      murotal: mur.data || null,
      tanggal: {
        masehi: formatTanggalId(hariIni),
        hijriyah: tanggalHijriyah(hariIni, settings.offset_hijriyah),
      },
    });
  } catch (err) {
    gagal(res, err);
  }
};
