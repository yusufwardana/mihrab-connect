// Event P0 (kajian & kegiatan, hari besar & event internal).
// Satu file, aksi dipilih lewat body (POST/PUT/DELETE) — GET mengembalikan
// keduanya untuk layar Event.
// GET  /api/event — { event: [...urut tanggal naik...], kajian: [...urut tanggal naik...], masjid }.
//   Tiap event membawa penanda `selesai` (tanggal sudah lewat WIB); frontend
//   menampilkan lencana "Selesai" dari penanda itu.
// POST /api/event — body { aksi, ... }:
//   aksi "tambah-event":    { nama, tanggal: "YYYY-MM-DD", tampil_countdown? } -> 201 { event }
//   aksi "tambah-kajian":   { judul, tanggal: "YYYY-MM-DD", waktu?, pemateri? } -> 201 { kajian } (status awal 'draf')
//   aksi "duplikasi-event": { id } — salin event dengan tanggal +1 tahun -> 201 { event }
// PUT  /api/event — body { target: "event"|"kajian", id, ... }:
//   event:  { nama?, tanggal?, tampil_countdown? } -> 200 { event }
//   kajian: { judul?, tanggal?, waktu?, pemateri?, status? } (status hanya draf/tayang/selesai) -> 200 { kajian }
// DELETE /api/event — body { target: "event"|"kajian", id } -> 200 { dihapus: true, id }
// Semua mutasi menulis baris ke log_aktivitas.
// PUT kajian tayang -> selesai juga menulis baris ke tabel `arsip`
// (jenis 'kajian'; Archive P0). Transisi draf -> selesai tidak menulis arsip.
// Tabel: event, kajian, log_aktivitas. TANPA perubahan skema.
// Tabel `event` TIDAK punya kolom created_at — urutan selalu per tanggal,
// jangan tambah .order("created_at") di sini. Tabel `kajian` punya
// created_at (dipakai sebagai pengikat urutan bila tanggal sama).
// Pola berulang kajian (harian/mingguan/bulanan) BELUM didukung: skema
// tidak punya kolom pola — lihat deviasi README Admin.
"use strict";

const { supabase, getMasjid, getMasjidId, getKetua, tulisLog } = require("../lib/supabase");
const { ok, dibuat, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu } = require("../lib/http");
const { hariIniWIB } = require("../lib/prayer");

const STATUS_KAJIAN = ["draf", "tayang", "selesai"];

function tanggalHariIniWIB() {
  const t = hariIniWIB();
  const p = (n) => String(n).padStart(2, "0");
  return t.tahun + "-" + p(t.bulan) + "-" + p(t.hari);
}

function validasiTanggal(v, namaField) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) {
    throw salahInput(namaField + " harus format tanggal YYYY-MM-DD yang valid");
  }
  return v;
}

function validasiTeks(v, namaField, maks, wajib) {
  if (v === undefined || v === null || v === "") {
    if (wajib) throw salahInput(namaField + " wajib diisi");
    return null;
  }
  if (typeof v !== "string") throw salahInput(namaField + " harus teks");
  const t = v.trim();
  if (wajib && !t) throw salahInput(namaField + " wajib diisi");
  if (t.length > maks) throw salahInput(namaField + " maks " + maks + " karakter");
  return t || null;
}

// Tanggal +1 tahun; 29 Feb -> 28 Feb bila tahun tujuan bukan kabisat.
function tambahSatuTahun(tanggal) {
  const p = tanggal.split("-");
  const tahun = parseInt(p[0], 10) + 1;
  const bulan = parseInt(p[1], 10);
  const hari = parseInt(p[2], 10);
  const hariDiBulan = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const tgl = Math.min(hari, hariDiBulan);
  const q = (n) => String(n).padStart(2, "0");
  return tahun + "-" + q(bulan) + "-" + q(tgl);
}

