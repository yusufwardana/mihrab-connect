// Jadwal sholat + petugas + murotal.
// GET /api/jadwal — settings + iqomah + petugas + murotal + jadwal sholat
//   terhitung (metode Kemenag dari koordinat masjid; null bila koordinat
//   belum diatur) + tanggal Masehi/Hijriyah hari ini.
// PUT /api/jadwal — ubah koreksi menit / offset Hijriyah / durasi iqomah /
//   jadwal petugas (ganti seluruh daftar) / murotal. Body boleh berisi
//   sebagian saja dari:
//   { koreksi_menit?: int, offset_hijriyah?: int (-2..2),
//     iqomah?: { subuh?: int, dzuhur?: int, ashar?: int, maghrib?: int,
//                isya?: int, jumat?: int, tarawih?: int } (0..30),
//     petugas?: [{ peran: "imam"|"muadzin"|"khatib", nama: string,
//                  tanggal: "YYYY-MM-DD" }],
//     murotal?: { aktif?: boolean } }
// Setiap perubahan menulis baris ke log_aktivitas.
// Tabel: masjid, jadwal_settings, iqomah_durations, jadwal_petugas,
//        murotal_settings, pengurus, log_aktivitas.
"use strict";

const { supabase, getMasjid, tulisLog } = require("../lib/supabase");
const { ok, gagal, hanyaMethod, bacaJson, salahInput } = require("../lib/http");
const { butuhAuth } = require("../lib/auth");
const { hariIniWIB, formatTanggalId, hitungJadwalSholat, tanggalHijriyah } = require("../lib/prayer");

const WAKTU_IQOMAH = ["subuh", "dzuhur", "ashar", "maghrib", "isya", "jumat", "tarawih"];
const PERAN_PETUGAS = ["imam", "muadzin", "khatib"];

function gabungWaktuIqomah(waktu, iqomahRows) {
  if (!waktu) return null;
  const map = {};
  (iqomahRows || []).forEach((r) => {
    map[r.waktu] = r.durasi_menit;
  });
  return waktu.map((w) => {
    const kunci = w.nama.toLowerCase();
    return { nama: w.nama, jam: w.jam, iqomah: kunci in map ? map[kunci] : null };
  });
}

async function getJadwal(sb) {
  const masjid = await getMasjid(sb);
  const masjidId = masjid.id;
  const [set, iq, ptg, mur] = await Promise.all([
    sb.from("jadwal_settings").select("metode, koreksi_menit, offset_hijriyah").eq("masjid_id", masjidId).maybeSingle(),
    sb.from("iqomah_durations").select("waktu, durasi_menit").eq("masjid_id", masjidId),
    sb.from("jadwal_petugas").select("id, tanggal, peran, nama").eq("masjid_id", masjidId).order("tanggal", { ascending: true }).limit(100),
    sb.from("murotal_settings").select("surah, qari, durasi_menit, volume, aktif").eq("masjid_id", masjidId).maybeSingle(),
  ]);
  if (set.error) throw set.error;
  if (iq.error) throw iq.error;
  if (ptg.error) throw ptg.error;
  if (mur.error) throw mur.error;

  const settings = set.data || { metode: "Kemenag", koreksi_menit: 0, offset_hijriyah: 0 };
  const hariIni = hariIniWIB();
  const waktuMentah = hitungJadwalSholat({
    lat: masjid.koordinat_lat === null ? null : Number(masjid.koordinat_lat),
    lng: masjid.koordinat_lng === null ? null : Number(masjid.koordinat_lng),
    tanggal: hariIni,
    koreksiMenit: settings.koreksi_menit,
  });

  return {
    masjid: {
      id: masjid.id,
      nama: masjid.nama,
      koordinat_lat: masjid.koordinat_lat,
      koordinat_lng: masjid.koordinat_lng,
    },
    settings: {
      metode: settings.metode,
      koreksi_menit: settings.koreksi_menit,
      offset_hijriyah: settings.offset_hijriyah,
    },
    iqomah: (iq.data || []).sort((a, b) => WAKTU_IQOMAH.indexOf(a.waktu) - WAKTU_IQOMAH.indexOf(b.waktu)),
    petugas: ptg.data || [],
    murotal: mur.data || null,
    waktu: gabungWaktuIqomah(waktuMentah, iq.data || []),
    tanggal: {
      masehi: formatTanggalId(hariIni),
      hijriyah: tanggalHijriyah(hariIni, settings.offset_hijriyah),
    },
  };
}

