// GET/POST /api/whatsapp — service WhatsApp Mihrab Connect (Meta Cloud API).
//
// Kontrak spek backend §4.3, dengan keputusan founder 22 Nov 2026 yang
// MENGALAHKAN spek: SEMUA kiriman WhatsApp masuk status 'menunggu'
// (ketua menyetujui dari dashboard). Auto-tayang bila pengirim ketua TIDAK
// berlaku di sini — ketiga pengurus berbagi satu nomor, jadi peran pengirim
// tidak bisa dibedakan dari nomor. Karena itu pengirim_id diisi null untuk
// kiriman WhatsApp dan nomor mentah dicatat di log_aktivitas.
//
// Rute (satu dispatcher, jangan tambah file api lain):
//   GET  /api/whatsapp?hub.mode=subscribe&hub.verify_token&hub.challenge
//        -> verifikasi webhook Meta (bandingkan META_VERIFY_TOKEN).
//   POST /api/whatsapp (+ /whatsapp/kiriman)
//        -> event webhook Meta; verifikasi X-Hub-Signature-256
//           = HMAC-SHA256(raw body, META_APP_SECRET) sebelum memproses.
//   GET  /api/whatsapp?aksi=status&id=<pengumuman_id>
//        -> status kiriman (menunggu/tayang/selesai).
//   POST /api/whatsapp?aksi=notifikasi (+ /whatsapp/notifikasi)
//        -> kirim pesan WhatsApp ke pengirim; dilindungi header
//           x-internal-secret = WHATSAPP_INTERNAL_SECRET.
//
// Batas keras: kas TIDAK PERNAH ditulis dari WhatsApp — perintah yang
// menyentuh kas ditolak dan penolakannya dicatat di log_aktivitas.
// Semua kredensial Meta BELUM ADA (user belum buat akun Meta Business /
// nomor): service fail-closed dengan pesan jelas bila env var belum diset,
// bukan crash dan bukan berpura-pura berhasil.
//
// Tabel: pengumuman, pengurus, murotal_settings, log_aktivitas.
// Catatan schema: pengumuman TIDAK punya kolom judul/poster_url — judul
// diturunkan dari baris pertama isi; foto TIDAK tersimpan sebagai poster
// (belum ada Storage bucket), hanya caption + media id yang dicatat.
"use strict";

const crypto = require("crypto");
const { supabase, getMasjidId, tulisLog } = require("../lib/supabase");
const {
  ok,
  gagal,
  hanyaMethod,
  bacaJson,
  bacaRawBody,
  salahInput,
  tidakKetemu,
} = require("../lib/http");

const GRAPH_VERSION = "v21.0";
const MAX_PESAN = 4000;

// ---------- util ----------

function judulDariIsi(isi) {
  var t = String(isi || "").split("\n")[0].trim();
  if (!t) return "(tanpa judul)";
  return t.length > 200 ? t.slice(0, 200) : t;
}

