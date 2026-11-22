// POST /api/auth/reset-pin — KETUA saja: buatkan PIN baru untuk seorang pengurus.
// Body: { pengurus_id } -> 200 { pin_baru, pengurus: {id, nama, peran} }.
// PIN baru dibuat acak (6 digit, boleh diawali 0), disimpan sebagai
// hash+salt baru, pengunci gagal dibuka. PIN BARU HANYA MUNCUL SEKALI
// DI RESPONS INI — ketua menyampaikannya langsung ke pengurus; PIN
// tidak tersimpan di mana pun sebagai teks.
// Tabel: pengurus.
"use strict";

const crypto = require("crypto");
const { supabase, getMasjidId } = require("../../lib/supabase");
const { ok, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu } = require("../../lib/http");
const { butuhAuth, hashPin } = require("../../lib/auth");

module.exports = async (req, res) => {
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
};
