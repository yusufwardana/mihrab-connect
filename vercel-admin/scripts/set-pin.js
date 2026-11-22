// Atur PIN awal seorang pengurus (dipakai SEKALI setelah migrasi 002).
// Pemakaian (dari direktori vercel-admin, dengan env sudah diatur):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-pin.js <pengurus_id> <pin-6-digit>
// Mencetak hanya konfirmasi nama — PIN TIDAK dicetak ke output.
// Script ini bukan bagian deploy Vercel (tidak dipanggil dari mana pun).
"use strict";

const { createClient } = require("@supabase/supabase-js");
const { validPin, hashPin } = require("../lib/auth");

async function utama() {
  const pengurusId = process.argv[2];
  const pin = process.argv[3];
  if (!pengurusId || !pin) {
    console.error("Pakai: node scripts/set-pin.js <pengurus_id> <pin-6-digit>");
    process.exit(2);
  }
  if (!validPin(pin)) {
    console.error("PIN harus tepat 6 digit angka.");
    process.exit(2);
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.");
    process.exit(2);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: p, error } = await sb
    .from("pengurus")
    .select("id, nama, peran")
    .eq("id", pengurusId)
    .maybeSingle();
  if (error) throw error;
  if (!p) {
    console.error("Pengurus tidak ditemukan: " + pengurusId);
    process.exit(1);
  }
  const h = hashPin(pin);
  const { error: updErr } = await sb
    .from("pengurus")
    .update({ pin_hash: h.hash, pin_salt: h.salt, pin_gagal: 0, pin_terkunci_sampai: null })
    .eq("id", p.id);
  if (updErr) throw updErr;
  console.log("PIN diatur untuk " + p.nama + " (" + p.peran + ").");
}

utama().catch(function (e) {
  console.error("Gagal: " + (e && e.message ? e.message : e));
  process.exit(1);
});