// Nomor ke format lokal 08xx (untuk dicocokkan ke pengurus.no_whatsapp).
function normalisasiNomor(nomor) {
  const d = String(nomor || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return "0" + d.slice(2);
  if (d.startsWith("8")) return "0" + d;
  return d;
}

// Nomor ke format internasional 62xx (untuk Graph API `to`).
function nomorKeInternasional(nomor) {
  const d = String(nomor || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("8")) return "62" + d;
  return d;
}

function teksDariPesan(msg) {
  if (!msg) return "";
  if (msg.type === "text" && msg.text) return String(msg.text.body || "").trim();
  if (msg.type === "image" && msg.image) return String(msg.image.caption || "").trim();
  return "";
}

// Heuristik perintah kas: kata kerja pencatatan + kata kas, atau jumlah
// uang + kata kas. Pengumuman biasa yang menyebut infaq tanpa jumlah /
// tanpa kata kerja pencatatan BUKAN perintah kas — masuk antrean normal
// dan tetap ditinjau ketua di dashboard.
function isPerintahKas(teks) {
  const t = String(teks || "");
  if (
    /\b(catat|tambah|lapor|input|masukkan|keluarkan|kurangi)\b[^.\n]{0,60}\b(kas|infaq|uang|dana|saldo|pemasukan|pengeluaran|qris|donasi|sedekah|zakat)\b/i.test(
      t
    )
  )
    return true;
  if (
    /\b(kas|infaq|saldo|pemasukan|pengeluaran|dana|donasi|sedekah|zakat)\b[^.\n]{0,40}\b(rp|sebesar|total)\b\s*[\d.,]+/i.test(
      t
    )
  )
    return true;
  if (
    /\brp\s*[\d.,]{3,}/i.test(t) &&
    /\b(kas|infaq|dana|saldo|pemasukan|pengeluaran|donasi|sedekah|zakat|uang)\b/i.test(t)
  )
    return true;
  return false;
}

function klasifikasiJenis(teks) {
  const t = String(teks || "");
  if (/duka|meninggal|wafat|innalillahi|turut berduka|lelayu|kabar duka/i.test(t))
    return "Berita Duka";
  if (/khatib|imam|muadzin|jadwal|petugas|piket/i.test(t)) return "Jadwal";
  return "Pengumuman";
}

// ---------- kirim WhatsApp (Graph API) ----------

// Mengirim pesan teks. TIDAK PERNAH throw: kembalikan { ok, alasan? }.
// Bila kredensial Meta belum diatur -> { ok:false } supaya pemanggil tetap
// menyimpan kiriman / mencatat log, hanya balasannya yang batal.
async function kirimWhatsApp(toLokal, pesan) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return {
      ok: false,
      alasan:
        "Kredensial Meta belum diatur (META_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)",
    };
  }
  const to = nomorKeInternasional(toLokal);
  if (!to) return { ok: false, alasan: "Nomor tujuan tidak valid" };
  try {
    const resp = await fetch(
      "https://graph.facebook.com/" + GRAPH_VERSION + "/" + phoneId + "/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: pesan, preview_url: false },
        }),
      }
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        ok: false,
        alasan:
          "Graph API " +
          resp.status +
          ": " +
          (data.error && data.error.message ? data.error.message : "gagal mengirim"),
      };
    }
    return {
      ok: true,
      message_id: data.messages && data.messages[0] ? data.messages[0].id : null,
    };
  } catch (e) {
    return { ok: false, alasan: "Gagal menghubungi Graph API: " + e.message };
  }
}

async function balasJikaBisa(to, pesan) {
  try {
    return await kirimWhatsApp(to, pesan);
  } catch (e) {
    return { ok: false, alasan: e.message };
  }
}

// ---------- verifikasi webhook Meta (GET) ----------

async function verifikasiWebhook(req, res) {
  const mode = (req.query && req.query["hub.mode"]) || "";
  const token = (req.query && req.query["hub.verify_token"]) || "";
  const challenge = (req.query && req.query["hub.challenge"]) || "";
  if (mode !== "subscribe") throw salahInput("hub.mode harus 'subscribe'");
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) {
    const e = new Error(
      "Webhook WhatsApp belum dikonfigurasi: env META_VERIFY_TOKEN belum diatur di Vercel"
    );
    e.status = 403;
    throw e;
  }
  if (!token || token !== verifyToken) {
    const e = new Error("Verify token tidak cocok");
    e.status = 403;
    throw e;
  }
  if (!challenge) throw salahInput("hub.challenge tidak ada");
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(String(challenge));
}

// ---------- webhook intake (POST) ----------

function verifikasiSignature(raw, signature, secret) {
  if (!signature || typeof signature !== "string") return false;
  const m = signature.match(/^sha256=([0-9a-fA-F]{64})$/);
  if (!m) return false;
  const diharapkan = crypto.createHmac("sha256", secret).update(raw).digest();
  const diterima = Buffer.from(m[1], "hex");
  if (diterima.length !== diharapkan.length) return false;
  return crypto.timingSafeEqual(diterima, diharapkan);
}

async function terimaWebhook(req, res) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    const e = new Error(
      "Webhook WhatsApp belum dikonfigurasi: env META_APP_SECRET belum diatur di Vercel"
    );
    e.status = 403;
    throw e;
  }
  const signature = req.headers["x-hub-signature-256"] || "";
  const raw = await bacaRawBody(req);
  if (!verifikasiSignature(raw, signature, appSecret)) {
    const e = new Error("Signature webhook tidak valid");
    e.status = 401;
    throw e;
  }
  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch (e) {
    throw salahInput("Body webhook bukan JSON yang valid");
  }
  const sb = supabase();
  const masjidId = await getMasjidId(sb);
  const hasil = await prosesEvent(sb, masjidId, event);
  ok(res, { diterima: true, diproses: hasil.diproses, ditolak: hasil.ditolak, duplikat: hasil.duplikat });
}

