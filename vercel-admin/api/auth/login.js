// POST /api/auth/login — masuk dengan nama pengurus + PIN 6 digit.
// Body: { pengurus_id, pin } -> 200 { saya: {id, nama, peran} } +
// cookie httpOnly `mihrab_sesi` (12 jam).
// Brute force: PIN salah menambah pin_gagal; 5 gagal -> akun terkunci
// 15 menit (429). Login sukses mereset pin_gagal. PIN yang belum
// diatur -> 409 ("PIN belum diatur, minta ketua mengaturnya").
// Login BUKAN mutasi konten, jadi tidak menulis log_aktivitas.
// Tabel: pengurus.
"use strict";

const { supabase, getMasjidId } = require("../../lib/supabase");
const { ok, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu, konflik } = require("../../lib/http");
const { validPin, cekPin, buatToken, cookieSesi } = require("../../lib/auth");

const MAX_GAGAL = 5;
const KUNCI_MENIT = 15;

module.exports = async (req, res) => {
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
};
