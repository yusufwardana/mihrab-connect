// Klien Supabase untuk Vercel Serverless Functions (service WhatsApp).
// Memakai SERVICE ROLE KEY (melewati RLS) karena service ini adalah backend
// — bukan klien browser. JANGAN pernah memakai key ini di kode yang dikirim
// ke browser.
//
// Env yang dibutuhkan (diatur di Vercel, bukan di file ini):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Pola sama dengan vercel-admin/lib/supabase.js; bedanya: sumber log
// default di sini 'whatsapp'.
"use strict";

const { createClient } = require("@supabase/supabase-js");

let client = null;

function supabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error(
      "Env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel"
    );
    e.status = 500;
    throw e;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Deployment ini satu masjid: ambil baris masjid pertama (paling lama dibuat).
// Bila nanti ada banyak masjid, ganti dengan masjid_id dari sesi pengguna.
async function getMasjid(sb) {
  const { data, error } = await sb
    .from("masjid")
    .select("id, nama, alamat, koordinat_lat, koordinat_lng, logo_url, foto_url, kontak")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error("Belum ada masjid di tabel masjid");
    e.status = 404;
    throw e;
  }
  return data;
}

async function getMasjidId(sb) {
  const m = await getMasjid(sb);
  return m.id;
}

// Ketua pertama (paling lama dibuat) — dipakai sebagai penyetuju dan
// sebagai pencatat default bila pemanggil tidak menyebut dicatat_oleh.
async function getKetua(sb, masjidId) {
  const { data, error } = await sb
    .from("pengurus")
    .select("id, nama, peran")
    .eq("masjid_id", masjidId)
    .eq("peran", "ketua")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Peta pengurus masjid: id -> { id, nama, peran, no_whatsapp }.
async function getPengurusMap(sb, masjidId) {
  const { data, error } = await sb
    .from("pengurus")
    .select("id, nama, peran, no_whatsapp, whatsapp_terdaftar")
    .eq("masjid_id", masjidId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const map = {};
  (data || []).forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

// Setiap aksi tulis wajib tercatat di log_aktivitas (spesifikasi backend).
async function tulisLog(sb, { masjidId, pengurusId, aksi, detail, sumber }) {
  const { error } = await sb.from("log_aktivitas").insert({
    masjid_id: masjidId,
    pengurus_id: pengurusId || null,
    aksi,
    detail: detail || null,
    sumber: sumber || "whatsapp",
  });
  if (error) throw error;
}

module.exports = { supabase, getMasjid, getMasjidId, getKetua, getPengurusMap, tulisLog };