async function prosesEvent(sb, masjidId, event) {
  let diproses = 0;
  let ditolak = 0;
  let duplikat = 0;
  const entries = (event && event.entry) || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value || {};
      if (value.messaging_product && value.messaging_product !== "whatsapp") continue;
      const nomorBisnis = normalisasiNomor(
        (value.metadata && value.metadata.display_phone_number) || ""
      );
      const messages = value.messages || [];
      for (const msg of messages) {
        const dari = normalisasiNomor(msg.from || "");
        if (!dari) {
          ditolak++;
          continue;
        }
        // Pesan dari nomor bisnis sendiri (echo) — abaikan.
        if (nomorBisnis && dari === nomorBisnis) continue;
        const r = await prosesPesan(sb, masjidId, { dari, msg });
        if (r === "ok") diproses++;
        else if (r === "duplikat") duplikat++;
        else ditolak++;
      }
    }
  }
  return { diproses, ditolak, duplikat };
}

async function prosesPesan(sb, masjidId, { dari, msg }) {
  // Cocokkan nomor pengirim ke pengurus terdaftar.
  const { data: pengurus, error } = await sb
    .from("pengurus")
    .select("id, nama, peran, no_whatsapp")
    .eq("masjid_id", masjidId)
    .eq("whatsapp_terdaftar", true);
  if (error) throw error;
  const cocok = (pengurus || []).filter(
    (p) => normalisasiNomor(p.no_whatsapp || "") === dari
  );
  if (!cocok.length) {
    await tulisLog(sb, {
      masjidId,
      pengurusId: null,
      aksi: "Menolak kiriman WhatsApp",
      detail:
        "Nomor " +
        dari +
        " tidak terdaftar sebagai pengurus — kiriman tidak disimpan",
    });
    await balasJikaBisa(
      dari,
      "Maaf, nomor ini tidak terdaftar sebagai pengurus masjid. Hubungi ketua masjid untuk mendaftarkan nomor Anda."
    );
    return "tolak";
  }
  // Nomor bersama: tidak bisa dipetakan ke satu orang -> pengirim_id null,
  // nomor mentah + nama-nama yang berbagi nomor dicatat di log.
  const namaPengirim = cocok.map((p) => p.nama).join(", ");
  const teks = teksDariPesan(msg);
  const mediaId =
    msg.type === "image" && msg.image ? msg.image.id || null : null;
  const wamid = msg.id || null;

  // 1) Perintah kas -> tolak keras (batas keras spek §3 + keputusan founder).
  if (teks && isPerintahKas(teks)) {
    await tulisLog(sb, {
      masjidId,
      pengurusId: null,
      aksi: "Menolak perintah kas via WhatsApp",
      detail:
        'Perintah kas dari ' +
        dari +
        " (" +
        namaPengirim +
        ") ditolak — kas hanya dicatat dari dashboard: \"" +
        judulDariIsi(teks) +
        '"',
    });
    await balasJikaBisa(
      dari,
      "Kas tidak bisa dicatat lewat WhatsApp — pencatatan kas hanya dari dashboard Admin oleh ketua/bendahara."
    );
    return "tolak";
  }

  // 2) Perintah stop murotal -> matikan flag aktif hari ini.
  // Schema punya kolom murotal_settings.aktif (boolean) — TIDAK ada kolom
  // tanggal, jadi murotal tetap mati sampai dinyalakan lagi dari dashboard.
  if (teks && /murotal/i.test(teks) && /\b(stop|matikan|berhenti|hentikan|off)\b/i.test(teks)) {
    const { error: upErr } = await sb
      .from("murotal_settings")
      .update({ aktif: false })
      .eq("masjid_id", masjidId);
    if (upErr) throw upErr;
    await tulisLog(sb, {
      masjidId,
      pengurusId: null,
      aksi: "Mematikan murotal via WhatsApp",
      detail:
        "Murotal dimatikan atas perintah WhatsApp dari " +
        dari +
        " (" +
        namaPengirim +
        "). Nyalakan kembali dari dashboard Admin (pengaturan murotal) — belum ada jadwal nyala otomatis.",
    });
    await balasJikaBisa(
      dari,
      "Murotal dimatikan untuk hari ini. Untuk menyalakan lagi, ubah dari dashboard Admin."
    );
    return "ok";
  }

  // 3) Cek status kiriman terakhir (sumber whatsapp, masjid ini).
  // Nomor bersama -> status yang dilaporkan adalah kiriman WhatsApp
  // terakhir masjid ini, bukan per-orang.
  if (
    teks &&
    /^(cek\s+status|cek\s+kiriman|status(\s+kiriman)?|apakah\s+.*tayang)/i.test(
      teks.trim()
    )
  ) {
    const { data: terakhir, error: cariErr } = await sb
      .from("pengumuman")
      .select("id, isi, jenis, status, created_at")
      .eq("masjid_id", masjidId)
      .eq("sumber", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cariErr) throw cariErr;
    if (!terakhir) {
      await balasJikaBisa(dari, "Belum ada kiriman WhatsApp yang tercatat untuk masjid ini.");
    } else {
      await balasJikaBisa(
        dari,
        "Kiriman terakhir (" +
          judulDariIsi(terakhir.isi) +
          "): status " +
          terakhir.status +
          "."
      );
    }
    await tulisLog(sb, {
      masjidId,
      pengurusId: null,
      aksi: "Cek status via WhatsApp",
      detail: "Permintaan cek status dari " + dari + " (" + namaPengirim + ")",
    });
    return "ok";
  }

  // 4) Tipe pesan lain (audio, video, dokumen, stiker, lokasi...) belum didukung.
  if (!teks && msg.type !== "image") {
    await tulisLog(sb, {
      masjidId,
      pengurusId: null,
      aksi: "Kiriman WhatsApp tidak didukung",
      detail:
        "Tipe pesan " +
        msg.type +
        " dari " +
        dari +
        " (" +
        namaPengirim +
        ") belum didukung — hanya teks dan foto + caption yang diproses",
    });
    await balasJikaBisa(
      dari,
      "Maaf, untuk saat ini hanya pesan teks dan foto + caption yang bisa diproses."
    );
    return "tolak";
  }

  // 5) Dedup: Meta me-retry webhook bila respons bukan 2xx. Bila wamid
  // sudah pernah diproses (tercatat di log), lewati tanpa insert ganda.
  if (wamid) {
    const { data: logLama, error: logErr } = await sb
      .from("log_aktivitas")
      .select("id, detail")
      .eq("masjid_id", masjidId)
      .eq("aksi", "Menerima kiriman WhatsApp")
      .order("created_at", { ascending: false })
      .limit(10);
    if (logErr) throw logErr;
    if ((logLama || []).some((l) => String(l.detail || "").includes("wamid:" + wamid))) {
      return "duplikat";
    }
  }

  // 6) Simpan sebagai pengumuman status 'menunggu' (keputusan founder).
  const jenis = klasifikasiJenis(teks);
  const isi = teks || "[Foto WhatsApp — tanpa caption]";
  const { data, error: insErr } = await sb
    .from("pengumuman")
    .insert({
      masjid_id: masjidId,
      isi,
      jenis,
      sumber: "whatsapp",
      pengirim_id: null,
      status: "menunggu",
    })
    .select("id, isi, jenis, status, created_at")
    .single();
  if (insErr) throw insErr;
  await tulisLog(sb, {
    masjidId,
    pengurusId: null,
    aksi: "Menerima kiriman WhatsApp",
    detail:
      jenis +
      ': "' +
      judulDariIsi(isi) +
      '" dari ' +
      dari +
      " (" +
      namaPengirim +
      ") — masuk antrean menunggu persetujuan ketua" +
      (mediaId
        ? " — media id " + mediaId + " (foto belum tersimpan sebagai poster: pengumuman tidak punya kolom poster_url)"
        : "") +
      (wamid ? " — wamid:" + wamid : ""),
  });
  await balasJikaBisa(
    dari,
    "Terima kasih — kiriman Anda diterima dan menunggu persetujuan ketua sebelum tampil di TV."
  );
  return "ok";
}

