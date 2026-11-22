// Auth Admin: PIN per pengurus + sesi token HMAC (tanpa dependency tambahan).
// PIN di-hash dengan scrypt (salt acak 16 byte); TIDAK ADA PIN yang
// disimpan sebagai teks di mana pun. Sesi = token HMAC-SHA256 yang
// ditandatangani dengan ADMIN_SESSION_SECRET (env di Vercel) dan
// disimpan di cookie httpOnly `mihrab_sesi` (12 jam).
//
// Env yang dibutuhkan (diatur di Vercel, bukan di file ini):
//   ADMIN_SESSION_SECRET — string acak panjang. Bila kosong, semua
//   fungsi di sini melempar error yang jelas (tidak ada fallback secret
//   di kode — secret yang ditebak sama dengan tidak ada auth).
"use strict";

const crypto = require("crypto");

const SESSION_MAX_AGE = 12 * 60 * 60; // detik (12 jam)
const COOKIE_NAMA = "mihrab_sesi";

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) {
    const e = new Error("ADMIN_SESSION_SECRET belum diset");
    e.status = 500;
    throw e;
  }
  return s;
}

// PIN harus tepat 6 digit angka.
function validPin(pin) {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}

// Hash PIN -> { salt, hash } (keduanya hex). Salt baru acak tiap hash.
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(pin, Buffer.from(salt, "hex"), 64)
    .toString("hex");
  return { salt, hash };
}

// Cek PIN terhadap salt+hash tersimpan (perbandingan waktu-konstan).
function cekPin(pin, salt, hash) {
  if (!salt || !hash || typeof pin !== "string") return false;
  let turunan;
  try {
    turunan = crypto.scryptSync(pin, Buffer.from(salt, "hex"), 64);
  } catch (e) {
    return false;
  }
  const tersimpan = Buffer.from(hash, "hex");
  if (turunan.length !== tersimpan.length) return false;
  return crypto.timingSafeEqual(turunan, tersimpan);
}

// Token: base64url(JSON {id, peran, exp}) + "." + base64url(HMAC-SHA256).
function buatToken(pengurus) {
  const payload = {
    id: pengurus.id,
    peran: pengurus.peran,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const bagian = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(bagian)
    .digest("base64url");
  return bagian + "." + sig;
}

// Baca + verifikasi token dari cookie. Kembalikan {id, peran} atau null
// bila tidak ada / tanda tangan salah / isi rusak / sudah kedaluwarsa.
// Melempar 500 bila ADMIN_SESSION_SECRET belum diset.
function bacaToken(req) {
  const cookie = (req.headers && req.headers.cookie) || "";
  const bagian = cookie
    .split(";")
    .map(function (s) { return s.trim(); })
    .find(function (s) { return s.indexOf(COOKIE_NAMA + "=") === 0; });
  if (!bagian) return null;
  const token = bagian.slice(COOKIE_NAMA.length + 1);
  const pisah = token.split(".");
  if (pisah.length !== 2) return null;
  const harap = crypto
    .createHmac("sha256", secret())
    .update(pisah[0])
    .digest("base64url");
  const a = Buffer.from(pisah[1]);
  const b = Buffer.from(harap);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(pisah[0], "base64url").toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.id || !payload.peran || !payload.exp) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return { id: payload.id, peran: payload.peran };
}

// Nilai header Set-Cookie untuk sesi (dipakai login) dan penghapusannya.
function cookieSesi(token) {
  return (
    COOKIE_NAMA + "=" + token +
    "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + SESSION_MAX_AGE
  );
}
function cookieHapus() {
  return COOKIE_NAMA + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

// Wajib dipakai di awal setiap handler API Admin (kecuali /api/board.js
// yang publik dan endpoint auth itu sendiri). Melempar 401 bila tidak
// ada sesi yang sah, 403 bila peran tidak termasuk peranDiizinkan.
// Kembalikan {id, peran} pengurus yang login.
function butuhAuth(req, res, peranDiizinkan) {
  const saya = bacaToken(req);
  if (!saya) {
    const e = new Error("Belum masuk — silakan masuk dulu");
    e.status = 401;
    throw e;
  }
  if (peranDiizinkan && !peranDiizinkan.includes(saya.peran)) {
    const e = new Error("Peran Anda tidak boleh mengakses ini");
    e.status = 403;
    throw e;
  }
  return saya;
}

module.exports = {
  validPin,
  hashPin,
  cekPin,
  buatToken,
  bacaToken,
  cookieSesi,
  cookieHapus,
  butuhAuth,
  SESSION_MAX_AGE,
};
