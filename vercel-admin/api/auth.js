// /api/auth — SATU function dispatcher untuk semua aksi auth.
// Alasan penggabungan: paket Hobby Vercel membatasi 12 Serverless
// Functions per deployment; enam file api/auth/*.js terpisah membuat
// deploy gagal (exceeded_serverless_functions_per_deployment).
// Vercel menghitung SEMUA file .js di bawah api/ sebagai function,
// walau tidak di-route — jadi file-file lama DIHAPUS, bukan dibiarkan.
//
// URL yang dipanggil frontend TIDAK berubah: rewrite di vercel.json
// memetakan /api/auth/:aksi -> /api/auth?aksi=:aksi, dan dispatcher
// ini membaca aksi dari query `aksi`. Setiap aksi mempertahankan
// validasi, status HTTP, pesan error, dan perilaku cookie/sesi yang
// sama persis seperti file asalnya.
// Aksi: pengurus (GET, publik), login (POST), saya (GET, sesi),
// logout (POST), ubah-pin (POST, sesi), reset-pin (POST, ketua saja).
// Aksi yang tidak dikenal -> 404.
"use strict";

const crypto = require("crypto");
const { supabase, getMasjidId } = require("../lib/supabase");
const { ok, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu, konflik } = require("../lib/http");
const { validPin, cekPin, hashPin, buatToken, cookieSesi, cookieHapus, butuhAuth } = require("../lib/auth");

const MAX_GAGAL = 5;
const KUNCI_MENIT = 15;

// GET /api/auth/pengurus — daftar pengurus untuk dropdown login.
// TANPA auth (sengaja): nama + peran pengurus bukan rahasia, dan layar
// login butuh daftar ini sebelum ada sesi. TIDAK mengembalikan PIN,
// hash, nomor WhatsApp, atau data sensitif lain.
// Tabel: pengurus.
async function aksiPengurus(req, res) {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data, error } = await sb
      .from("pengurus")
      .select("id, nama, peran")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    ok(res, { pengurus: (data || []).map(function (p) { return { id: p.id, nama: p.nama, peran: p.peran }; }) });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/auth/login — masuk dengan nama pengurus + PIN 6 digit.
// Body: { pengurus_id, pin } -> 200 { saya: {id, nama, peran} } +
// cookie httpOnly `mihrab_sesi` (12 jam).
// Brute force: PIN salah menambah pin_gagal; 5 gagal -> akun terkunci
// 15 menit (429). Login sukses mereset pin_gagal. PIN yang belum
// diatur -> 409 ("PIN belum diatur, minta ketua mengaturnya").
// Login BUKAN mutasi konten, jadi tidak menulis log_aktivitas.
// Tabel: pengurus.
async function aksiLogin(req, res) {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    const body = await bacaJson(req);
    const pengurusId = String((body && body.pengurus_id) || "").trim();
    const pin = String((body && body.pin) || "").trim();
    if (!pengurusId) throw salahInput("pengurus_id wajib diisi");
    if (!validPin(pin)) throw salahInput("PIN harus 6 digit angka");

    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data: p, error } = await sb
      .from("pengurus")
      .select("id, nama, peran, pin_hash, pin_salt, pin_gagal, pin_terkunci_sampai")
      .eq("id", pengurusId)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengurus tidak ditemukan");

    if (p.pin_terkunci_sampai && new Date(p.pin_terkunci_sampai).getTime() > Date.now()) {
      const e = new Error("Akun terkunci sementara karena terlalu banyak percobaan gagal — coba lagi beberapa menit lagi");
      e.status = 429;
      throw e;
    }
    if (!p.pin_hash || !p.pin_salt) {
      throw konflik("PIN belum diatur, minta ketua mengaturnya");
    }
    if (!cekPin(pin, p.pin_salt, p.pin_hash)) {
      const gagalBaru = (p.pin_gagal || 0) + 1;
      const patch = { pin_gagal: gagalBaru };
      if (gagalBaru >= MAX_GAGAL) {
        patch.pin_terkunci_sampai = new Date(Date.now() + KUNCI_MENIT * 60 * 1000).toISOString();
      }
      await sb.from("pengurus").update(patch).eq("id", p.id);
      const e = new Error("PIN salah");
      e.status = 401;
      throw e;
    }

    await sb
      .from("pengurus")
      .update({ pin_gagal: 0, pin_terkunci_sampai: null })
      .eq("id", p.id);

    const token = buatToken(p);
    res.setHeader("Set-Cookie", cookieSesi(token));
    ok(res, { saya: { id: p.id, nama: p.nama, peran: p.peran } });
  } catch (err) {
    gagal(res, err);
  }
}

