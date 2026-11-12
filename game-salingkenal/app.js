/* Saling Kenal
 * Alat bantu bertanya untuk proses ta'aruf, untuk dua pemain yang terhubung lewat internet (PeerJS / WebRTC).
 * Pembuat ruangan (host) menyimpan keadaan permainan. Semua aksi diproses di fungsi aksi() di HP host.
 *
 * Tahap: atur (susun pertanyaan) -> jawab -> nilai -> perjelas (kalau ada yang diminta) -> selesai.
 * Mode pengembangan: tambahkan ?dev=1 di alamat. Kedua pemain disimulasikan di satu layar tanpa koneksi.
 */
(function () {
  "use strict";

  const VERSI = 1;
  const AWALAN_ID = "salingkenal-";
  const HURUF_KODE = "ACDEFGHJKMNPQRTUVWXY34679";   // tanpa huruf yang mudah tertukar (O/0, I/1, S/5, Z/2, B/8)
  const KUNCI_SESI = "salingkenal-sesi";
  const BATAS_SENYAP = 12000;
  const PILIHAN_JUMLAH = [3, 5, 7, 10];
  const ARTI_BINTANG = ["", "Tidak jelas", "Cukup tidak jelas", "Cukup jelas", "Jelas", "Sangat jelas"];
  const URUTAN_FASE = ["atur", "jawab", "nilai", "perjelas", "selesai"];
  const DEV = new URLSearchParams(location.search).get("dev") === "1";

  // ---------- Keadaan lokal ----------
  let peer = null, conn = null, peran = null, kode = null, namaSaya = "";
  let state = null, terhubung = false, sengajaKeluar = false, pesanTerakhir = 0, timerSambung = null;
  let devPemain = 0;
  let kunciTampil = "";
  // Draf yang sedang diketik di HP ini, per pemain (dua-duanya dipakai di mode pengembangan)
  let draf = [drafBaru(), drafBaru()];

  const $ = (id) => document.getElementById(id);

  function drafBaru() {
    return { langkahAtur: "jumlah", jumlah: 0, kenal: "", tingkat: "", kategori: "", pertanyaan: [], jawaban: [], nilai: [], penjelasan: [] };
  }

  // ---------- Utilitas ----------
  function el(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }
  function toast(teks) {
    const t = $("toast");
    t.textContent = teks;
    t.classList.add("tampil");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("tampil"), 2800);
  }
  function pesan(teks, ok) { $("pesan-awal").textContent = teks || ""; $("pesan-awal").classList.toggle("ok", !!ok); }
  function tampilkanLayar(id) {
    const kini = document.querySelector(".layar.aktif");
    if (kini && kini.id === id) return;
    document.querySelectorAll(".layar").forEach((e) => e.classList.toggle("aktif", e.id === id));
    window.scrollTo(0, 0);
  }
  function buatKode() { let k = ""; for (let i = 0; i < 5; i++) k += HURUF_KODE[Math.floor(Math.random() * HURUF_KODE.length)]; return k; }
  function bersihkanKode(v) { return (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5); }
  function tautanRuangan() { return location.origin + location.pathname + "?room=" + kode; }

  function simpanSesi() {
    if (DEV) return;
    try {
      const data = { peran, kode, nama: namaSaya, draf: draf[indeksSaya()] };
      if (peran === "host") data.state = state;
      localStorage.setItem(KUNCI_SESI, JSON.stringify(data));
    } catch (e) { /* penyimpanan tidak tersedia */ }
  }
  function bacaSesi() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI));
      if (s && s.peran === "host" && (!s.state || s.state.versi !== VERSI)) return null;
      return s;
    } catch (e) { return null; }
  }
  function hapusSesi() { try { localStorage.removeItem(KUNCI_SESI); } catch (e) {} }
  let timerDraf = null;
  function simpanDrafNanti() { clearTimeout(timerDraf); timerDraf = setTimeout(simpanSesi, 500); }

  // Server STUN dan TURN cadangan. Tanpa TURN, dua HP di jaringan seluler
  // sering gagal tersambung langsung sehingga keduanya hanya saling menunggu.
  const ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
    { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" },
  ];
  const BATAS_BUKA = 20000;   // jika jalur belum terbuka dalam 20 detik, coba sambung lagi
  let percobaanGabung = 0, timerBuka = null;
  function opsiPeer() {
    const s = new URLSearchParams(location.search).get("server");   // untuk uji lokal: ?server=127.0.0.1:9000
    if (!s) return { debug: 1, config: { iceServers: ICE_SERVERS } };
    const [host, port] = s.split(":");
    return { host, port: Number(port) || 9000, path: "/", secure: false, debug: 1, config: { iceServers: ICE_SERVERS } };
  }
  function tutupPeer() {
    clearTimeout(timerSambung); timerSambung = null; clearTimeout(timerBuka);
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    conn = null; peer = null;
  }

  // =====================================================================
  // KEADAAN PERMAINAN (hanya diubah oleh host)
  // =====================================================================
  function stateBaru(namaHost) {
    const pemain = () => ({ jumlah: 0, kenal: "", pertanyaan: [], siap: { atur: false, jawab: false, nilai: false, perjelas: false } });
    return {
      versi: VERSI,
      nama: [namaHost, null],
      fase: "atur",
      pemain: [pemain(), pemain()],
      jawaban: [[], []],      // jawaban[p][i]   = jawaban p untuk pertanyaan ke-i dari pasangannya
      nilai: [[], []],        // nilai[p][i]     = penilaian p untuk jawaban pasangan atas pertanyaan ke-i milik p
      penjelasan: [[], []],   // penjelasan[p][i]= penjelasan tambahan p untuk jawabannya sendiri (pertanyaan ke-i dari pasangan)
      mulaiPada: Date.now(),
      selesaiPada: null,
    };
  }

  // Indeks jawaban milik p yang diminta diperjelas oleh pasangannya
  function dimintaPerjelas(s, p) {
    return (s.nilai[1 - p] || []).map((n, i) => (n && n.perjelas ? i : -1)).filter((i) => i >= 0);
  }

  function aksi(oleh, d) {
    if (!state || !d) return;
    const p = state.pemain[oleh];
    const bersih = (x, n) => String(x || "").trim().slice(0, n);
    switch (d.t) {
      case "atur": {
        if (state.fase !== "atur" || p.siap.atur) return;
        const daftar = (Array.isArray(d.pertanyaan) ? d.pertanyaan : []).map((x) => bersih(x, 400)).filter(Boolean).slice(0, 10);
        if (!PILIHAN_JUMLAH.includes(Number(d.jumlah)) || daftar.length !== Number(d.jumlah)) return;
        p.jumlah = daftar.length;
        p.kenal = d.kenal === "lama" ? "lama" : "baru";
        p.pertanyaan = daftar;
        p.siap.atur = true;
        if (state.pemain[0].siap.atur && state.pemain[1].siap.atur) state.fase = "jawab";
        break;
      }
      case "jawab": {
        if (state.fase !== "jawab" || p.siap.jawab) return;
        const n = state.pemain[1 - oleh].pertanyaan.length;
        const daftar = (Array.isArray(d.jawaban) ? d.jawaban : []).map((x) => bersih(x, 3000));
        if (daftar.length !== n || daftar.some((x) => !x)) return;
        state.jawaban[oleh] = daftar;
        p.siap.jawab = true;
        if (state.pemain[0].siap.jawab && state.pemain[1].siap.jawab) state.fase = "nilai";
        break;
      }
      case "nilai": {
        if (state.fase !== "nilai" || p.siap.nilai) return;
        const n = p.pertanyaan.length;
        const daftar = (Array.isArray(d.nilai) ? d.nilai : []).map((x) => ({
          bintang: Math.round(Number(x && x.bintang)),
          catatan: bersih(x && x.catatan, 1000),
          perjelas: !!(x && x.perjelas),
        }));
        if (daftar.length !== n || daftar.some((x) => !(x.bintang >= 1 && x.bintang <= 5))) return;
        state.nilai[oleh] = daftar;
        p.siap.nilai = true;
        if (state.pemain[0].siap.nilai && state.pemain[1].siap.nilai) {
          state.fase = "perjelas";
          // Pemain yang tidak diminta memperjelas apa pun langsung dianggap selesai
          [0, 1].forEach((q) => { if (!dimintaPerjelas(state, q).length) state.pemain[q].siap.perjelas = true; });
          cekSelesai();
        }
        break;
      }
      case "perjelas": {
        if (state.fase !== "perjelas" || p.siap.perjelas) return;
        const minta = dimintaPerjelas(state, oleh);
        const masuk = Array.isArray(d.penjelasan) ? d.penjelasan : [];
        const hasil = [];
        for (const i of minta) {
          const teks = bersih(masuk[i], 3000);
          if (!teks) return;
          hasil[i] = teks;
        }
        state.penjelasan[oleh] = hasil;
        p.siap.perjelas = true;
        cekSelesai();
        break;
      }
      default:
        return;
    }
    kirimDanTerapkan();
  }

  function cekSelesai() {
    if (state.pemain[0].siap.perjelas && state.pemain[1].siap.perjelas) {
      state.fase = "selesai";
      state.selesaiPada = Date.now();
    }
  }

  function kirimDanTerapkan() {
    simpanSesi();
    if (conn && conn.open) conn.send({ t: "state", state });
    terapkanState(state);
  }

  function minta(d) {
    if (DEV) { aksi(devPemain, d); return; }
    if (peran === "host") aksi(0, d);
    else if (conn && conn.open) conn.send(d);
    else toast("Belum terhubung dengan calonmu. Tunggu sebentar, ya.");
  }

  // =====================================================================
  // TAMPILAN
  // =====================================================================
  function indeksSaya() { return DEV ? devPemain : peran === "host" ? 0 : 1; }
  function namaPemain(i) { return (state && state.nama[i]) || (i === indeksSaya() ? namaSaya : "Calonmu"); }

  function terapkanState(s) {
    state = s;
    if (!s.nama[1]) { if (peran === "host") tampilkanRuanganTunggu(); return; }
    tampilkanLayar("layar-main");
    perbaruiBar();
    renderTahap();
  }

  function perbaruiBar() {
    const saya = indeksSaya();
    [0, 1].forEach((i) => { $("nama-" + i).textContent = namaPemain(i) + (i === saya ? " (kamu)" : ""); });
    const ko = $("status-koneksi");
    ko.className = "koneksi " + (DEV || terhubung ? "on" : "off");
    ko.title = DEV ? "Mode pengembangan" : terhubung ? "Terhubung" : "Tidak terhubung";
    const idx = URUTAN_FASE.indexOf(state.fase);
    document.querySelectorAll("#langkah li").forEach((li) => {
      const j = URUTAN_FASE.indexOf(li.dataset.fase);
      li.classList.toggle("kini", j === idx);
      li.classList.toggle("lewat", j < idx);
    });
    if (DEV) document.querySelectorAll(".dev-pemain").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.p) === devPemain));
      b.textContent = namaPemain(Number(b.dataset.p));
    });
  }

  // Bagian tahap hanya dibangun ulang kalau tahap/pemain/status berubah, supaya ketikan tidak hilang
  function renderTahap() {
    const saya = indeksSaya();
    const d = draf[saya];
    const siap = state.pemain[saya].siap;
    const sudah = state.fase === "selesai" ? true : siap[state.fase];
    const kunci = [state.fase, saya, sudah, state.fase === "atur" ? d.langkahAtur : "", state.selesaiPada].join("|");

    // Kotak menunggu
    const lawan = namaPemain(1 - saya);
    const teksTunggu = {
      atur: lawan + " sedang menyusun pertanyaan...",
      jawab: lawan + " sedang menjawab pertanyaanmu...",
      nilai: lawan + " sedang menilai jawabanmu...",
      perjelas: lawan + " sedang menulis penjelasan tambahan...",
    }[state.fase];
    $("kotak-tunggu").hidden = !(sudah && state.fase !== "selesai");
    $("teks-tunggu").textContent = teksTunggu || "";

    if (kunci === kunciTampil) return;
    kunciTampil = kunci;
    const wadah = $("isi-tahap");
    wadah.innerHTML = "";

    if (sudah && state.fase !== "selesai") {
      const info = el("div", "kartu-panel tengah");
      info.appendChild(el("p", "judul-tahap", {
        atur: "Pertanyaanmu sudah terkirim",
        jawab: "Jawabanmu sudah terkirim",
        nilai: "Penilaianmu sudah terkirim",
        perjelas: state.fase === "perjelas" && !dimintaPerjelas(state, saya).length ? "Tidak ada jawabanmu yang diminta diperjelas" : "Penjelasanmu sudah terkirim",
      }[state.fase]));
      info.appendChild(el("p", "ket-tahap", "Tahap berikutnya dimulai otomatis setelah " + lawan + " selesai."));
      wadah.appendChild(info);
      return;
    }
    ({ atur: renderAtur, jawab: renderJawab, nilai: renderNilai, perjelas: renderPerjelas, selesai: renderSelesai })[state.fase](wadah, saya, d);
    requestAnimationFrame(() => wadah.querySelectorAll("textarea").forEach(sesuaikanTinggi));
    window.scrollTo(0, 0);
  }

  function panelJudul(judul, ket) {
    const p = el("div", "kartu-panel");
    p.appendChild(el("p", "judul-tahap", judul));
    if (ket) p.appendChild(el("p", "ket-tahap", ket));
    return p;
  }

  // ---------- Tahap 1: susun pertanyaan ----------
  function renderAtur(wadah, saya, d) {
    const lawan = namaPemain(1 - saya);
    if (d.langkahAtur === "jumlah") {
      const p = panelJudul("Berapa pertanyaan yang ingin kamu ajukan?", "Pilih jumlah pertanyaan untuk " + lawan + ". Tidak harus sama, sesuaikan saja dengan kebutuhanmu.");
      const pil = el("div", "pilihan");
      PILIHAN_JUMLAH.forEach((n) => {
        const b = el("button", "opsi-angka"); b.type = "button";
        b.append(el("b", null, String(n)), el("small", null, " pertanyaan"));
        b.setAttribute("aria-pressed", String(d.jumlah === n));
        b.addEventListener("click", () => { d.jumlah = n; d.pertanyaan = d.pertanyaan.slice(0, n); d.langkahAtur = "kenal"; simpanDrafNanti(); renderUlang(); });
        pil.appendChild(b);
      });
      p.appendChild(pil);
      wadah.appendChild(p);
      return;
    }
    if (d.langkahAtur === "kenal") {
      const p = panelJudul("Seberapa jauh kamu sudah mengenal " + lawan + "?", "Pilihan ini membantu kami menyarankan pertanyaan yang pas. Semua tingkat tetap bisa kamu buka.");
      const pil = el("div", "pilihan");
      [["baru", "Baru kenal", "Disarankan mulai dari pertanyaan dasar"], ["lama", "Sudah kenal lama", "Disarankan pertanyaan yang lebih konkret dan mendalam"]].forEach(([id, judul, ket]) => {
        const b = el("button", "opsi-besar"); b.type = "button";
        b.append(el("span", null, judul), el("small", null, ket));
        b.setAttribute("aria-pressed", String(d.kenal === id));
        b.addEventListener("click", () => {
          d.kenal = id; d.tingkat = id === "lama" ? "lanjutan" : "dasar"; d.langkahAtur = "susun"; simpanDrafNanti(); renderUlang();
        });
        pil.appendChild(b);
      });
      p.appendChild(pil);
      const kembali = el("button", "btn tipis", "Ubah jumlah pertanyaan"); kembali.type = "button";
      kembali.addEventListener("click", () => { d.langkahAtur = "jumlah"; renderUlang(); });
      p.appendChild(kembali);
      wadah.appendChild(p);
      return;
    }

    // Susun
    const p = panelJudul("Susun " + d.jumlah + " pertanyaan untuk " + lawan,
      "Tulis sendiri, pilih dari bantuan pertanyaan di bawah, atau biarkan kami pilihkan. Semua pertanyaan tetap bisa kamu sunting.");
    const pilihkan = el("button", "btn kedua", "Pilihkan untukku"); pilihkan.type = "button";
    pilihkan.addEventListener("click", () => {
      // Isi kolom kosong dengan satu pertanyaan per kategori penting, sesuai tingkat yang dipilih
      const dipakai = new Set(slots.map((t) => t.value.trim()));
      const urutan = URUTAN_PRIORITAS.map((id) => BANK_PERTANYAAN.find((k) => k.id === id)).filter(Boolean);
      let terisi = 0;
      for (const kat of urutan) {
        const kosong = slots.findIndex((t) => !t.value.trim());
        if (kosong < 0) break;
        const calon = (kat[d.tingkat] || []).concat(kat.menengah || [], kat.dasar || [], kat.lanjutan || []).find((q) => !dipakai.has(q));
        if (!calon) continue;
        slots[kosong].value = calon; d.pertanyaan[kosong] = calon; dipakai.add(calon); sesuaikanTinggi(slots[kosong]); terisi++;
      }
      perbaruiTombolAtur(); tandaiBank(); simpanDrafNanti();
      toast(terisi ? terisi + " pertanyaan sudah dipilihkan. Silakan sunting kalau perlu." : "Semua kolom sudah terisi.");
    });
    p.appendChild(pilihkan);
    const slots = [];
    for (let i = 0; i < d.jumlah; i++) {
      const s = el("div", "slot");
      s.appendChild(el("span", "no", String(i + 1)));
      const ta = el("textarea"); ta.maxLength = 400; ta.rows = 2; ta.placeholder = "Pertanyaan ke-" + (i + 1);
      ta.value = d.pertanyaan[i] || "";
      ta.addEventListener("input", () => { d.pertanyaan[i] = ta.value; perbaruiTombolAtur(); tandaiBank(); simpanDrafNanti(); });
      // Tombol tong sampah: kosongkan kolom ini dengan sekali ketuk
      const hapus = el("button", "hapus-slot"); hapus.type = "button";
      hapus.title = "Kosongkan pertanyaan ke-" + (i + 1); hapus.setAttribute("aria-label", hapus.title);
      hapus.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
      hapus.addEventListener("click", () => {
        ta.value = ""; d.pertanyaan[i] = ""; sesuaikanTinggi(ta);
        perbaruiTombolAtur(); tandaiBank(); simpanDrafNanti(); ta.focus();
      });
      s.append(ta, hapus); p.appendChild(s); slots.push(ta);
    }
    const kirim = el("button", "btn utama", "Kirim pertanyaan"); kirim.type = "button"; kirim.id = "btn-kirim-atur";
    kirim.addEventListener("click", () => {
      const daftar = slots.map((t) => t.value.trim());
      if (daftar.some((x) => !x)) { toast("Lengkapi semua pertanyaan dulu, ya."); return; }
      minta({ t: "atur", jumlah: d.jumlah, kenal: d.kenal, pertanyaan: daftar });
    });
    const ubah = el("button", "btn tipis", "Ubah jumlah atau tingkat kenal"); ubah.type = "button";
    ubah.addEventListener("click", () => { d.langkahAtur = "jumlah"; renderUlang(); });
    p.append(kirim, ubah);
    wadah.appendChild(p);

    // Bank pertanyaan
    const bank = el("div", "bank");
    const kep = el("div", "bank-kepala");
    kep.append(el("b", null, "Bantuan pertanyaan"), el("small", null, d.kenal === "lama" ? "Sudah kenal lama" : "Baru kenal"));
    bank.appendChild(kep);
    const tab = el("div", "tab-tingkat");
    TINGKAT.forEach((t) => {
      const b = el("button", null, t.nama); b.type = "button";
      b.setAttribute("aria-pressed", String(d.tingkat === t.id));
      b.addEventListener("click", () => { d.tingkat = t.id; tab.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); isiDaftar(); });
      tab.appendChild(b);
    });
    bank.appendChild(tab);
    const sel = el("select");
    sel.appendChild(new Option("Semua kategori", ""));
    BANK_PERTANYAAN.forEach((k) => sel.appendChild(new Option(k.nama, k.id)));
    sel.value = d.kategori || "";
    sel.addEventListener("change", () => { d.kategori = sel.value; isiDaftar(); });
    bank.appendChild(sel);
    const ul = el("ul", "daftar-bank");
    bank.appendChild(ul);
    wadah.appendChild(bank);

    function isiDaftar() {
      ul.innerHTML = "";
      BANK_PERTANYAAN.filter((k) => !d.kategori || k.id === d.kategori).forEach((k) => {
        (k[d.tingkat] || []).forEach((q) => {
          const li = el("li"); li.dataset.q = q;
          li.appendChild(el("span", null, q));
          const b = el("button", "btn kedua kecil", "Pakai"); b.type = "button";
          b.addEventListener("click", () => {
            const kosong = slots.findIndex((t) => !t.value.trim());
            if (kosong < 0) { toast("Semua kolom sudah terisi. Ketuk ikon tong sampah untuk mengosongkan salah satunya."); return; }
            slots[kosong].value = q; d.pertanyaan[kosong] = q; sesuaikanTinggi(slots[kosong]);
            perbaruiTombolAtur(); tandaiBank(); simpanDrafNanti();
            toast("Dipakai untuk pertanyaan ke-" + (kosong + 1));
          });
          li.appendChild(b); ul.appendChild(li);
        });
      });
      if (!ul.children.length) ul.appendChild(el("li", null, "Belum ada pertanyaan di tingkat ini untuk kategori tersebut."));
      tandaiBank();
    }
    function tandaiBank() {
      const dipakai = new Set(slots.map((t) => t.value.trim()));
      ul.querySelectorAll("li[data-q]").forEach((li) => li.classList.toggle("dipakai", dipakai.has(li.dataset.q)));
    }
    function perbaruiTombolAtur() { kirim.disabled = slots.some((t) => !t.value.trim()) || !(DEV || terhubung); }
    isiDaftar();
    perbaruiTombolAtur();
  }

  // ---------- Tahap 2: jawab ----------
  function renderJawab(wadah, saya, d) {
    const lawan = namaPemain(1 - saya);
    const daftar = state.pemain[1 - saya].pertanyaan;
    wadah.appendChild(panelJudul("Jawab pertanyaan dari " + lawan, daftar.length + " pertanyaan menunggu jawabanmu. Jawab dengan jujur dan secukupnya, tidak perlu terburu-buru."));
    const kolom = daftar.map((q, i) => {
      const it = el("div", "item");
      it.appendChild(el("p", "item-no", "Pertanyaan " + (i + 1)));
      it.appendChild(el("p", "item-tanya", q));
      const ta = el("textarea"); ta.maxLength = 3000; ta.rows = 4; ta.placeholder = "Tulis jawabanmu";
      ta.value = d.jawaban[i] || "";
      ta.addEventListener("input", () => { d.jawaban[i] = ta.value; cek(); simpanDrafNanti(); });
      it.appendChild(ta); wadah.appendChild(it);
      return ta;
    });
    const kirim = el("button", "btn utama", "Kirim semua jawaban"); kirim.type = "button";
    kirim.addEventListener("click", () => {
      const isi = kolom.map((t) => t.value.trim());
      if (isi.some((x) => !x)) { toast("Masih ada pertanyaan yang belum dijawab."); return; }
      minta({ t: "jawab", jawaban: isi });
    });
    wadah.appendChild(kirim);
    function cek() { kirim.disabled = kolom.some((t) => !t.value.trim()) || !(DEV || terhubung); }
    cek();
  }

  // ---------- Tahap 3: nilai ----------
  function renderNilai(wadah, saya, d) {
    const lawan = namaPemain(1 - saya);
    const tanya = state.pemain[saya].pertanyaan;
    const jawab = state.jawaban[1 - saya];
    wadah.appendChild(panelJudul("Nilai jawaban " + lawan,
      "Beri nilai 1 sampai 5 untuk kejelasan setiap jawaban. Catatan boleh dikosongkan. Tandai \"Minta diperjelas\" kalau kamu ingin " + lawan + " menambahkan penjelasan."));
    const kontrol = tanya.map((q, i) => {
      const n = d.nilai[i] || (d.nilai[i] = { bintang: 0, catatan: "", perjelas: false });
      const it = el("div", "item");
      it.appendChild(el("p", "item-no", "Pertanyaan " + (i + 1)));
      it.appendChild(el("p", "item-tanya", q));
      const j = el("p", "item-jawab"); j.appendChild(el("span", "label-isi", "Jawaban " + lawan)); j.appendChild(document.createTextNode(jawab[i] || ""));
      it.appendChild(j);
      const bt = el("div", "bintang"); bt.setAttribute("role", "radiogroup"); bt.setAttribute("aria-label", "Kejelasan jawaban " + (i + 1));
      const arti = el("p", "arti-bintang");
      const cekPerjelas = el("input"); cekPerjelas.type = "checkbox"; cekPerjelas.checked = n.perjelas;
      const gambar = () => {
        bt.querySelectorAll("button").forEach((b, k) => b.classList.toggle("nyala", k < n.bintang));
        arti.textContent = n.bintang ? n.bintang + " dari 5: " + ARTI_BINTANG[n.bintang] : "Pilih nilai, 1 = tidak jelas sampai 5 = sangat jelas";
      };
      for (let k = 1; k <= 5; k++) {
        const b = el("button", null, "★"); b.type = "button"; b.setAttribute("aria-label", "Nilai " + k + ", " + ARTI_BINTANG[k]);
        b.addEventListener("click", () => {
          n.bintang = k;
          n.perjelas = k <= 2;       // nilai 1 sampai 2 otomatis meminta penjelasan, tetap bisa diubah
          cekPerjelas.checked = n.perjelas;
          gambar(); cek(); simpanDrafNanti();
        });
        bt.appendChild(b);
      }
      it.append(bt, arti);
      const lab = el("label", "cek"); lab.append(cekPerjelas, document.createTextNode("Minta diperjelas"));
      cekPerjelas.addEventListener("change", () => { n.perjelas = cekPerjelas.checked; simpanDrafNanti(); });
      it.appendChild(lab);
      const ta = el("textarea"); ta.maxLength = 1000; ta.rows = 2; ta.placeholder = "Catatan untuk " + lawan + " (boleh dikosongkan)";
      ta.value = n.catatan || "";
      ta.addEventListener("input", () => { n.catatan = ta.value; simpanDrafNanti(); });
      it.appendChild(ta);
      gambar();
      wadah.appendChild(it);
      return n;
    });
    const kirim = el("button", "btn utama", "Kirim penilaian"); kirim.type = "button";
    kirim.addEventListener("click", () => {
      if (kontrol.some((n) => !n.bintang)) { toast("Beri nilai untuk semua jawaban dulu, ya."); return; }
      minta({ t: "nilai", nilai: kontrol.map((n) => ({ bintang: n.bintang, catatan: (n.catatan || "").trim(), perjelas: n.perjelas })) });
    });
    wadah.appendChild(kirim);
    function cek() { kirim.disabled = kontrol.some((n) => !n.bintang) || !(DEV || terhubung); }
    cek();
  }

  // ---------- Tahap 4: perjelas ----------
  function renderPerjelas(wadah, saya, d) {
    const lawan = namaPemain(1 - saya);
    const tanya = state.pemain[1 - saya].pertanyaan;
    const minta_ = dimintaPerjelas(state, saya);
    wadah.appendChild(panelJudul(lawan + " meminta penjelasan tambahan", minta_.length + " jawabanmu diminta diperjelas. Tambahkan penjelasan supaya lebih mudah dipahami."));
    const kolom = minta_.map((i) => {
      const n = state.nilai[1 - saya][i];
      const it = el("div", "item");
      it.appendChild(el("p", "item-no", "Pertanyaan " + (i + 1)));
      it.appendChild(el("p", "item-tanya", tanya[i]));
      const j = el("p", "item-jawab"); j.appendChild(el("span", "label-isi", "Jawabanmu")); j.appendChild(document.createTextNode(state.jawaban[saya][i] || ""));
      it.appendChild(j);
      it.appendChild(barisBintang(n.bintang));
      if (n.catatan) { const c = el("p", "item-catatan"); c.appendChild(el("span", "label-isi", "Catatan " + lawan)); c.appendChild(document.createTextNode(n.catatan)); it.appendChild(c); }
      const ta = el("textarea"); ta.maxLength = 3000; ta.rows = 3; ta.placeholder = "Tulis penjelasan tambahan";
      ta.value = d.penjelasan[i] || "";
      ta.addEventListener("input", () => { d.penjelasan[i] = ta.value; cek(); simpanDrafNanti(); });
      it.appendChild(ta); wadah.appendChild(it);
      return [i, ta];
    });
    const kirim = el("button", "btn utama", "Kirim penjelasan"); kirim.type = "button";
    kirim.addEventListener("click", () => {
      const hasil = [];
      for (const [i, ta] of kolom) { if (!ta.value.trim()) { toast("Masih ada penjelasan yang kosong."); return; } hasil[i] = ta.value.trim(); }
      minta({ t: "perjelas", penjelasan: hasil });
    });
    wadah.appendChild(kirim);
    function cek() { kirim.disabled = kolom.some(([, ta]) => !ta.value.trim()) || !(DEV || terhubung); }
    cek();
  }

  function barisBintang(n) {
    const p = el("p", "arti-bintang");
    const b = el("span", "hasil-bintang");
    b.setAttribute("aria-label", n + " dari 5");
    for (let k = 1; k <= 5; k++) b.appendChild(el("span", k <= n ? "nyala" : "mati"));
    p.append(b, document.createTextNode(n + " dari 5: " + ARTI_BINTANG[n]));
    return p;
  }

  // ---------- Tahap 5: selesai ----------
  function renderSelesai(wadah) {
    wadah.appendChild(el("div", "ilustrasi"));
    const p = panelJudul("Alhamdulillah, semua tahap sudah selesai",
      "Berikut seluruh pertanyaan, jawaban, dan penilaian kalian berdua. Unduh PDF-nya untuk disimpan atau dibaca bersama perantara dan wali.");
    const unduh = el("button", "btn utama", "Unduh PDF"); unduh.type = "button";
    unduh.addEventListener("click", unduhPDF);
    p.appendChild(unduh);
    wadah.appendChild(p);
    [0, 1].forEach((penanya) => wadah.appendChild(blokRingkasan(penanya)));
  }

  function blokRingkasan(penanya) {
    const penjawab = 1 - penanya;
    const blok = el("div", "blok-ringkasan");
    blok.appendChild(el("h3", null, "Pertanyaan dari " + namaPemain(penanya) + " untuk " + namaPemain(penjawab)));
    state.pemain[penanya].pertanyaan.forEach((q, i) => {
      const n = state.nilai[penanya][i] || {};
      const it = el("div", "item");
      const no = el("p", "item-no", "Pertanyaan " + (i + 1) + " ");
      if (n.perjelas) no.appendChild(el("span", "lencana", "diminta diperjelas"));
      it.appendChild(no);
      it.appendChild(el("p", "item-tanya", q));
      const j = el("p", "item-jawab"); j.appendChild(el("span", "label-isi", "Jawaban " + namaPemain(penjawab))); j.appendChild(document.createTextNode(state.jawaban[penjawab][i] || "")); it.appendChild(j);
      if (n.bintang) it.appendChild(barisBintang(n.bintang));
      if (n.catatan) { const c = el("p", "item-catatan"); c.appendChild(el("span", "label-isi", "Catatan " + namaPemain(penanya))); c.appendChild(document.createTextNode(n.catatan)); it.appendChild(c); }
      const pj = (state.penjelasan[penjawab] || [])[i];
      if (pj) { const e = el("p", "item-penjelasan"); e.appendChild(el("span", "label-isi", "Penjelasan tambahan " + namaPemain(penjawab))); e.appendChild(document.createTextNode(pj)); it.appendChild(e); }
      blok.appendChild(it);
    });
    return blok;
  }

  function renderUlang() { kunciTampil = ""; renderTahap(); }

  // Kolom isian otomatis memanjang mengikuti isinya
  function sesuaikanTinggi(ta) { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; }
  document.addEventListener("input", (e) => { if (e.target.tagName === "TEXTAREA") sesuaikanTinggi(e.target); });

  // =====================================================================
  // PDF
  // =====================================================================
  // Huruf standar PDF hanya mendukung huruf Latin, jadi karakter lain disederhanakan.
  function teksPDF(t) {
    return String(t || "")
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, "-").replace(/\u2026/g, "...").replace(/\u00A0/g, " ")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "?");
  }

  // Mengambil gambar dari folder game sebagai data URL untuk PDF
  async function muatGambar(url) {
    try {
      const blob = await (await fetch(url)).blob();
      return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(blob); });
    } catch (e) { return null; }
  }
  // Tulisan "Saling Kenal" dengan huruf Pinyon Script, digambar ke kanvas lalu dimasukkan ke PDF sebagai gambar
  async function gambarJudul() {
    try { await document.fonts.load('140px "Pinyon Script"'); } catch (e) {}
    const c = document.createElement("canvas"), x = c.getContext("2d");
    const huruf = '140px "Pinyon Script", cursive';
    x.font = huruf;
    const lebar = Math.ceil(x.measureText("Saling Kenal").width) + 40;
    c.width = lebar; c.height = 196;
    x.font = huruf; x.fillStyle = "#34420D"; x.textBaseline = "middle";
    x.fillText("Saling Kenal", 20, 98);
    return { data: c.toDataURL("image/png"), rasio: c.height / c.width };
  }

  async function unduhPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast("Komponen PDF belum termuat. Periksa koneksi lalu coba lagi."); return; }
    toast("Menyiapkan PDF...");
    const [latar, logo, judul] = await Promise.all([muatGambar("gambar/background-pdf.jpg"), muatGambar("gambar/logo.png"), gambarJudul()]);
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    // Area tulisan berada di dalam bingkai gambar latar
    const KIRI = 24, LEBAR = 162, BAWAH = 264, TENGAH = 105;
    const pasangLatar = () => { if (latar) doc.addImage(latar, "JPEG", 0, 0, 210, 297, "latar", "FAST"); };   // disimpan sekali, dipakai ulang di setiap halaman
    pasangLatar();
    let y = 28;
    const halamanBaru = () => { doc.addPage(); pasangLatar(); y = 32; };
    const tulis = (teks, o) => {
      o = o || {};
      doc.setFont("helvetica", o.tebal ? "bold" : o.miring ? "italic" : "normal");
      doc.setFontSize(o.ukuran || 10.5);
      doc.setTextColor.apply(doc, o.warna || [52, 43, 28]);
      const kiri = KIRI + (o.indent || 0);
      const baris = doc.splitTextToSize(teksPDF(teks), LEBAR - (o.indent || 0));
      const tinggi = (o.ukuran || 10.5) * 0.45;
      baris.forEach((b) => {
        if (y + tinggi > BAWAH) halamanBaru();
        if (o.tengah) doc.text(b, TENGAH, y, { align: "center" }); else doc.text(b, kiri, y);
        y += tinggi;
      });
      y += o.jarak != null ? o.jarak : 1.5;
    };
    const garis = () => { if (y + 4 > BAWAH) halamanBaru(); doc.setDrawColor(144, 150, 122); doc.line(KIRI + 20, y, KIRI + LEBAR - 20, y); y += 6; };

    // Kepala halaman pertama: logo dan tulisan Saling Kenal di tengah
    if (logo) { const w = 22; doc.addImage(logo, "PNG", TENGAH - w / 2, y, w, w * 315 / 320, "logo", "FAST"); y += w * 315 / 320 + 2; }
    if (judul) { const w = 62; doc.addImage(judul.data, "PNG", TENGAH - w / 2, y, w, w * judul.rasio, "judul", "FAST"); y += w * judul.rasio + 4; }
    else tulis("Saling Kenal", { tebal: true, ukuran: 22, warna: [52, 66, 13], tengah: true, jarak: 2 });
    tulis("MULAI MENGENAL dari BERCERITA", { ukuran: 9, warna: [107, 85, 61], tengah: true, jarak: 6 });

    const tgl = new Date(state.selesaiPada || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    tulis("Catatan proses ta'aruf antara " + namaPemain(0) + " dan " + namaPemain(1), { tengah: true, jarak: 0.5 });
    tulis(tgl, { warna: [102, 115, 111], tengah: true, jarak: 1.5 });
    tulis("Nilai 1 sampai 5 menunjukkan kejelasan jawaban: 1 tidak jelas, 2 cukup tidak jelas, 3 cukup jelas, 4 jelas, 5 sangat jelas.", { warna: [102, 115, 111], ukuran: 9, tengah: true, jarak: 5 });
    garis();

    [0, 1].forEach((penanya) => {
      const penjawab = 1 - penanya;
      tulis("Pertanyaan dari " + namaPemain(penanya) + " untuk " + namaPemain(penjawab), { tebal: true, ukuran: 13, warna: [52, 66, 13], jarak: 3 });
      state.pemain[penanya].pertanyaan.forEach((q, i) => {
        const n = state.nilai[penanya][i] || {};
        tulis((i + 1) + ". " + q, { tebal: true, jarak: 1.5 });
        tulis("Jawaban " + namaPemain(penjawab) + ":", { tebal: true, ukuran: 9.5, warna: [102, 115, 111], indent: 5, jarak: 0.5 });
        tulis(state.jawaban[penjawab][i] || "-", { indent: 5, jarak: 1.5 });
        if (n.bintang) tulis("Penilaian " + namaPemain(penanya) + ": " + n.bintang + " dari 5 (" + ARTI_BINTANG[n.bintang] + ")" + (n.perjelas ? ", diminta diperjelas" : ""), { indent: 5, ukuran: 9.5, warna: [107, 85, 61], jarak: 1 });
        if (n.catatan) {
          tulis("Catatan " + namaPemain(penanya) + ":", { tebal: true, ukuran: 9.5, warna: [102, 115, 111], indent: 5, jarak: 0.5 });
          tulis(n.catatan, { indent: 5, jarak: 1.5 });
        }
        const pj = (state.penjelasan[penjawab] || [])[i];
        if (pj) {
          tulis("Penjelasan tambahan " + namaPemain(penjawab) + ":", { tebal: true, ukuran: 9.5, warna: [102, 115, 111], indent: 5, jarak: 0.5 });
          tulis(pj, { indent: 5, jarak: 1.5 });
        }
        y += 3;
      });
      garis();
    });
    tulis("Semoga Allah memudahkan setiap langkah ikhtiar kalian dan memberikan yang terbaik.", { miring: true, warna: [102, 115, 111], tengah: true, jarak: 0 });

    const total = doc.getNumberOfPages();
    for (let h = 1; h <= total; h++) {
      doc.setPage(h); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(107, 85, 61);
      doc.text("Saling Kenal  |  halaman " + h + " dari " + total, TENGAH, 272, { align: "center" });
    }
    const nama = (s) => teksPDF(s).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pemain";
    const d = new Date(state.selesaiPada || Date.now());
    const tanggal = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    doc.save("Saling-Kenal-" + nama(namaPemain(0)) + "-" + nama(namaPemain(1)) + "-" + tanggal + ".pdf");
  }

  // =====================================================================
  // KONEKSI: HOST
  // =====================================================================
  function mulaiHost(lanjutan, percobaan) {
    percobaan = percobaan || 0;
    sengajaKeluar = false;
    peer = new Peer(AWALAN_ID + kode, opsiPeer());
    let pernahBuka = false;   // kode ini sudah dibagikan, jadi jangan diganti
    peer.on("open", () => {
      pernahBuka = true;
      simpanSesi(); setTombolAwal(false); pesan("");
      terapkanState(state); aturTerhubung(false);
      if (lanjutan && state.nama[1]) toast("Ruangan dibuka lagi. Menunggu " + state.nama[1] + " tersambung.");
    });
    peer.on("connection", (c) => {
      c.on("data", (d) => terimaDariTamu(c, d));
      c.on("close", () => {
        if (c !== conn) return;
        conn = null; aturTerhubung(false);
        if (!sengajaKeluar && state && state.nama[1]) toast(state.nama[1] + " terputus. Menunggu tersambung lagi.");
      });
    });
    peer.on("disconnected", () => { if (!sengajaKeluar && peer && !peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500); });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        tutupPeer();
        // Saat menyambung ulang, server kadang masih memegang kode lama.
        // Tunggu dan pakai kode yang sama, karena kode itu sudah dibagikan ke pasangan.
        const kodeSama = lanjutan || pernahBuka;
        if (kodeSama && percobaan < 5) { pesan("Membuka ruangan lagi...", true); setTimeout(() => mulaiHost(true, percobaan + 1), 3000); }
        else if (!kodeSama) { kode = buatKode(); mulaiHost(false, percobaan + 1); }
        else { pesan("Ruangan lama tidak bisa dibuka. Silakan buat ruangan baru."); setTombolAwal(false); tampilkanLayar("layar-awal"); }
        return;
      }
      tanganiError(err);
    });
  }

  function terimaDariTamu(c, d) {
    if (!d || typeof d !== "object") return;
    if (c === conn || d.t === "halo") pesanTerakhir = Date.now();
    if (d.t === "ping") { if (c === conn) { try { c.send({ t: "pong" }); } catch (e) {} if (!terhubung) aturTerhubung(true); } return; }
    if (d.t === "halo") {
      const salamUlang = c === conn;
      if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
      conn = c;
      const nama = String(d.nama || "Tamu").trim().slice(0, 30) || "Tamu";
      const baru = !state.nama[1];
      state.nama[1] = nama;
      terhubung = true;
      kirimDanTerapkan();
      if (!salamUlang) toast(nama + (baru ? " bergabung" : " tersambung lagi"));
      return;
    }
    if (c !== conn) return;
    if (d.t === "keluar") { const n = state.nama[1]; akhiriRuangan(); pesan(n + " keluar dari ruangan. Sesi sudah selesai."); return; }
    aksi(1, d);
  }

  function tampilkanRuanganTunggu() {
    $("tampil-kode").textContent = kode;
    const teks = "Assalamu'alaikum. Yuk mulai saling mengenal lewat Saling Kenal. Buka tautan ini: " + tautanRuangan() + " (kode ruangan: " + kode + ")";
    $("btn-wa").href = "https://wa.me/?text=" + encodeURIComponent(teks);
    tampilkanLayar("layar-tunggu");
  }

  // =====================================================================
  // KONEKSI: TAMU
  // =====================================================================
  function mulaiTamu() {
    percobaanGabung = 0;
    sengajaKeluar = false;
    peer = new Peer(opsiPeer());
    peer.on("open", sambungKeHost);
    peer.on("disconnected", () => { if (!sengajaKeluar && peer && !peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500); });
    peer.on("error", (err) => {
      if (err.type === "peer-unavailable") {
        if (state) { aturTerhubung(false); jadwalkanSambungUlang(); }
        else { pesan("Ruangan " + kode + " tidak ditemukan. Periksa kodenya, atau minta calonmu membuka ruangan dulu."); setTombolAwal(false); tutupPeer(); }
        return;
      }
      tanganiError(err);
    });
  }

  function sambungKeHost() {
    if (!peer || peer.destroyed || sengajaKeluar) return;
    clearTimeout(timerSambung); timerSambung = null;
    if (conn) { const lama = conn; conn = null; try { lama.close(); } catch (e) {} }
    const c = peer.connect(AWALAN_ID + kode, { reliable: true });
    let dapatState = false;   // salam diulang sampai host membalas
    conn = c;
    clearTimeout(timerBuka);
    timerBuka = setTimeout(() => {
      if (c !== conn || c.open || sengajaKeluar) return;
      try { c.close(); } catch (e) {}
      conn = null;
      if (state) { jadwalkanSambungUlang(); return; }
      percobaanGabung++;
      if (percobaanGabung < 4) { pesan("Masih menyambung ke ruangan " + kode + "...", true); sambungKeHost(); }
      else { percobaanGabung = 0; pesan("Belum bisa tersambung ke ruangan " + kode + ". Pastikan calonmu masih di halaman ruangan, lalu coba lagi. Jika tetap gagal, coba ganti jaringan (Wi-Fi atau data seluler)."); setTombolAwal(false); tutupPeer(); }
    }, BATAS_BUKA);
    c.on("open", () => { clearTimeout(timerBuka); percobaanGabung = 0; c.send({ t: "halo", nama: namaSaya });
      const ulangSalam = setInterval(() => {
        if (dapatState || c !== conn || !c.open || sengajaKeluar) { clearInterval(ulangSalam); return; }
        try { c.send({ t: "halo", nama: namaSaya }); } catch (e) {}
      }, 2500); simpanSesi(); });
    c.on("data", (d) => {
      if (!d || typeof d !== "object") return;
      pesanTerakhir = Date.now();
      if (d.t === "pong") { if (!terhubung && state) aturTerhubung(true); return; }
      if (d.t === "state") { dapatState = true; terhubung = true; setTombolAwal(false); pesan(""); terapkanState(d.state); }
      if (d.t === "tutup") { akhiriRuangan(); pesan("Calonmu keluar dari ruangan. Sesi sudah selesai."); }
    });
    c.on("close", () => {
      if (c !== conn || sengajaKeluar) return;
      aturTerhubung(false); toast("Koneksi terputus. Mencoba menyambung lagi..."); jadwalkanSambungUlang();
    });
  }
  function jadwalkanSambungUlang() { clearTimeout(timerSambung); timerSambung = setTimeout(sambungKeHost, 3000); }

  function tanganiError(err) {
    console.warn("PeerJS:", err.type, err);
    const daftar = {
      "browser-incompatible": "Browser ini tidak mendukung koneksi online. Coba Chrome atau Safari terbaru.",
      "network": "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
      "server-error": "Server sedang bermasalah. Coba lagi sebentar lagi.",
      "socket-error": "Koneksi ke server terputus. Coba lagi.",
      "socket-closed": "Koneksi ke server terputus. Coba lagi.",
    };
    const teks = daftar[err.type] || "Terjadi gangguan koneksi (" + err.type + ").";
    if ($("layar-awal").classList.contains("aktif")) { pesan(teks); setTombolAwal(false); } else toast(teks);
  }

  function aturTerhubung(v) {
    terhubung = v;
    if (state && state.nama[1]) { perbaruiBar(); renderUlangTombol(); }
  }
  // Tombol kirim bergantung pada status koneksi; bangun ulang tahap tanpa menghapus draf
  function renderUlangTombol() { if ($("layar-main").classList.contains("aktif")) renderUlang(); }

  // Penjaga koneksi: detak setiap 4 detik dan sambung ulang otomatis
  setInterval(() => {
    if (DEV || !peer || sengajaKeluar || !state) return;
    if (peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} }
    const senyap = Date.now() - pesanTerakhir > BATAS_SENYAP;
    if (peran === "tamu") {
      if (conn && conn.open) { try { conn.send({ t: "ping" }); } catch (e) {} if (senyap) { aturTerhubung(false); sambungKeHost(); } }
      else if (!timerSambung || senyap) { aturTerhubung(false); sambungKeHost(); }
    } else if (peran === "host" && terhubung && senyap) aturTerhubung(false);
  }, 4000);
  function saatKembali() {
    if (DEV || document.visibilityState !== "visible" || !peer || sengajaKeluar) return;
    if (peer.destroyed) { if (peran === "host" && state) mulaiHost(true); else if (peran === "tamu") mulaiTamu(); return; }
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
    if (peran === "tamu" && state) { if (conn && conn.open) { try { conn.send({ t: "ping" }); } catch (e) {} } else sambungKeHost(); }
  }
  document.addEventListener("visibilitychange", saatKembali);
  window.addEventListener("pageshow", saatKembali);
  window.addEventListener("online", saatKembali);

  // =====================================================================
  // LAYAR AWAL
  // =====================================================================
  function setTombolAwal(sibuk) { ["btn-buat", "btn-gabung", "btn-lanjut"].forEach((id) => { $(id).disabled = sibuk; }); }
  function ambilNama() {
    const n = $("input-nama").value.trim();
    if (!n) { pesan("Tulis namamu dulu, ya."); $("input-nama").focus(); return null; }
    return n.slice(0, 30);
  }
  function buatRuangan() {
    const n = ambilNama(); if (!n) return;
    tutupPeer(); namaSaya = n; peran = "host"; kode = buatKode(); state = stateBaru(n); draf = [drafBaru(), drafBaru()];
    pesan("Membuat ruangan...", true); setTombolAwal(true); mulaiHost(false);
  }
  function gabungRuangan() {
    const n = ambilNama(); if (!n) return;
    const k = bersihkanKode($("input-kode").value);
    if (k.length !== 5) { pesan("Kode ruangan terdiri dari 5 huruf atau angka."); $("input-kode").focus(); return; }
    tutupPeer(); namaSaya = n; peran = "tamu"; kode = k; state = null; draf = [drafBaru(), drafBaru()];
    pesan("Menyambung ke ruangan " + k + "...", true); setTombolAwal(true); mulaiTamu();
  }
  function lanjutkanSesi() {
    const s = bacaSesi(); if (!s) return;
    tutupPeer(); namaSaya = s.nama; kode = s.kode; peran = s.peran;
    draf = [drafBaru(), drafBaru()];
    if (s.draf) draf[peran === "host" ? 0 : 1] = Object.assign(drafBaru(), s.draf);
    setTombolAwal(true); pesan("Membuka ruangan " + kode + "...", true);
    if (peran === "host" && s.state) { state = s.state; mulaiHost(true); } else { state = null; mulaiTamu(); }
  }
  function akhiriRuangan() {
    sengajaKeluar = true; setTimeout(tutupPeer, 300); hapusSesi();
    state = null; peran = null; terhubung = false; kunciTampil = "";
    siapkanLayarAwal(); tampilkanLayar("layar-awal");
  }
  function keluar() {
    if (DEV) { mulaiDev(); return; }
    const selesai = state && state.fase === "selesai";
    const teks = selesai ? "Keluar dari ruangan? Pastikan PDF sudah diunduh." : "Keluar dari ruangan? Sesi ini akan berakhir untuk kalian berdua dan tidak bisa dilanjutkan.";
    if (!confirm(teks)) return;
    if (conn && conn.open) { try { conn.send({ t: peran === "host" ? "tutup" : "keluar" }); } catch (e) {} }
    akhiriRuangan();
  }
  function siapkanLayarAwal() {
    setTombolAwal(false); pesan("");
    const s = bacaSesi(), btn = $("btn-lanjut");
    if (s && s.kode && s.nama) { btn.hidden = false; btn.textContent = "Lanjutkan ruangan " + s.kode + " sebagai " + s.nama; }
    else btn.hidden = true;
  }

  // =====================================================================
  // MODE PENGEMBANGAN (?dev=1)
  // =====================================================================
  function mulaiDev() {
    peran = "host"; terhubung = true; devPemain = 0; kunciTampil = "";
    draf = [drafBaru(), drafBaru()];
    state = stateBaru("Pemain A"); state.nama[1] = "Pemain B";
    terapkanState(state);
  }
  function isiOtomatis() {
    const p = devPemain, d = draf[p];
    const contoh = (i) => "Jawaban uji ke-" + (i + 1) + " dari " + namaPemain(p) + ". Ini teks contoh untuk mencoba tampilan dan PDF.";
    switch (state.fase) {
      case "atur": {
        const semua = BANK_PERTANYAAN.flatMap((k) => k.dasar);
        d.jumlah = d.jumlah || 3; d.kenal = d.kenal || "baru";
        d.pertanyaan = Array.from({ length: d.jumlah }, (_, i) => semua[(i * 7 + p * 3) % semua.length]);
        minta({ t: "atur", jumlah: d.jumlah, kenal: d.kenal, pertanyaan: d.pertanyaan });
        break;
      }
      case "jawab":
        minta({ t: "jawab", jawaban: state.pemain[1 - p].pertanyaan.map((_, i) => contoh(i)) });
        break;
      case "nilai":
        minta({ t: "nilai", nilai: state.pemain[p].pertanyaan.map((_, i) => {
          const b = [5, 2, 4, 3, 1, 5, 4, 2, 3, 5][i % 10];
          return { bintang: b, catatan: i % 2 ? "" : "Catatan uji untuk jawaban ke-" + (i + 1), perjelas: b <= 2 };
        }) });
        break;
      case "perjelas": {
        const hasil = [];
        dimintaPerjelas(state, p).forEach((i) => { hasil[i] = "Penjelasan tambahan uji untuk jawaban ke-" + (i + 1) + "."; });
        minta({ t: "perjelas", penjelasan: hasil });
        break;
      }
      default:
        toast("Semua tahap sudah selesai.");
    }
  }
  if (DEV) {
    $("bilah-dev").hidden = false;
    document.querySelectorAll(".dev-pemain").forEach((b) => b.addEventListener("click", () => { devPemain = Number(b.dataset.p); kunciTampil = ""; terapkanState(state); }));
    $("dev-isi").addEventListener("click", isiOtomatis);
    $("dev-reset").addEventListener("click", mulaiDev);
    window.__salingKenal = { get state() { return state; }, isiOtomatis, pilih: (p) => { devPemain = p; kunciTampil = ""; terapkanState(state); } };
  }

  // =====================================================================
  // PASANG TOMBOL & MULAI
  // =====================================================================
  $("btn-buat").addEventListener("click", buatRuangan);
  $("btn-gabung").addEventListener("click", gabungRuangan);
  $("btn-lanjut").addEventListener("click", lanjutkanSesi);
  $("input-kode").addEventListener("input", (e) => { e.target.value = bersihkanKode(e.target.value); });
  $("input-kode").addEventListener("keydown", (e) => { if (e.key === "Enter") gabungRuangan(); });
  $("btn-salin").addEventListener("click", async () => {
    const link = tautanRuangan();
    try { await navigator.clipboard.writeText(link); }
    catch (e) { const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (_) {} t.remove(); }
    toast("Tautan disalin");
  });
  $("btn-batal").addEventListener("click", () => { sengajaKeluar = true; tutupPeer(); hapusSesi(); state = null; siapkanLayarAwal(); tampilkanLayar("layar-awal"); });
  $("btn-keluar").addEventListener("click", keluar);

  if (DEV) { mulaiDev(); return; }
  const ruang = bersihkanKode(new URLSearchParams(location.search).get("room"));
  const lama = bacaSesi();
  if (lama && lama.nama) $("input-nama").value = lama.nama;
  if (ruang) $("input-kode").value = ruang;
  siapkanLayarAwal();
  if (ruang) pesan("Kamu diundang ke ruangan " + ruang + ". Tulis namamu lalu tekan Gabung.", true);
  if (typeof Peer === "undefined") { pesan("Gagal memuat komponen online. Periksa koneksi internet lalu muat ulang halaman."); setTombolAwal(true); }
})();