function validInt(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

module.exports = async (req, res) => {
  try {
    const sb = supabase();

    if (req.method === "GET") {
      if (!hanyaMethod(req, res, ["GET"])) return;
      butuhAuth(req, res);
      ok(res, await getJadwal(sb));
      return;
    }

    if (req.method === "PUT") {
      if (!hanyaMethod(req, res, ["PUT"])) return;
      // Ubah jadwal: ketua saja (matriks izin spek).
      const saya = butuhAuth(req, res, ["ketua"]);
      const body = await bacaJson(req);
      const masjid = await getMasjid(sb);
      const masjidId = masjid.id;
      const logs = [];

      if (body.koreksi_menit !== undefined) {
        if (!validInt(body.koreksi_menit, -60, 60)) {
          throw salahInput("koreksi_menit harus bilangan bulat -60..60");
        }
      }
      if (body.offset_hijriyah !== undefined) {
        if (!validInt(body.offset_hijriyah, -2, 2)) {
          throw salahInput("offset_hijriyah harus bilangan bulat -2..2");
        }
      }
      if (body.koreksi_menit !== undefined || body.offset_hijriyah !== undefined) {
        const patch = {};
        if (body.koreksi_menit !== undefined) patch.koreksi_menit = body.koreksi_menit;
        if (body.offset_hijriyah !== undefined) patch.offset_hijriyah = body.offset_hijriyah;
        const { error } = await sb
          .from("jadwal_settings")
          .upsert({ masjid_id: masjidId, ...patch }, { onConflict: "masjid_id" });
        if (error) throw error;
        logs.push({
          aksi: "Mengubah pengaturan jadwal",
          detail:
            "jadwal_settings | " +
            Object.entries(patch).map(([k, v]) => k + "=" + v).join(", "),
        });
      }

      if (body.iqomah !== undefined) {
        if (typeof body.iqomah !== "object" || body.iqomah === null || Array.isArray(body.iqomah)) {
          throw salahInput("iqomah harus objek { waktu: menit }");
        }
        const rows = [];
        for (const [waktu, menit] of Object.entries(body.iqomah)) {
          if (!WAKTU_IQOMAH.includes(waktu)) throw salahInput("waktu iqomah tidak dikenal: " + waktu);
          if (!validInt(menit, 0, 30)) throw salahInput("durasi iqomah " + waktu + " harus 0..30 menit");
          rows.push({ masjid_id: masjidId, waktu, durasi_menit: menit });
        }
        if (rows.length > 0) {
          const { error } = await sb
            .from("iqomah_durations")
            .upsert(rows, { onConflict: "masjid_id,waktu" });
          if (error) throw error;
          logs.push({
            aksi: "Mengubah durasi iqomah",
            detail: "iqomah_durations | " + rows.map((r) => r.waktu + "=" + r.durasi_menit + " mnt").join(", "),
          });
        }
      }

      if (body.petugas !== undefined) {
        if (!Array.isArray(body.petugas)) throw salahInput("petugas harus array");
        const rows = body.petugas.map((p, i) => {
          if (!p || !PERAN_PETUGAS.includes(p.peran)) {
            throw salahInput("petugas[" + i + "].peran harus imam, muadzin, atau khatib");
          }
          if (!p.nama || typeof p.nama !== "string" || !p.nama.trim()) {
            throw salahInput("petugas[" + i + "].nama wajib diisi");
          }
          if (!p.tanggal || typeof p.tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.tanggal) || isNaN(Date.parse(p.tanggal))) {
            throw salahInput("petugas[" + i + "].tanggal harus format YYYY-MM-DD");
          }
          return { masjid_id: masjidId, peran: p.peran, nama: p.nama.trim(), tanggal: p.tanggal };
        });
        // PUT = ganti seluruh daftar petugas masjid ini.
        const { error: delErr } = await sb.from("jadwal_petugas").delete().eq("masjid_id", masjidId);
        if (delErr) throw delErr;
        if (rows.length > 0) {
          const { error: insErr } = await sb.from("jadwal_petugas").insert(rows);
          if (insErr) throw insErr;
        }
        logs.push({
          aksi: "Mengubah jadwal petugas",
          detail: "jadwal_petugas | " + rows.length + " petugas ditetapkan",
        });
      }

      if (body.murotal !== undefined) {
        if (typeof body.murotal !== "object" || body.murotal === null || Array.isArray(body.murotal)) {
          throw salahInput("murotal harus objek");
        }
        const patch = {};
        if (body.murotal.aktif !== undefined) {
          if (typeof body.murotal.aktif !== "boolean") throw salahInput("murotal.aktif harus boolean");
          patch.aktif = body.murotal.aktif;
        }
        if (Object.keys(patch).length > 0) {
          const { error } = await sb
            .from("murotal_settings")
            .upsert({ masjid_id: masjidId, ...patch }, { onConflict: "masjid_id" });
          if (error) throw error;
          logs.push({
            aksi: "Mengubah pengaturan murotal",
            detail: "murotal_settings | " + Object.entries(patch).map(([k, v]) => k + "=" + v).join(", "),
          });
        }
      }

      for (const l of logs) {
        await tulisLog(sb, { masjidId, pengurusId: saya.id, aksi: l.aksi, detail: l.detail });
      }

      ok(res, await getJadwal(sb));
      return;
    }

    hanyaMethod(req, res, ["GET", "PUT"]);
  } catch (err) {
    gagal(res, err);
  }
};
