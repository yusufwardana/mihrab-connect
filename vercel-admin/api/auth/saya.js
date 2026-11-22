// GET /api/auth/saya — siapa yang sedang login (dari cookie sesi).
// Butuh sesi yang sah (401 bila tidak ada/kedaluwarsa), lalu pastikan
// akun pengurusnya masih ada di database (401 bila sudah tidak ada).
// Kembalikan { saya: {id, nama, peran} }.
// Tabel: pengurus.
"use strict";

const { supabase, getMasjidId } = require("../../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../../lib/http");
const { butuhAuth } = require("../../lib/auth");

module.exports = async (req, res) => {
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
};