// GET /api/auth/saya — siapa yang sedang login (dari cookie sesi).
// Butuh sesi yang sah (401 bila tidak ada/kedaluwarsa), lalu pastikan
// akun pengurusnya masih ada di database (401 bila sudah tidak ada).
// Kembalikan { saya: {id, nama, peran} }.
// Tabel: pengurus.
async function aksiSaya(req, res) {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const saya = butuhAuth(req, res);
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data, error } = await sb
      .from("pengurus")
      .select("id, nama, peran")
      .eq("id", saya.id)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const e = new Error("Akun tidak ditemukan");
      e.status = 401;
      throw e;
    }
    ok(res, { saya: { id: data.id, nama: data.nama, peran: data.peran } });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/auth/logout — keluar: hapus cookie sesi.
// Tidak butuh sesi yang sah (keluar harus selalu berhasil).
async function aksiLogout(req, res) {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    res.setHeader("Set-Cookie", cookieHapus());
    ok(res, { ok: true });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/auth/ubah-pin — pengurus yang login mengganti PIN-nya sendiri.
// Butuh sesi (semua peran). Body: { pin_lama, pin_baru } — keduanya
// harus 6 digit angka; pin_lama harus cocok (401 bila tidak).
// PIN baru disimpan sebagai hash+salt baru, pengunci gagal direset.
// Kembalikan { ok: true }. PIN tidak pernah dikembalikan di respons.
// Tabel: pengurus.
async function aksiUbahPin(req, res) {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    const saya = butuhAuth(req, res);
    const body = await bacaJson(req);
    const pinLama = String((body && body.pin_lama) || "").trim();
    const pinBaru = String((body && body.pin_baru) || "").trim();
    if (!validPin(pinLama)) throw salahInput("PIN lama harus 6 digit angka");
    if (!validPin(pinBaru)) throw salahInput("PIN baru harus 6 digit angka");

    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data: p, error } = await sb
      .from("pengurus")
      .select("id, pin_hash, pin_salt")
      .eq("id", saya.id)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengurus tidak ditemukan");
    if (!p.pin_hash || !cekPin(pinLama, p.pin_salt, p.pin_hash)) {
      const e = new Error("PIN lama salah");
      e.status = 401;
      throw e;
    }

    const baru = hashPin(pinBaru);
    const { error: updErr } = await sb
      .from("pengurus")
      .update({ pin_hash: baru.hash, pin_salt: baru.salt, pin_gagal: 0, pin_terkunci_sampai: null })
      .eq("id", p.id);
    if (updErr) throw updErr;
    ok(res, { ok: true });
  } catch (err) {
    gagal(res, err);
  }
}

// POST /api/auth/reset-pin — KETUA saja: buatkan PIN baru untuk seorang pengurus.
// Body: { pengurus_id } -> 200 { pin_baru, pengurus: {id, nama, peran} }.
// PIN baru dibuat acak (6 digit, boleh diawali 0), disimpan sebagai
// hash+salt baru, pengunci gagal dibuka. PIN BARU HANYA MUNCUL SEKALI
// DI RESPONS INI — ketua menyampaikannya langsung ke pengurus; PIN
// tidak tersimpan di mana pun sebagai teks.
// Tabel: pengurus.
async function aksiResetPin(req, res) {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    butuhAuth(req, res, ["ketua"]);
    const body = await bacaJson(req);
    const pengurusId = String((body && body.pengurus_id) || "").trim();
    if (!pengurusId) throw salahInput("pengurus_id wajib diisi");

    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data: p, error } = await sb
      .from("pengurus")
      .select("id, nama, peran")
      .eq("id", pengurusId)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengurus tidak ditemukan");

    const pinBaru = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const h = hashPin(pinBaru);
    const { error: updErr } = await sb
      .from("pengurus")
      .update({ pin_hash: h.hash, pin_salt: h.salt, pin_gagal: 0, pin_terkunci_sampai: null })
      .eq("id", p.id);
    if (updErr) throw updErr;
    ok(res, { pin_baru: pinBaru, pengurus: { id: p.id, nama: p.nama, peran: p.peran } });
  } catch (err) {
    gagal(res, err);
  }
}

module.exports = async (req, res) => {
  try {
    const aksi = req.query && req.query.aksi;
    if (aksi === "pengurus") return aksiPengurus(req, res);
    if (aksi === "login") return aksiLogin(req, res);
    if (aksi === "saya") return aksiSaya(req, res);
    if (aksi === "logout") return aksiLogout(req, res);
    if (aksi === "ubah-pin") return aksiUbahPin(req, res);
    if (aksi === "reset-pin") return aksiResetPin(req, res);
    throw tidakKetemu("Aksi auth tidak dikenal: " + (aksi || "(kosong)"));
  } catch (err) {
    gagal(res, err);
  }
};