async function ambilEvent(sb, masjidId, id) {
  const { data, error } = await sb
    .from("event")
    .select("id, nama, tanggal, tampil_countdown")
    .eq("masjid_id", masjidId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw tidakKetemu("Event tidak ditemukan");
  return data;
}

async function ambilKajian(sb, masjidId, id) {
  const { data, error } = await sb
    .from("kajian")
    .select("id, judul, tanggal, waktu, pemateri, poster_url, status")
    .eq("masjid_id", masjidId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw tidakKetemu("Kajian tidak ditemukan");
  return data;
}

module.exports = async (req, res) => {
  try {
    const sb = supabase();
    const masjidId = await getMasjidId(sb);

    if (req.method === "GET") {
      if (!hanyaMethod(req, res, ["GET"])) return;
      const masjid = await getMasjid(sb);
      const hariIni = tanggalHariIniWIB();
      const [ev, kj] = await Promise.all([
        sb
          .from("event")
          .select("id, nama, tanggal, tampil_countdown")
          .eq("masjid_id", masjidId)
          .order("tanggal", { ascending: true }),
        sb
          .from("kajian")
          .select("id, judul, tanggal, waktu, pemateri, poster_url, status")
          .eq("masjid_id", masjidId)
          .order("tanggal", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (ev.error) throw ev.error;
      if (kj.error) throw kj.error;
      const event = (ev.data || []).map((e) => ({
        id: e.id,
        nama: e.nama,
        tanggal: e.tanggal,
        tampil_countdown: e.tampil_countdown,
        selesai: e.tanggal < hariIni,
      }));
      ok(res, {
        event,
        kajian: kj.data || [],
        masjid: { id: masjid.id, nama: masjid.nama },
      });
      return;
    }

    if (req.method === "POST") {
      if (!hanyaMethod(req, res, ["POST"])) return;
      const body = await bacaJson(req);
      const ketua = await getKetua(sb, masjidId);

      if (body.aksi === "tambah-event") {
        const nama = validasiTeks(body.nama, "nama", 200, true);
        const tanggal = validasiTanggal(body.tanggal, "tanggal");
        let tampil = true;
        if (body.tampil_countdown !== undefined && body.tampil_countdown !== null) {
          if (typeof body.tampil_countdown !== "boolean") {
            throw salahInput("tampil_countdown harus true/false");
          }
          tampil = body.tampil_countdown;
        }
        const { data, error } = await sb
          .from("event")
          .insert({ masjid_id: masjidId, nama, tanggal, tampil_countdown: tampil })
          .select("id, nama, tanggal, tampil_countdown")
          .single();
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Menambah event",
          detail: "event | " + nama + " | " + tanggal,
        });
        dibuat(res, {
          event: { ...data, selesai: data.tanggal < tanggalHariIniWIB() },
        });
        return;
      }

      if (body.aksi === "tambah-kajian") {
        const judul = validasiTeks(body.judul, "judul", 200, true);
        const tanggal = validasiTanggal(body.tanggal, "tanggal");
        const waktu = validasiTeks(body.waktu, "waktu", 20, false);
        const pemateri = validasiTeks(body.pemateri, "pemateri", 200, false);
        const { data, error } = await sb
          .from("kajian")
          .insert({ masjid_id: masjidId, judul, tanggal, waktu, pemateri, status: "draf" })
          .select("id, judul, tanggal, waktu, pemateri, poster_url, status")
          .single();
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Menambah kajian",
          detail: "kajian | " + judul + " | " + tanggal,
        });
        dibuat(res, { kajian: data });
        return;
      }

      if (body.aksi === "duplikasi-event") {
        if (!body.id || typeof body.id !== "string") {
          throw salahInput("id wajib diisi");
        }
        const asal = await ambilEvent(sb, masjidId, body.id);
        const tanggalBaru = tambahSatuTahun(asal.tanggal);
        const { data, error } = await sb
          .from("event")
          .insert({
            masjid_id: masjidId,
            nama: asal.nama,
            tanggal: tanggalBaru,
            tampil_countdown: asal.tampil_countdown,
          })
          .select("id, nama, tanggal, tampil_countdown")
          .single();
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Menduplikasi event",
          detail: "event | " + asal.nama + " | " + asal.tanggal + " → " + tanggalBaru,
        });
        dibuat(res, {
          event: { ...data, selesai: data.tanggal < tanggalHariIniWIB() },
        });
        return;
      }

      throw salahInput("aksi harus salah satu: tambah-event, tambah-kajian, duplikasi-event");
    }

    if (req.method === "PUT") {
      if (!hanyaMethod(req, res, ["PUT"])) return;
      const body = await bacaJson(req);
      const ketua = await getKetua(sb, masjidId);
      if (!body.id || typeof body.id !== "string") {
        throw salahInput("id wajib diisi");
      }

      if (body.target === "event") {
        const patch = {};
        if (body.nama !== undefined) patch.nama = validasiTeks(body.nama, "nama", 200, true);
        if (body.tanggal !== undefined) patch.tanggal = validasiTanggal(body.tanggal, "tanggal");
        if (body.tampil_countdown !== undefined) {
          if (typeof body.tampil_countdown !== "boolean") {
            throw salahInput("tampil_countdown harus true/false");
          }
          patch.tampil_countdown = body.tampil_countdown;
        }
        if (Object.keys(patch).length === 0) {
          throw salahInput("Tidak ada perubahan yang diberikan");
        }
        await ambilEvent(sb, masjidId, body.id);
        const { data, error } = await sb
          .from("event")
          .update(patch)
          .eq("id", body.id)
          .eq("masjid_id", masjidId)
          .select("id, nama, tanggal, tampil_countdown")
          .single();
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Mengubah event",
          detail: "event | " + data.nama + " | " + data.tanggal,
        });
        ok(res, {
          event: { ...data, selesai: data.tanggal < tanggalHariIniWIB() },
        });
        return;
      }

      if (body.target === "kajian") {
        const patch = {};
        if (body.judul !== undefined) patch.judul = validasiTeks(body.judul, "judul", 200, true);
        if (body.tanggal !== undefined) patch.tanggal = validasiTanggal(body.tanggal, "tanggal");
        if (body.waktu !== undefined) patch.waktu = validasiTeks(body.waktu, "waktu", 20, false);
        if (body.pemateri !== undefined) patch.pemateri = validasiTeks(body.pemateri, "pemateri", 200, false);
        if (body.status !== undefined) {
          if (!STATUS_KAJIAN.includes(body.status)) {
            throw salahInput("status harus salah satu: draf, tayang, selesai");
          }
          patch.status = body.status;
        }
        if (Object.keys(patch).length === 0) {
          throw salahInput("Tidak ada perubahan yang diberikan");
        }
        const sebelum = await ambilKajian(sb, masjidId, body.id);
        const statusSebelum = sebelum.status;
        const { data, error } = await sb
          .from("kajian")
          .update(patch)
          .eq("id", body.id)
          .eq("masjid_id", masjidId)
          .select("id, judul, tanggal, waktu, pemateri, poster_url, status")
          .single();
        if (error) throw error;
        // Kajian tayang -> selesai juga masuk arsip (Archive P0).
        // Transisi draf -> selesai tidak menulis arsip (tidak pernah tayang).
        if (statusSebelum === "tayang" && data.status === "selesai") {
          const konten = [data.tanggal, data.waktu ? "pukul " + data.waktu : null, data.pemateri || null]
            .filter(Boolean)
            .join(" · ");
          const { error: arsErr } = await sb.from("arsip").insert({
            masjid_id: masjidId,
            jenis: "kajian",
            judul: data.judul,
            konten: konten || null,
            tanggal: data.tanggal,
          });
          if (arsErr) throw arsErr;
        }
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Mengubah kajian",
          detail: "kajian | " + data.judul + " | " + data.tanggal + " | " + data.status,
        });
        ok(res, { kajian: data });
        return;
      }

      throw salahInput('target harus "event" atau "kajian"');
    }

    if (req.method === "DELETE") {
      if (!hanyaMethod(req, res, ["DELETE"])) return;
      const body = await bacaJson(req);
      const ketua = await getKetua(sb, masjidId);
      if (!body.id || typeof body.id !== "string") {
        throw salahInput("id wajib diisi");
      }
      if (body.target === "event") {
        const asal = await ambilEvent(sb, masjidId, body.id);
        const { error } = await sb.from("event").delete().eq("id", body.id).eq("masjid_id", masjidId);
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Menghapus event",
          detail: "event | " + asal.nama + " | " + asal.tanggal,
        });
        ok(res, { dihapus: true, id: body.id });
        return;
      }
      if (body.target === "kajian") {
        const asal = await ambilKajian(sb, masjidId, body.id);
        const { error } = await sb.from("kajian").delete().eq("id", body.id).eq("masjid_id", masjidId);
        if (error) throw error;
        await tulisLog(sb, {
          masjidId,
          pengurusId: ketua ? ketua.id : null,
          aksi: "Menghapus kajian",
          detail: "kajian | " + asal.judul + " | " + asal.tanggal,
        });
        ok(res, { dihapus: true, id: body.id });
        return;
      }
      throw salahInput('target harus "event" atau "kajian"');
    }

    hanyaMethod(req, res, ["GET", "POST", "PUT", "DELETE"]);
  } catch (err) {
    gagal(res, err);
  }
};