// ---------- status kiriman (GET ?aksi=status) ----------

async function statusKiriman(req, res) {
  const id = String((req.query && req.query.id) || "").trim();
  if (!id) throw salahInput("Parameter id wajib diisi (?aksi=status&id=...)");
  const sb = supabase();
  const masjidId = await getMasjidId(sb);
  const { data, error } = await sb
    .from("pengumuman")
    .select("id, isi, jenis, status, sumber, created_at")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw tidakKetemu("Kiriman tidak ditemukan");
  ok(res, {
    id: data.id,
    status: data.status,
    jenis: data.jenis,
    judul: judulDariIsi(data.isi),
    dibuat: data.created_at,
  });
}

// ---------- notifikasi (POST ?aksi=notifikasi) ----------

async function nomorPengurusTerdaftar(sb, masjidId, pengirimId) {
  let q = sb
    .from("pengurus")
    .select("id, no_whatsapp")
    .eq("masjid_id", masjidId)
    .eq("whatsapp_terdaftar", true);
  if (pengirimId) q = q.eq("id", pengirimId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || [])
    .map((p) => normalisasiNomor(p.no_whatsapp || ""))
    .filter(Boolean);
}

async function kirimNotifikasi(req, res) {
  const secret = process.env.WHATSAPP_INTERNAL_SECRET;
  if (!secret) {
    const e = new Error(
      "Layanan notifikasi belum dikonfigurasi: env WHATSAPP_INTERNAL_SECRET belum diatur di Vercel"
    );
    e.status = 503;
    throw e;
  }
  const header = req.headers["x-internal-secret"];
  if (!header || header !== secret) {
    const e = new Error("x-internal-secret tidak cocok");
    e.status = 401;
    throw e;
  }
  const body = await bacaJson(req);
  const pesan = String((body && body.pesan) || "").trim();
  if (!pesan) throw salahInput("pesan wajib diisi");
  if (pesan.length > MAX_PESAN)
    throw salahInput("pesan terlalu panjang (maks " + MAX_PESAN + " karakter)");
  const sb = supabase();
  const masjidId = await getMasjidId(sb);
  let tujuan = [];
  if (body.pengumuman_id) {
    const { data: p, error } = await sb
      .from("pengumuman")
      .select("id, isi, jenis, status, pengirim_id")
      .eq("id", body.pengumuman_id)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengumuman tidak ditemukan");
    // pengirim_id null (nomor bersama) -> kirim ke semua nomor pengurus
    // terdaftar (di pilot hanya ada 1 nomor yang dipakai bertiga).
    tujuan = await nomorPengurusTerdaftar(sb, masjidId, p.pengirim_id);
  } else if (body.to) {
    tujuan = [normalisasiNomor(String(body.to))];
  } else {
    throw salahInput("Kirim to (nomor tujuan) atau pengumuman_id");
  }
  tujuan = [...new Set(tujuan.filter(Boolean))];
  if (!tujuan.length) {
    const e = new Error("Tidak ada nomor WhatsApp terdaftar untuk tujuan notifikasi ini");
    e.status = 409;
    throw e;
  }
  const hasil = [];
  for (const t of tujuan) {
    const r = await kirimWhatsApp(t, pesan);
    hasil.push({ to: t, ok: r.ok, alasan: r.alasan || null, message_id: r.message_id || null });
  }
  const terkirim = hasil.filter((h) => h.ok).length;
  await tulisLog(sb, {
    masjidId,
    pengurusId: null,
    aksi: "Mengirim notifikasi WhatsApp",
    detail:
      "Ke " +
      tujuan.join(", ") +
      ": " +
      pesan.slice(0, 200) +
      (terkirim === 0 ? " — GAGAL: " + (hasil[0].alasan || "") : ""),
  });
  if (terkirim === 0) {
    const e = new Error("Gagal mengirim notifikasi: " + (hasil[0].alasan || "kesalahan pengiriman"));
    e.status = 502;
    throw e;
  }
  ok(res, { terkirim, total: hasil.length, hasil });
}

// ---------- dispatcher ----------

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET", "POST"])) return;
    const aksi = (req.query && req.query.aksi) || "";
    if (req.method === "GET") {
      if (aksi === "status") return await statusKiriman(req, res);
      if ((req.query && req.query["hub.mode"]) || aksi === "verify") {
        return await verifikasiWebhook(req, res);
      }
      throw salahInput(
        "Aksi tidak dikenal — pakai ?aksi=status&id=... atau verifikasi webhook Meta (?hub.mode=subscribe)"
      );
    }
    // POST
    if (aksi === "notifikasi") return await kirimNotifikasi(req, res);
    if (aksi && aksi !== "kiriman") throw salahInput("Aksi tidak dikenal: " + aksi);
    // aksi kosong (/api/whatsapp) atau 'kiriman' (/whatsapp/kiriman):
    // event webhook Meta.
    // PENTING: pakai `return await` — `return <promise>` polos di dalam
    // try pada async function TIDAK ditangkap catch bila promise-nya reject.
    return await terimaWebhook(req, res);
  } catch (err) {
    gagal(res, err);
  }
};
