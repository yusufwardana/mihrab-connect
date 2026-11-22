// POST /api/auth/ubah-pin — pengurus yang login mengganti PIN-nya sendiri.
// Butuh sesi (semua peran). Body: { pin_lama, pin_baru } — keduanya
// harus 6 digit angka; pin_lama harus cocok (401 bila tidak).
// PIN baru disimpan sebagai hash+salt baru, pengunci gagal direset.
// Kembalikan { ok: true }. PIN tidak pernah dikembalikan di respons.
// Tabel: pengurus.
"use strict";

const { supabase, getMasjidId } = require("../../lib/supabase");
const { ok, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu } = require("../../lib/http");
const { butuhAuth, validPin, cekPin, hashPin } = require("../../lib/auth");

module.exports = async (req, res) => {
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
};
