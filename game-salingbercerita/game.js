/* Saling Bercerita
 * Dua pemain terhubung lewat internet (PeerJS / WebRTC).
 * Pembuat ruangan (host) menyimpan keadaan permainan dan mengirimkannya ke tamu.
 * Semua aksi tamu dikirim ke host, diproses di fungsi aksi(), lalu hasilnya dikirim balik.
 */
(function () {
  "use strict";

  const VERSI = 6;
  const AWALAN_ID = "salingbercerita-";
  const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const KUNCI_SESI = "salingbercerita-sesi";
  const LAMA_ANIMASI = 1600;
  const BATAS_SENYAP = 12000;
  const MAKS_MENIT_PER_KARTU = 60;
  const BATAS_MENIT = { teks: 10, telepon: 15 };   // timer per kartu
  const PERINGATAN_MENIT = 2;                     // peringatan saat waktu tinggal segini // durasi kartu di atas ini dianggap jeda, tidak dihitung

  // Sisi dadu: warna dan putaran agar sisi itu menghadap ke depan.
  const SISI = {
    depan:    { warna: "coklat", rx: 0,   ry: 0 },
    kiri:     { warna: "coklat", rx: 0,   ry: 90 },
    atas:     { warna: "coklat", rx: -90, ry: 0 },
    belakang: { warna: "hijau",  rx: 0,   ry: 180 },
    kanan:    { warna: "hijau",  rx: 0,   ry: -90 },
    bawah:    { warna: "hijau",  rx: 90,  ry: 0 },
  };
  const NAMA_WARNA = { coklat: "Cokelat", hijau: "Hijau", rahasia: "Rahasia" };

  // ---------- Keadaan lokal ----------
  let peer = null;
  let conn = null;
  let peran = null;          // "host" | "tamu"
  let kode = null;
  let namaSaya = "";
  // Mode pengembangan (?dev=1): main sendiri melawan bot, tanpa koneksi online
  const DEV = new URLSearchParams(location.search).get("dev") === "1";
  let timerBot = null;
  let aturanRonde = -1;        // ronde terakhir yang sudah menampilkan cara main
  let modeDipilih = null;      // "teks" | "telepon", dipilih di layar awal
  let infoModeTampil = false;
  let ruangDariTautanAktif = false;
  let selisihJam = 0;          // selisih jam HP ini dengan jam HP pembuat ruangan
  let kartuDiperingatkan = ""; // supaya peringatan timer hanya muncul sekali per kartu
  const NAMA_MODE = { teks: "Ngobrol lewat teks", telepon: "Ngobrol lewat telepon" };
  let state = null;
  let terhubung = false;
  let animasiSampai = 0;
  let putaranDadu = 0;
  let rondeTerakhir = -1;
  let rollTerakhir = -1;
  let timerSambung = null;
  let sengajaKeluar = false;
  let pesanTerakhir = 0;
  let bintangDipilih = 0;
  let tandaTerakhir = "";     // sesi yang pop-up feedback-nya sudah ditutup di HP ini

  const $ = (id) => document.getElementById(id);

  // ---------- Utilitas ----------
  function acak(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function urutan(n) { return Array.from({ length: n }, (_, i) => i); }
  function buatKode() {
    let k = "";
    for (let i = 0; i < 5; i++) k += HURUF_KODE[Math.floor(Math.random() * HURUF_KODE.length)];
    return k;
  }
  function bersihkanKode(v) { return (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5); }
  function tautanRuangan() { return location.origin + location.pathname + "?room=" + kode; }
  function rehat() {
    const k = kartuKini(state);
    if (k && !k.waktuSelesai) k.waktuSelesai = Date.now();
    state.fase = "jeda";
    state.selesaiPada = Date.now();
    state.siapLanjut = [false, false];
  }
  function cariTopik(id) { return TOPIK.find((t) => t.id === id) || TOPIK[0]; }
  function bulat1(x) { return Math.round(x * 10) / 10; }
  function rata(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
  function formatMenit(m) {
    if (m > 0 && m < 1) return "kurang dari 1 menit";
    m = Math.round(m);
    if (m < 60) return m + " menit";
    const j = Math.floor(m / 60), s = m % 60;
    return j + " jam" + (s ? " " + s + " menit" : "");
  }

  function toast(teks) {
    const t = $("toast");
    t.textContent = teks;
    t.classList.add("tampil");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("tampil"), 2800);
  }

  function tampilkanLayar(id) {
    const sekarang = document.querySelector(".layar.aktif");
    if (sekarang && sekarang.id === id) return;
    document.querySelectorAll(".layar").forEach((el) => el.classList.toggle("aktif", el.id === id));
    window.scrollTo(0, 0);
  }
  function layarAktif(id) { return $(id).classList.contains("aktif"); }

  function pesan(id, teks, ok) {
    const el = $(id);
    el.textContent = teks || "";
    el.classList.toggle("ok", !!ok);
  }

  function el(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }

  // Ganti {A} dan {B} dengan nama pemain, ditebalkan. Aman dari HTML.
  function isiNama(wadah, teks, namaA, namaB) {
    wadah.textContent = "";
    teks.split(/(\{A\}|\{B\})/).forEach((bagian) => {
      if (bagian === "{A}" || bagian === "{B}") {
        wadah.appendChild(el("span", "nm", bagian === "{A}" ? namaA : namaB));
      } else if (bagian) {
        wadah.appendChild(document.createTextNode(bagian));
      }
    });
  }
  function teksPolos(teks, namaA, namaB) {
    return teks.replace(/\{A\}/g, namaA).replace(/\{B\}/g, namaB);
  }

  function simpanSesi() {
    if (DEV) return;
    try {
      const data = { peran, kode, nama: namaSaya };
      if (peran === "host") data.state = state;
      localStorage.setItem(KUNCI_SESI, JSON.stringify(data));
    } catch (e) { /* penyimpanan tidak tersedia */ }
  }
  function bacaSesi() {
    if (DEV) return null;
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI));
      if (s && s.peran === "host" && (!s.state || s.state.versi !== VERSI)) return null;
      return s;
    } catch (e) { return null; }
  }
  function hapusSesi() {
    try { localStorage.removeItem(KUNCI_SESI); } catch (e) { /* abaikan */ }
  }

  // Server STUN dan TURN cadangan. Tanpa TURN, dua HP di jaringan seluler
  // sering gagal tersambung langsung sehingga keduanya hanya saling menunggu.
  const ICE_SERVERS = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
    { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" },
  ];
  const BATAS_BUKA = 20000;   // jika jalur belum terbuka dalam 20 detik, coba sambung lagi
  let percobaanGabung = 0, timerBuka = null;
  function opsiPeer() {
    // Untuk pengujian lokal: ?server=localhost:9000
    const s = new URLSearchParams(location.search).get("server");
    if (!s) return { debug: 1, config: { iceServers: ICE_SERVERS } };
    const [host, port] = s.split(":");
    return { host, port: Number(port) || 9000, path: "/", secure: false, debug: 1, config: { iceServers: ICE_SERVERS } };
  }

  function tutupPeer() {
    clearTimeout(timerSambung); clearTimeout(timerBuka);
    timerSambung = null;
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    conn = null;
    peer = null;
  }

  // =====================================================================
  // KEADAAN PERMAINAN (hanya diubah oleh host)
  // =====================================================================
  // Daftar kalimat kartu sesuai mode: mode teks memakai kartu ringan (topik.teks)
  function daftarKartu(t, mode, warna) {
    if (mode === "teks" && t.teks && t.teks[warna] && t.teks[warna].length) return t.teks[warna];
    return t[warna].kartu;
  }

  function stateBaru(namaHost, topikId, ronde, mode) {
    const t = cariTopik(topikId);
    mode = mode === "teks" ? "teks" : "telepon";
    return {
      versi: VERSI,
      mode,
      topik: t.id,                // topik yang sedang disorot; dikunci setelah keduanya setuju
      setujuTopik: [false, false],
      nama: [namaHost, null],
      fase: "topik",              // topik | persiapan | main | jeda
      siap: [false, false],
      rahasia: [],                // { dari, untuk, jenis: pertanyaan|tantangan, teks, posisi, keluar }
      dek: { coklat: [], hijau: [] },   // dikocok setelah topik disepakati
      giliran: 0,
      riwayat: [],                // kartu yang sudah keluar; kartu terakhir = kartu yang sedang dibahas
      rollId: 0,
      ronde: ronde || 0,
      sesi: 1,
      mulaiPada: null,
      selesaiPada: null,
      siapLanjut: [false, false], // saat jeda: permainan lanjut setelah keduanya menekan Lanjutkan
      target: 0,                  // mode telepon: jumlah kartu per sesi sebelum otomatis rehat (0 = bebas)
    };
  }

  function kocokDek() {
    const t = cariTopik(state.topik);
    state.dek = { coklat: acak(urutan(daftarKartu(t, state.mode, "coklat").length)), hijau: acak(urutan(daftarKartu(t, state.mode, "hijau").length)) };
  }

  function kartuKini(s) { return s.riwayat.length ? s.riwayat[s.riwayat.length - 1] : null; }
  function sisaRahasia(s) { return s.rahasia.filter((r) => !r.keluar).length; }
  function sisaTotal(s) { return s.dek.coklat.length + s.dek.hijau.length + sisaRahasia(s); }
  function teksKartu(s, k) {
    if (k.jenis === "rahasia") return k.teks;
    return daftarKartu(cariTopik(s.topik), s.mode, k.warna)[k.idx];
  }
  function bolehPutar(s, oleh) {
    if (s.fase !== "main" || s.giliran !== oleh || sisaTotal(s) === 0) return false;
    // Kartu terakhir harus sudah dinilai pendengar sebelum dadu diputar lagi
    const k = kartuKini(s);
    return !k || !!k.bintang;
  }

  // Menentukan urutan ke berapa setiap kartu rahasia muncul.
  // Aturan: sebelum kartu rahasia pertama dan di antara dua kartu rahasia selalu ada 2 atau 3 kartu biasa.
  // Kartu ke-n (dihitung dari 0) selalu diputar oleh pemain n % 2, karena giliran bergantian dan dimulai dari pemain 0.
  // Jarak 2 atau 3 menghasilkan urutan genap dan ganjil, jadi kartu rahasia selalu bisa jatuh ke giliran si penjawab.
  function jadwalkanRahasia() {
    const sisa = [0, 1].map((untuk) => acak(state.rahasia.filter((r) => r.untuk === untuk)));
    const awal = state.riwayat.length;
    let posisiTerakhir = awal - 1;
    while (sisa[0].length || sisa[1].length) {
      let untuk;
      if (sisa[0].length !== sisa[1].length) untuk = sisa[0].length > sisa[1].length ? 0 : 1;
      else untuk = Math.random() < 0.5 ? 0 : 1;
      const jarak = [2, 3].find((g) => (posisiTerakhir + g + 1) % 2 === (untuk + state.giliran + awal) % 2);
      posisiTerakhir += jarak + 1;
      sisa[untuk].shift().posisi = posisiTerakhir;
    }
  }

  function putar(oleh) {
    if (!bolehPutar(state, oleh) || Date.now() < animasiSampai) return;
    const t = cariTopik(state.topik);
    const urutanKe = state.riwayat.length;
    const sekarang = Date.now();

    // Kartu rahasia yang sudah waktunya muncul untuk pemain ini
    let rahasia = state.rahasia.find((r) => !r.keluar && r.untuk === oleh && r.posisi <= urutanKe);
    // Kalau kartu biasa sudah habis, keluarkan sisa kartu rahasia pemain ini
    if (!rahasia && state.dek.coklat.length + state.dek.hijau.length === 0) {
      rahasia = state.rahasia.find((r) => !r.keluar && r.untuk === oleh);
      if (!rahasia) { state.giliran = 1 - oleh; kirimDanTerapkan(false); return; }
    }

    let kartu;
    if (rahasia) {
      rahasia.keluar = true;
      const sisiAcak = Object.keys(SISI)[Math.floor(Math.random() * 6)];
      kartu = { jenis: "rahasia", warna: "rahasia", sisi: sisiAcak, teks: rahasia.teks, dari: rahasia.dari,
        jenisRahasia: rahasia.jenis || "pertanyaan",
        nomor: state.riwayat.filter((r) => r.jenis === "rahasia").length + 1 };
    } else {
      let warna = Math.random() < 0.5 ? "coklat" : "hijau";
      if (state.dek[warna].length === 0) warna = warna === "coklat" ? "hijau" : "coklat";
      const pilihanSisi = Object.keys(SISI).filter((k) => SISI[k].warna === warna);
      const sisi = pilihanSisi[Math.floor(Math.random() * pilihanSisi.length)];
      const idx = state.dek[warna].pop();
      kartu = { jenis: "biasa", warna, sisi, idx };
    }
    Object.assign(kartu, { oleh, sesi: state.sesi, bintang: null, catatan: "", jawaban: null, waktuBuka: sekarang + LAMA_ANIMASI, waktuSelesai: null });
    const sebelumnya = kartuKini(state);
    if (sebelumnya && !sebelumnya.waktuSelesai) sebelumnya.waktuSelesai = sekarang;

    state.riwayat.push(kartu);
    state.giliran = 1 - oleh;
    state.rollId += 1;
    kirimDanTerapkan(true);
  }

  // Semua aksi pemain (host maupun tamu) diproses di sini, hanya di HP host.
  function aksi(oleh, d) {
    if (!state || !d) return;
    switch (d.t) {
      case "topik": {
        // Siapa saja boleh mengganti topik. Persetujuan diulang dari awal setiap kali topik berganti.
        if (state.fase !== "topik" || !TOPIK.some((t) => t.id === d.topik) || state.topik === d.topik) return;
        state.topik = d.topik;
        state.setujuTopik = [false, false];
        break;
      }
      case "setujuTopik": {
        if (state.fase !== "topik" || d.topik !== state.topik) return;
        state.setujuTopik[oleh] = true;
        if (state.setujuTopik[0] && state.setujuTopik[1]) {
          kocokDek();
          state.fase = "persiapan";
        }
        break;
      }
      case "batalSiap": {
        // Isian rahasia boleh diubah selama pasangan belum selesai menulis
        if (state.fase !== "persiapan" || !state.siap[oleh]) return;
        state.siap[oleh] = false;
        break;
      }
      case "siap": {
        // Kolom pertama: pertanyaan rahasia (wajib). Kolom kedua: tantangan rahasia (boleh kosong).
        if (state.fase !== "persiapan" || state.siap[oleh]) return;
        const bersih = (x) => String(x || "").trim().slice(0, 200);
        const tanya = bersih(d.pertanyaan), tantang = bersih(d.tantangan);
        if (!tanya) return;
        const baru = [{ dari: oleh, untuk: 1 - oleh, jenis: "pertanyaan", teks: tanya, posisi: 9999, keluar: false }];
        if (tantang) baru.push({ dari: oleh, untuk: 1 - oleh, jenis: "tantangan", teks: tantang, posisi: 9999, keluar: false });
        state.rahasia = state.rahasia.filter((r) => r.dari !== oleh).concat(baru);
        state.siap[oleh] = true;
        if (state.siap[0] && state.siap[1]) {
          jadwalkanRahasia();
          state.fase = "main";
          state.mulaiPada = Date.now();
        }
        break;
      }
      case "target": {
        if (state.mode !== "telepon" || state.fase !== "persiapan") return;
        const n = Math.round(Number(d.target));
        state.target = [0, 3, 5, 7, 10].includes(n) ? n : 0;
        break;
      }
      case "putar":
        putar(oleh);
        return;
      case "jawab": {
        // Mode teks: yang memutar dadu mengirim jawaban tertulis
        const k = kartuKini(state);
        const teks = String(d.jawaban || "").trim().slice(0, 600);
        if (state.mode !== "teks" || state.fase !== "main" || !k || k.oleh !== oleh || k.jawaban || !teks) return;
        k.jawaban = teks;
        k.waktuJawab = Date.now();
        break;
      }
      case "nilai": {
        const k = kartuKini(state);
        const n = Math.round(Number(d.bintang));
        if (state.fase !== "main" || !k || k.bintang || k.oleh === oleh || !(n >= 1 && n <= 5)) return;
        if (state.mode === "teks" && !k.jawaban) return;
        k.bintang = n;
        k.catatan = String(d.catatan || "").trim().slice(0, 300);
        if (state.mode === "telepon" && state.target > 0) {
          const dinilaiSesiIni = state.riwayat.filter((r) => r.sesi === state.sesi && r.bintang).length;
          if (dinilaiSesiIni >= state.target) {
            rehat();
            toastSemua("Target " + state.target + " kartu tercapai. Saatnya rehat dan lihat rangkuman!");
          }
        }
        break;
      }
      case "akhiri": {
        // "Rehat Dulu" hanya menjeda: menampilkan rangkuman, permainan tetap tersimpan
        if (state.fase !== "main") return;
        rehat();
        break;
      }
      case "lanjut": {
        // Permainan lanjut setelah keduanya menekan Lanjutkan, supaya yang masih membaca tidak terputus
        if (state.fase !== "jeda") return;
        state.siapLanjut[oleh] = true;
        if (!(state.siapLanjut[0] && state.siapLanjut[1])) break;
        state.fase = "main";
        state.sesi += 1;
        // Kartu terakhir yang belum sempat dinilai ikut dinilai di sesi berikutnya
        { const k = kartuKini(state); if (k && !k.bintang) { k.sesi = state.sesi; k.waktuBuka = Date.now(); k.waktuSelesai = null; } }
        break;
      }
      case "ulang": {
        if (state.fase !== "main") return;
        const nama = state.nama;
        state = stateBaru(nama[0], state.topik, state.ronde + 1, state.mode);
        state.nama = nama;
        break;
      }
      default:
        return;
    }
    kirimDanTerapkan(false);
  }

  function kirimDanTerapkan(animasi) {
    state.jamHost = Date.now();
    simpanSesi();
    if (conn && conn.open) conn.send({ t: "state", state, animasi });
    terapkanState(state, animasi);
    // Di tahap persiapan bot menunggu agak lama, supaya tombol "Ubah Isian" sempat dicoba
    if (DEV) jadwalBot(state.fase === "persiapan" ? 6000 : 1500);
  }

  // Toast di kedua HP (dipanggil oleh host)
  function toastSemua(teks) {
    toast(teks);
    if (conn && conn.open) { try { conn.send({ t: "toast", teks }); } catch (e) {} }
  }

  // Dipanggil saat pemain menekan tombol: host memproses langsung, tamu mengirim ke host.
  function minta(d) {
    if (peran === "host") aksi(0, d);
    else if (conn && conn.open) conn.send(d);
    else toast("Belum terhubung dengan pasanganmu. Tunggu sebentar, ya.");
  }

  // =====================================================================
  // TAMPILAN
  // =====================================================================
  function indeksSaya() { return peran === "host" ? 0 : 1; }
  function namaPemain(i) { return (state && state.nama[i]) || (i === indeksSaya() ? namaSaya : "Pasanganmu"); }

  function aturDadu(sisi, animasi) {
    const dadu = $("dadu");
    const target = SISI[sisi] || { rx: 0, ry: 0 };
    if (animasi) putaranDadu += 2;
    const rx = target.rx + 360 * putaranDadu;
    const ry = target.ry + 360 * putaranDadu;
    dadu.style.transition = animasi ? "" : "none";
    dadu.style.transform = `rotateX(-18deg) rotateY(24deg) rotateX(${rx}deg) rotateY(${ry}deg)`;
    if (!animasi) { void dadu.offsetWidth; dadu.style.transition = ""; }
    const wadah = dadu.parentElement;
    wadah.classList.remove("berputar");
    if (animasi) { void wadah.offsetWidth; wadah.classList.add("berputar"); }
  }

  function tampilKartu(k, balik) {
    const box = $("kartu");
    box.classList.remove("kosong", "coklat", "hijau", "rahasia", "balik", "tunggu");
    if (!k) {
      box.classList.add("kosong");
      $("kartu-tema").textContent = "Belum ada kartu";
      $("kartu-teks").textContent = "Putar dadu untuk mengambil kartu pertama.";
      $("kartu-no").textContent = "";
      return;
    }
    const t = cariTopik(state.topik);
    const A = namaPemain(k.oleh), B = namaPemain(1 - k.oleh);
    box.classList.add(k.warna);
    if (k.jenis === "rahasia") {
      const tantangan = k.jenisRahasia === "tantangan";
      $("kartu-tema").textContent = (tantangan ? "Tantangan dari " : "Kartu Rahasia dari ") + namaPemain(k.dari);
      $("kartu-teks").textContent = k.teks;
      $("kartu-no").textContent = tantangan
        ? "Tantangan ini untuk " + A + ". " + (state.mode === "teks" ? "Lakukan, lalu ceritakan di kolom jawaban." : "Lakukan sekarang, ya!")
        : "Pertanyaan ini untuk " + A + ". Jawab dengan jujur, ya.";
    } else {
      $("kartu-tema").textContent = "";
      isiNama($("kartu-teks"), teksKartu(state, k), A, B);
      $("kartu-no").textContent = `Kartu ${NAMA_WARNA[k.warna]} · dijawab ${A}`;
    }
    if (balik) { void box.offsetWidth; box.classList.add("balik"); }
  }

  // ---------- Panel penilaian (selama permainan, hanya untuk pendengar) ----------
  function perbaruiPanelNilai() {
    const k = kartuKini(state);
    const saya = indeksSaya();
    const tampil = state.fase === "main" && k && !k.bintang && k.oleh !== saya && Date.now() >= animasiSampai &&
      (state.mode !== "teks" || !!k.jawaban);
    const panel = $("panel-nilai");
    if (tampil && panel.hidden) {
      $("input-catatan").value = "";
      aturBintangPilih(0);
    }
    panel.hidden = !tampil;
    if (tampil) {
      panel.querySelectorAll(".nama-penjawab").forEach((e) => { e.textContent = namaPemain(k.oleh); });
      $("btn-nilai").disabled = !bintangDipilih || !terhubung;
    }
  }

  function aturBintangPilih(n) {
    bintangDipilih = n;
    $("bintang-pilih").querySelectorAll("button").forEach((b) => b.classList.toggle("nyala", Number(b.dataset.n) <= n));
    $("btn-nilai").disabled = !n || !terhubung;
  }

  // ---------- Pop-up rangkuman pribadi (muncul saat permainan diakhiri) ----------
  // Setiap pemain hanya melihat penilaian, feedback, dan saran untuk dirinya sendiri.
  let kunciRangkuman = "";
  function tutupModal() {
    $("modal-rangkuman").hidden = true;
    document.body.classList.remove("modal-buka");
    kunciRangkuman = "";
  }

  function tampilRangkuman() {
    if (!state || state.fase !== "jeda") { tutupModal(); return; }
    const saya = indeksSaya(), lawan = 1 - saya;
    const namaLawan = namaPemain(lawan);

    // Status tombol Lanjutkan selalu diperbarui
    const sayaSiap = state.siapLanjut[saya], lawanSiap = state.siapLanjut[lawan];
    const habis = sisaTotal(state) === 0 && (!kartuKini(state) || kartuKini(state).bintang);
    $("btn-lanjut-main").hidden = habis;
    $("btn-lanjut-main").disabled = sayaSiap || !terhubung;
    $("btn-lanjut-main").textContent = sayaSiap ? "Nunggu " + namaLawan + "..." : "Lanjut Cerita, Gas!";
    $("status-ulang").textContent = habis ? "Semua kartu sudah dijawab. Terima kasih sudah saling bercerita."
      : sayaSiap ? namaLawan + " juga perlu menekan Lanjut Cerita."
      : lawanSiap ? namaLawan + " sudah siap melanjutkan permainan." : "";

    const kunci = state.ronde + ":" + state.sesi + ":" + state.selesaiPada;
    if (kunci === kunciRangkuman) return;
    kunciRangkuman = kunci;

    const t = cariTopik(state.topik);
    const semuaMilik = state.riwayat.filter((r) => r.oleh === saya);
    const milik = semuaMilik.filter((r) => r.sesi === state.sesi);   // kartu sejak jeda terakhir
    const dinilai = milik.filter((r) => r.bintang);
    const rataTotal = rata(semuaMilik.filter((r) => r.bintang).map((r) => r.bintang));
    const rataSaya = rata(dinilai.map((r) => r.bintang));
    const durasi = state.riwayat.filter((r) => r.waktuSelesai && r.sesi === state.sesi)
      .map((r) => Math.max(0, (r.waktuSelesai - r.waktuBuka) / 60000)).filter((m) => m <= MAKS_MENIT_PER_KARTU);
    const totalMenit = durasi.reduce((a, b) => a + b, 0);
    const durasiSaya = milik.filter((r) => r.waktuSelesai)
      .map((r) => Math.max(0, (r.waktuSelesai - r.waktuBuka) / 60000)).filter((m) => m <= MAKS_MENIT_PER_KARTU);

    $("judul-rangkuman").textContent = "Rangkuman untuk " + namaPemain(saya);
    const tgl = new Date(state.selesaiPada || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    $("sub-rangkuman").textContent = t.nama + " · " + tgl + (state.sesi > 1 ? " · Sesi " + state.sesi : "") + ". Rangkuman ini hanya terlihat olehmu.";

    const wadah = $("isi-rangkuman");
    wadah.innerHTML = "";

    // Angka utama
    const stat = el("div", "statistik mini");
    [[String(milik.length), "kartu kamu jawab"],
     [rataSaya != null ? bulat1(rataSaya) + "★" : "-", "rata-rata bintang"],
     [totalMenit ? formatMenit(totalMenit) : "-", "waktu bermain"]].forEach(([a, b]) => {
      const d = el("div"); d.append(el("b", null, a), el("span", null, b)); stat.appendChild(d);
    });
    wadah.appendChild(stat);
    if (state.sesi > 1) {
      wadah.appendChild(el("p", "kosong-ket", "Angka di atas untuk sesi ini. Sejak awal permainan kamu sudah menjawab " +
        semuaMilik.length + " kartu" + (rataTotal != null ? " dengan rata-rata " + bulat1(rataTotal) + "★." : ".")));
    }

    // Feedback per kartu
    wadah.appendChild(el("h3", null, "Feedback dari " + namaLawan));
    if (!milik.length) wadah.appendChild(el("p", "nilai-tunggu", "Kamu belum menjawab kartu di sesi ini."));
    milik.forEach((r, urut) => {
      const item = el("div", "item-nilai " + r.warna);
      const label = el("p", "item-nilai-label", (urut + 1) + ". " + (r.jenis === "rahasia" ? (r.jenisRahasia === "tantangan" ? "Tantangan rahasia" : "Kartu rahasia") : "Kartu " + NAMA_WARNA[r.warna]));
      if (r.bintang === 5) label.appendChild(el("span", "lencana", "paling berkesan"));
      if (r.bintang && r.bintang <= 2) label.appendChild(el("span", "lencana bahas", "perlu dibahas lagi"));
      item.appendChild(label);
      item.appendChild(el("p", "item-nilai-teks", teksPolos(teksKartu(state, r), namaPemain(r.oleh), namaPemain(1 - r.oleh))));
      if (r.jawaban) item.appendChild(el("p", "item-jawaban", "Jawabanmu: " + r.jawaban));
      if (r.bintang) {
        const bt = el("div", "bintang-hasil");
        bt.setAttribute("aria-label", r.bintang + " dari 5 bintang");
        for (let n = 1; n <= 5; n++) bt.appendChild(el("span", n <= r.bintang ? "nyala" : "", "★"));
        item.appendChild(bt);
        item.appendChild(r.catatan ? el("p", "item-feedback", r.catatan) : el("p", "item-feedback kosong", "Tanpa kalimat feedback."));
      } else {
        item.appendChild(el("p", "item-feedback kosong", "Kartu ini belum sempat dinilai."));
      }
      wadah.appendChild(item);
    });

    // Saran pribadi
    wadah.appendChild(el("h3", null, "Saran untukmu"));
    const kotak = el("div", "kotak-saran");
    const ul = el("ul", "saran-pribadi");
    saranPribadi(t, milik, dinilai, rataSaya, durasiSaya, namaLawan).forEach((x) => ul.appendChild(el("li", null, x)));
    kotak.appendChild(ul);
    wadah.appendChild(kotak);

    $("modal-rangkuman").hidden = false;
    document.body.classList.add("modal-buka");
    wadah.scrollTop = 0;
  }

  // Saran dipilih acak dari saran.js sesuai kondisi, jadi kalimatnya bisa berbeda tiap permainan.
  function saranPribadi(t, milik, dinilai, rataSaya, durasiSaya, namaLawan) {
    const pilih = (kategori, isi) => {
      const daftar = (typeof SARAN !== "undefined" && SARAN[kategori]) || [];
      if (!daftar.length) return null;
      let teks = daftar[Math.floor(Math.random() * daftar.length)];
      Object.entries(Object.assign({ lawan: namaLawan }, isi || {})).forEach(([k, v]) => { teks = teks.split("{" + k + "}").join(v); });
      return teks;
    };
    const tema = (warna) => t[warna].label.toLowerCase().replace(/ · /g, ", ");
    const saran = [];
    const tambah = (x) => { if (x) saran.push(x); };

    if (!milik.length) { tambah(pilih("belumJawab")); return saran; }
    if (!dinilai.length) { tambah(pilih("belumDinilai")); return saran; }

    const rataWarna = (w) => rata(dinilai.filter((r) => r.warna === w).map((r) => r.bintang));
    const coklat = rataWarna("coklat"), hijau = rataWarna("hijau"), rahasia = rataWarna("rahasia");
    const rendah = dinilai.filter((r) => r.bintang <= 2).length;
    const penuh = dinilai.filter((r) => r.bintang === 5).length;
    const menit = rata(durasiSaya);

    if (rataSaya >= 4.5) tambah(pilih("sangatPuas"));
    else if (rataSaya >= 3.5) tambah(pilih("puas"));
    else tambah(pilih("kurangPuas"));

    if (coklat != null && coklat < 3) tambah(pilih("coklatRendah", { tema: tema("coklat") }));
    if (hijau != null && hijau < 3) tambah(pilih("hijauRendah", { tema: tema("hijau") }));
    if (rahasia != null && rahasia < 4) tambah(pilih("rahasiaRendah"));
    if (rendah) tambah(pilih("perluDibahas", { jumlah: rendah }));
    if (menit != null && menit < 5 && dinilai.length >= 3) {
      tambah(pilih("terburuBuru", { menit: menit < 1 ? "kurang dari 1 menit" : "sekitar " + formatMenit(menit) }));
    }
    if (penuh) tambah(pilih("bintangLima", { jumlah: penuh }));
    return saran;
  }


  // ---------- Mode teks: kolom jawaban dan gelembung jawaban ----------
  function perbaruiJawaban() {
    const teksMode = state && state.mode === "teks" && state.fase === "main";
    const k = state && kartuKini(state);
    const saya = indeksSaya();
    const siapTampil = teksMode && k && Date.now() >= animasiSampai;

    const panel = $("panel-jawab");
    const tulis = siapTampil && k.oleh === saya && !k.jawaban;
    if (tulis && panel.hidden) { $("input-jawaban").value = ""; $("hitung-jawaban").textContent = "0"; }
    panel.hidden = !tulis;
    if (tulis) $("btn-kirim-jawaban").disabled = !$("input-jawaban").value.trim() || !terhubung;

    const g = $("gelembung-jawaban");
    g.hidden = !(siapTampil && k.jawaban);
    if (!g.hidden) {
      g.classList.toggle("milik-saya", k.oleh === saya);
      $("gelembung-nama").textContent = k.oleh === saya ? "Jawabanmu" : "Jawaban " + namaPemain(k.oleh);
      $("gelembung-teks").textContent = k.jawaban;
    }
  }

  // ---------- Timer per kartu ----------
  // Berjalan sejak kartu terbuka. Mode teks: sampai jawaban dikirim. Mode telepon: sampai penilaian disimpan.
  function perbaruiTimer() {
    const el1 = $("timer");
    const k = state && kartuKini(state);
    const jalan = state && state.fase === "main" && k && Date.now() >= animasiSampai &&
      (state.mode === "teks" ? !k.jawaban : !k.bintang);
    el1.hidden = !jalan;
    if (!jalan) return;
    const batas = BATAS_MENIT[state.mode] * 60000;
    const sisa = batas - ((Date.now() - selisihJam) - k.waktuBuka);
    const detik = Math.max(0, Math.ceil(sisa / 1000));
    const mm = String(Math.floor(detik / 60)).padStart(2, "0"), ss = String(detik % 60).padStart(2, "0");
    const mepet = sisa <= PERINGATAN_MENIT * 60000;
    el1.classList.toggle("mepet", mepet && sisa > 0);
    el1.classList.toggle("habis", sisa <= 0);
    el1.textContent = sisa <= 0 ? "Waktu habis! Yuk, dirampungkan." : "Sisa waktu " + mm + ":" + ss;
    const kunci = state.ronde + ":" + state.rollId;
    if (mepet && sisa > 0 && kartuDiperingatkan !== kunci) {
      kartuDiperingatkan = kunci;
      toast("Waktu tinggal " + PERINGATAN_MENIT + " menit lagi untuk kartu ini.");
      if (navigator.vibrate) { try { navigator.vibrate([80, 60, 80]); } catch (e) {} }
    }
  }
  setInterval(() => { if (state && state.fase === "main") perbaruiTimer(); }, 1000);

  function perbaruiProgresTarget() {
    const p = $("progres-target");
    const ada = state && state.mode === "telepon" && state.target > 0 && state.fase === "main";
    p.hidden = !ada;
    if (!ada) return;
    const n = state.riwayat.filter((r) => r.sesi === state.sesi && r.bintang).length;
    p.textContent = "Target malam ini: " + n + "/" + state.target + " kartu";
  }

  function perbaruiKontrol() {
    if (!state || state.fase !== "main") return;
    const saya = indeksSaya();
    const sedangAnimasi = Date.now() < animasiSampai;
    const habis = sisaTotal(state) === 0;
    const k = kartuKini(state);
    const lawan = namaPemain(1 - saya);

    [0, 1].forEach((i) => {
      const e = $("pemain-" + i);
      e.querySelector(".nama").textContent = namaPemain(i) + (i === saya ? " (kamu)" : "");
      e.classList.toggle("giliran-ini", !habis && state.giliran === i);
      e.classList.toggle("offline", i !== saya && !terhubung);
    });

    const ko = $("status-koneksi");
    ko.className = "koneksi " + (terhubung ? "on" : "off");
    ko.title = terhubung ? "Terhubung" : "Tidak terhubung";

    const info = $("info-giliran");
    const btn = $("btn-putar");
    let teks, sorot = false;

    if (sedangAnimasi) teks = "Dadu sedang berputar...";
    else if (!terhubung) teks = "Menunggu koneksi dengan " + lawan + "...";
    else if (habis) teks = "Semua kartu sudah terbuka. Tekan Rehat Dulu untuk lihat rangkuman.";
    else if (state.mode === "teks" && k && !k.jawaban && k.oleh === saya) { teks = "Giliran kamu menjawab. Tulis jawabanmu, lalu kirim ke " + lawan + "."; sorot = true; }
    else if (state.mode === "teks" && k && !k.jawaban) teks = lawan + " sedang menulis jawaban...";
    else if (state.mode === "teks" && k && !k.bintang && k.oleh === saya) teks = "Jawaban terkirim. Menunggu " + lawan + " mengisi penilaian.";
    else if (state.mode === "teks" && k && !k.bintang) { teks = "Baca jawaban " + lawan + ", lalu isi penilaian di bawah."; sorot = true; }
    else if (k && !k.bintang && k.oleh === saya) teks = "Giliran kamu bercerita. Setelah selesai, " + lawan + " mengisi penilaian.";
    else if (k && !k.bintang) { teks = "Dengarkan cerita " + lawan + ", lalu isi penilaian di bawah."; sorot = true; }
    else if (state.giliran === saya) { teks = "Giliranmu! Putar dadunya, yuk."; sorot = true; }
    else teks = "Nunggu " + lawan + " putar dadu...";

    info.textContent = teks;
    info.classList.toggle("saya", sorot);
    btn.hidden = habis;
    btn.disabled = !bolehPutar(state, saya) || !terhubung || sedangAnimasi;
    $("btn-akhiri").disabled = !terhubung;
    perbaruiTimer();
    perbaruiProgresTarget();
    perbaruiJawaban();
    perbaruiPanelNilai();
  }

  function perbaruiSisaDanRiwayat() {
    $("jumlah-riwayat").textContent = state.riwayat.length;
    const ol = $("daftar-riwayat");
    ol.innerHTML = "";
    state.riwayat.slice().reverse().forEach((r) => {
      const li = el("li", r.warna);
      const kecil = el("small", null, NAMA_WARNA[r.warna] + " · dijawab " + namaPemain(r.oleh));
      li.appendChild(kecil);
      li.appendChild(document.createTextNode(teksPolos(teksKartu(state, r), namaPemain(r.oleh), namaPemain(1 - r.oleh))));
      ol.appendChild(li);
    });
  }

  function perbaruiPersiapan() {
    const saya = indeksSaya();
    const lawan = namaPemain(1 - saya);
    document.querySelectorAll("#layar-persiapan .nama-lawan").forEach((e) => { e.textContent = lawan; });
    const sudah = state.siap[saya];
    document.querySelectorAll(".input-rahasia").forEach((t) => { t.disabled = sudah; });
    $("btn-siap").hidden = sudah;
    $("btn-ubah-rahasia").hidden = !sudah;
    if (sudah) pesan("pesan-persiapan", "Isianmu sudah tersimpan. Menunggu " + lawan + " selesai menulis. Selama itu, isianmu masih bisa diubah.", true);
    else if ($("pesan-persiapan").classList.contains("ok")) pesan("pesan-persiapan", "");
    [0, 1].forEach((i) => {
      const c = $("siap-" + i);
      c.textContent = namaPemain(i) + (state.siap[i] ? ": siap" : ": sedang menulis");
      c.classList.toggle("ok", !!state.siap[i]);
    });
    $("wadah-target").hidden = state.mode !== "telepon";
    $("pilih-target").value = String(state.target || 0);
    $("pilih-target").disabled = sudah && state.siap[1 - saya];
    $("info-durasi").innerHTML = "";
    if (state.mode === "teks") {
      $("info-durasi").append(
        "Mode teks: jawab setiap kartu dengan beberapa kalimat singkat, lalu kirim ke pasanganmu. Ada waktu " + BATAS_MENIT.teks + " menit per kartu. Tekan ",
        el("b", null, "Rehat Dulu"), " kapan saja untuk melihat rangkuman, lalu lanjut lagi kapan pun dengan kode ruangan yang sama."
      );
    } else {
      $("info-durasi").append(
        "Mode telepon: ada waktu " + BATAS_MENIT.telepon + " menit per kartu, jadi santai saja. Tekan ",
        el("b", null, "Rehat Dulu"), " kapan saja untuk melihat rangkuman, lalu lanjut lagi kapan pun dengan kode ruangan yang sama."
      );
    }
  }

  function layarUntuk(s) {
    if (!s.nama[1]) return "layar-tunggu";
    return { topik: "layar-topik", persiapan: "layar-persiapan", main: "layar-main", jeda: "layar-main" }[s.fase];
  }

  function terapkanState(s, animasi) {
    const rondeBaru = s.ronde !== rondeTerakhir;
    const adaRollBaru = !rondeBaru && s.rollId > rollTerakhir;
    if (rondeBaru) {
      document.querySelectorAll(".input-rahasia").forEach((t) => { t.value = ""; });
      pesan("pesan-persiapan", "");
    }
    state = s;
    if (peran === "tamu" && !infoModeTampil) {
      infoModeTampil = true;
      if (modeDipilih && modeDipilih !== s.mode) toast("Ruangan ini memakai mode " + NAMA_MODE[s.mode].toLowerCase() + ".");
    }
    rondeTerakhir = s.ronde;
    rollTerakhir = s.rollId;

    const layar = layarUntuk(s);
    if (layar === "layar-tunggu") { if (peran === "host") tampilkanRuanganTunggu(); return; }
    tampilkanLayar(layar);
    tampilRangkuman();

    // Beri tahu yang menjawab bahwa penilaian sudah masuk, tanpa menunjukkan isinya
    const kk = kartuKini(s);
    const tandaNilai = kk ? s.ronde + ":" + s.rollId + ":" + !!kk.bintang : "";
    if (kk && kk.bintang && kk.oleh === indeksSaya() && tandaTerakhir && tandaTerakhir !== tandaNilai && s.fase === "main") {
      toast(namaPemain(1 - kk.oleh) + " sudah mengisi penilaian. Hasilnya bisa dilihat saat permainan diakhiri.");
    }
    tandaTerakhir = tandaNilai;

    if (s.fase === "topik") { perbaruiTopik(); return; }
    if (s.fase === "persiapan") {
      perbaruiPersiapan();
      if (aturanRonde !== s.ronde) { aturanRonde = s.ronde; tampilAturan(); }
      return;
    }

    const k = kartuKini(s);
    if (animasi && adaRollBaru && k) {
      animasiSampai = Date.now() + LAMA_ANIMASI;
      aturDadu(k.sisi, true);
      $("kartu").classList.add("tunggu");
      perbaruiKontrol();
      setTimeout(() => {
        if (state !== s && state.rollId !== s.rollId) return;
        tampilKartu(kartuKini(state), true);
        perbaruiSisaDanRiwayat();
        perbaruiKontrol();
        if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
      }, LAMA_ANIMASI);
    } else {
      if (Date.now() >= animasiSampai) {
        animasiSampai = 0;
        aturDadu(k ? k.sisi : "depan", false);
        tampilKartu(k, rondeBaru && !!k);
        perbaruiSisaDanRiwayat();
      }
      perbaruiKontrol();
    }
  }

  function aturTerhubung(v) {
    terhubung = v;
    if (state && state.fase === "main") perbaruiKontrol();
    if (state && state.fase === "jeda") tampilRangkuman();
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
      simpanSesi();
      setTombolAwal(false);
      pesan("pesan-awal", "");
      terapkanState(state, false);
      aturTerhubung(false);
      if (lanjutan && state.nama[1]) toast("Ruangan dibuka lagi. Menunggu " + state.nama[1] + " tersambung.");
    });

    peer.on("connection", (c) => {
      c.on("data", (d) => terimaDariTamu(c, d));
      c.on("close", () => {
        if (c !== conn) return;
        conn = null;
        aturTerhubung(false);
        if (!sengajaKeluar && state && state.nama[1]) toast(state.nama[1] + " terputus. Menunggu tersambung lagi.");
      });
    });

    peer.on("disconnected", () => {
      if (!sengajaKeluar && peer && !peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500);
    });

    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        tutupPeer();
        // Saat menyambung ulang, server kadang masih memegang kode lama.
        // Tunggu dan pakai kode yang sama, karena kode itu sudah dibagikan ke pasangan.
        const kodeSama = lanjutan || pernahBuka;
        if (kodeSama && percobaan < 5) {
          pesan("pesan-awal", "Membuka ruangan lagi...", true);
          setTimeout(() => mulaiHost(true, percobaan + 1), 3000);
        } else if (!kodeSama) {
          kode = buatKode();
          mulaiHost(false, percobaan + 1);
        } else {
          pesan("pesan-awal", "Ruangan lama tidak bisa dibuka. Silakan buat ruangan baru.");
          setTombolAwal(false);
          tampilkanLayar("layar-awal");
        }
        return;
      }
      tanganiErrorUmum(err);
    });
  }

  function terimaDariTamu(c, d) {
    if (!d || typeof d !== "object") return;
    if (c === conn || d.t === "halo") pesanTerakhir = Date.now();
    if (d.t === "ping") {
      if (c === conn) {
        try { c.send({ t: "pong" }); } catch (e) {}
        if (!terhubung) aturTerhubung(true);
      }
      return;
    }
    if (d.t === "halo") {
      const salamUlang = c === conn;
      if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
      conn = c;
      const namaTamu = String(d.nama || "Tamu").trim().slice(0, 20) || "Tamu";
      const baru = !state.nama[1];
      state.nama[1] = namaTamu;
      terhubung = true;
      kirimDanTerapkan(false);
      if (!salamUlang) toast(namaTamu + (baru ? " bergabung" : " tersambung lagi"));
      return;
    }
    if (c !== conn) return;
    if (d.t === "keluar") {
      // Tamu keluar: permainan selesai untuk berdua
      const nama = state.nama[1];
      akhiriRuangan();
      pesan("pesan-awal", nama + " keluar dari permainan. Permainan sudah selesai.");
      return;
    }
    aksi(1, d);
  }

  function tampilkanRuanganTunggu() {
    $("tampil-kode").textContent = kode;
    const teks = "Yuk main Saling Bercerita (" + NAMA_MODE[state.mode].toLowerCase() + ") bareng aku. Buka tautan ini: " + tautanRuangan() + " (kode ruangan: " + kode + ")";
    $("btn-wa").href = "https://wa.me/?text=" + encodeURIComponent(teks);
    pesan("pesan-tunggu", location.protocol === "file:" ? "Halaman ini dibuka dari file lokal, jadi tautan tidak bisa dibuka orang lain. Bagikan kodenya saja, atau unggah game ke hosting." : "");
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
    peer.on("disconnected", () => {
      if (!sengajaKeluar && peer && !peer.destroyed) setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on("error", (err) => {
      if (err.type === "peer-unavailable") {
        if (state) {
          aturTerhubung(false);
          jadwalkanSambungUlang();
        } else {
          pesan("pesan-awal", "Ruangan " + kode + " tidak ditemukan. Periksa kodenya, atau minta pasanganmu membuka ruangan dulu.");
          setTombolAwal(false);
          tutupPeer();
        }
        return;
      }
      tanganiErrorUmum(err);
    });
  }

  function sambungKeHost() {
    if (!peer || peer.destroyed || sengajaKeluar) return;
    clearTimeout(timerSambung);
    timerSambung = null;
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
      if (percobaanGabung < 4) { pesan("pesan-awal", "Masih menyambung ke ruangan " + kode + "...", true); sambungKeHost(); }
      else { percobaanGabung = 0; pesan("pesan-awal", "Belum bisa tersambung ke ruangan " + kode + ". Pastikan pasanganmu masih di halaman ruangan, lalu coba lagi. Jika tetap gagal, coba ganti jaringan (Wi-Fi atau data seluler)."); setTombolAwal(false); tutupPeer(); }
    }, BATAS_BUKA);
    c.on("open", () => { clearTimeout(timerBuka); percobaanGabung = 0;
      c.send({ t: "halo", nama: namaSaya });
      const ulangSalam = setInterval(() => {
        if (dapatState || c !== conn || !c.open || sengajaKeluar) { clearInterval(ulangSalam); return; }
        try { c.send({ t: "halo", nama: namaSaya }); } catch (e) {}
      }, 2500);
      simpanSesi();
    });
    c.on("data", (d) => {
      if (!d || typeof d !== "object") return;
      pesanTerakhir = Date.now();
      if (d.t === "pong") { if (!terhubung && state) aturTerhubung(true); return; }
      if (d.t === "toast") { toast(String(d.teks || "").slice(0, 200)); return; }
      if (d.t === "state") {
        dapatState = true;
        terhubung = true;
        setTombolAwal(false);
        pesan("pesan-awal", "");
        if (d.state && d.state.jamHost) selisihJam = Date.now() - d.state.jamHost;
        terapkanState(d.state, !!d.animasi);
      }
      if (d.t === "tutup") {
        sengajaKeluar = true;
        hapusSesi();
        tutupPeer();
        state = null;
        tutupModal();
        siapkanLayarAwal();
        tampilkanLayar("layar-awal");
        pesan("pesan-awal", "Pasanganmu keluar dari permainan. Permainan sudah selesai.");
      }
    });
    c.on("close", () => {
      if (c !== conn || sengajaKeluar) return;
      aturTerhubung(false);
      toast("Koneksi terputus. Mencoba menyambung lagi...");
      jadwalkanSambungUlang();
    });
  }

  function jadwalkanSambungUlang() {
    clearTimeout(timerSambung);
    timerSambung = setTimeout(sambungKeHost, 3000);
  }

  function tanganiErrorUmum(err) {
    console.warn("PeerJS:", err.type, err);
    const daftar = {
      "browser-incompatible": "Browser ini tidak mendukung permainan online. Coba Chrome atau Safari terbaru.",
      "network": "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
      "server-error": "Server sedang bermasalah. Coba lagi sebentar lagi.",
      "socket-error": "Koneksi ke server terputus. Coba lagi.",
      "socket-closed": "Koneksi ke server terputus. Coba lagi.",
    };
    const teks = daftar[err.type] || "Terjadi gangguan koneksi (" + err.type + ").";
    if (layarAktif("layar-awal")) {
      pesan("pesan-awal", teks);
      setTombolAwal(false);
    } else {
      toast(teks);
    }
  }

  // ---------- Penjaga koneksi ----------
  // HP sering memutus koneksi saat browser ditinggal ke WhatsApp.
  // Detak ini memeriksa koneksi secara berkala dan menyambung ulang otomatis.
  setInterval(() => {
    if (!peer || sengajaKeluar || !state) return;
    if (peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} }
    const senyap = Date.now() - pesanTerakhir > BATAS_SENYAP;
    if (peran === "tamu") {
      if (conn && conn.open) {
        try { conn.send({ t: "ping" }); } catch (e) {}
        if (senyap) { aturTerhubung(false); sambungKeHost(); }
      } else if (!timerSambung || senyap) {
        aturTerhubung(false);
        sambungKeHost();
      }
    } else if (peran === "host" && terhubung && senyap) {
      aturTerhubung(false);
    }
  }, 4000);

  function saatKembali() {
    if (document.visibilityState !== "visible" || !peer || sengajaKeluar) return;
    if (peer.destroyed) {
      if (peran === "host" && state) mulaiHost(true);
      else if (peran === "tamu") mulaiTamu();
      return;
    }
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
    if (peran === "tamu" && state) {
      if (conn && conn.open) { try { conn.send({ t: "ping" }); } catch (e) {} }
      else sambungKeHost();
    }
  }
  document.addEventListener("visibilitychange", saatKembali);
  window.addEventListener("pageshow", saatKembali);
  window.addEventListener("online", saatKembali);

  // =====================================================================
  // LAYAR AWAL
  // =====================================================================
  function setTombolAwal(sibuk) {
    $("btn-buat").disabled = sibuk;
    $("btn-gabung").disabled = sibuk;
    $("btn-lanjut").disabled = sibuk;
  }

  function ambilNama() {
    const n = $("input-nama").value.trim();
    if (!n) {
      pesan("pesan-awal", "Tulis namamu dulu, ya.");
      $("input-nama").focus();
      return null;
    }
    return n.slice(0, 20);
  }

  // =====================================================================
  // PILIH TOPIK (setelah kedua pemain masuk)
  // =====================================================================
  function perbaruiTopik() {
    const saya = indeksSaya();
    const lawan = namaPemain(1 - saya);
    document.querySelectorAll("#layar-topik .nama-lawan").forEach((e) => { e.textContent = lawan; });
    const wadah = $("pilih-topik");
    if (!wadah.children.length) {
      TOPIK.forEach((t) => {
        const b = el("button", "opsi-topik", t.nama);
        b.type = "button";
        b.dataset.topik = t.id;
        b.setAttribute("role", "radio");
        b.addEventListener("click", () => { if (state && state.topik !== t.id) minta({ t: "topik", topik: t.id }); });
        wadah.appendChild(b);
      });
    }
    wadah.querySelectorAll(".opsi-topik").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.topik === state.topik)));
    $("deskripsi-topik").textContent = cariTopik(state.topik).deskripsi || "";
    const sudah = state.setujuTopik[saya];
    $("btn-setuju-topik").disabled = sudah || !terhubung;
    $("btn-setuju-topik").textContent = sudah ? "Udah Setuju" : "Oke, Pakai Topik Ini!";
    const nama = cariTopik(state.topik).nama;
    if (sudah) pesan("pesan-topik", "Menunggu " + lawan + " setuju dengan topik " + nama + ".", true);
    else if (state.setujuTopik[1 - saya]) pesan("pesan-topik", lawan + " udah pilih topik " + nama + ". Kamu setuju?", true);
    else pesan("pesan-topik", "");
    [0, 1].forEach((i) => {
      const c = $("setuju-" + i);
      c.textContent = namaPemain(i) + (state.setujuTopik[i] ? ": setuju" : ": masih milih");
      c.classList.toggle("ok", !!state.setujuTopik[i]);
    });
  }

  // =====================================================================
  // CARA MAIN (gulungan kertas)
  // =====================================================================
  function tampilAturan() {
    const lawan = namaPemain(1 - indeksSaya());
    const teks = state.mode === "teks";
    $("aturan-topik").textContent = "Topik: " + cariTopik(state.topik).nama + " · " + NAMA_MODE[state.mode];
    const poin = [
      "Tulis satu pertanyaan rahasia dan, kalau mau, satu tantangan buat " + lawan + ". Isinya baru muncul di tengah permainan.",
      "Gantian putar dadu. Yang memutar dadu yang menjawab kartu yang keluar.",
      teks
        ? "Jawab dengan mengetik beberapa kalimat, lalu kirim. Ada waktu " + BATAS_MENIT.teks + " menit per kartu."
        : "Jawab kartunya sambil teleponan. Santai aja, ada waktu " + BATAS_MENIT.telepon + " menit per kartu.",
      "Pendengar kasih bintang 1 sampai 5. Nilainya baru kelihatan di rangkuman saat kalian Rehat Dulu.",
    ];
    const ol = $("daftar-aturan");
    ol.innerHTML = "";
    poin.forEach((p) => ol.appendChild(el("li", null, p)));
    const m = $("modal-aturan");
    m.hidden = false;
    // Mulai ulang animasi gulungan setiap kali dibuka
    m.classList.remove("buka"); void m.offsetWidth; m.classList.add("buka");
    document.body.classList.add("modal-buka");
  }
  function tutupAturan() {
    $("modal-aturan").hidden = true;
    if ($("modal-rangkuman").hidden) document.body.classList.remove("modal-buka");
  }

  // =====================================================================
  // MODE PENGEMBANGAN: BOT
  // Bot berperan sebagai pemain kedua (indeks 1) dan menjalankan aksi lewat aksi(1, ...).
  // =====================================================================
  const JAWABAN_BOT = [
    "Ini jawaban dari bot. Ceritanya agak panjang, tapi intinya aku senang ditanya hal ini.",
    "Jawaban bot: jujur aku belum pernah kepikiran, tapi kayaknya jawabannya iya.",
    "Bot menjawab: aku pilih yang sederhana aja, yang penting bareng-bareng.",
  ];
  function mulaiDev() {
    setTombolAwal(false);
    pesan("pesan-awal", "");
    terapkanState(state, false);
    setTimeout(() => {
      if (!state || state.nama[1]) return;
      state.nama[1] = "Bot";
      terhubung = true;
      kirimDanTerapkan(false);
      toast("Bot bergabung");
    }, 1200);
  }
  function jadwalBot(jeda) {
    clearTimeout(timerBot);
    timerBot = setTimeout(gerakBot, jeda || 1500);
  }
  function gerakBot() {
    if (!DEV || !state || !state.nama[1]) return;
    const s = state;
    if (s.fase === "topik") {
      if (s.setujuTopik[0] && !s.setujuTopik[1]) aksi(1, { t: "setujuTopik", topik: s.topik });
      return;
    }
    if (s.fase === "persiapan") {
      if (s.siap[0] && !s.siap[1]) aksi(1, { t: "siap", pertanyaan: "Pertanyaan rahasia dari bot: apa hal kecil yang bikin kamu senang hari ini?", tantangan: "Tantangan dari bot: sebutkan tiga hal yang kamu syukuri minggu ini." });
      return;
    }
    if (s.fase === "jeda") {
      if (s.siapLanjut[0] && !s.siapLanjut[1]) aksi(1, { t: "lanjut" });
      return;
    }
    if (s.fase !== "main") return;
    if (Date.now() < animasiSampai) { jadwalBot(animasiSampai - Date.now() + 300); return; }
    const k = kartuKini(s);
    if (bolehPutar(s, 1)) { aksi(1, { t: "putar" }); return; }
    if (k && k.oleh === 1 && s.mode === "teks" && !k.jawaban) {
      aksi(1, { t: "jawab", jawaban: JAWABAN_BOT[Math.floor(Math.random() * JAWABAN_BOT.length)] });
      return;
    }
    if (k && k.oleh === 0 && !k.bintang && (s.mode === "telepon" || k.jawaban)) {
      aksi(1, { t: "nilai", bintang: 3 + Math.floor(Math.random() * 3), catatan: "Catatan dari bot." });
    }
  }

  function buatRuangan() {
    const n = ambilNama();
    if (!n) return;
    tutupPeer();
    namaSaya = n;
    peran = "host";
    kode = buatKode();
    state = stateBaru(n, null, 0, modeDipilih);
    rondeTerakhir = -1;
    rollTerakhir = -1;
    pesan("pesan-awal", "Membuat ruangan...", true);
    setTombolAwal(true);
    aturanRonde = -1;
    if (DEV) { mulaiDev(); return; }
    mulaiHost(false);
  }

  function gabungRuangan() {
    const n = ambilNama();
    if (!n) return;
    if (DEV) { pesan("pesan-awal", "Di mode pengembangan cukup tekan Bikin Ruangan. Bot akan masuk otomatis."); return; }
    const k = bersihkanKode($("input-kode").value);
    if (k.length !== 5) {
      pesan("pesan-awal", "Kode ruangan terdiri dari 5 huruf atau angka.");
      $("input-kode").focus();
      return;
    }
    tutupPeer();
    namaSaya = n;
    peran = "tamu";
    kode = k;
    state = null;
    infoModeTampil = false;
    rondeTerakhir = -1;
    rollTerakhir = -1;
    pesan("pesan-awal", "Menyambung ke ruangan " + k + "...", true);
    setTombolAwal(true);
    mulaiTamu();
  }

  function lanjutkanSesi() {
    const s = bacaSesi();
    if (!s) return;
    tutupPeer();
    namaSaya = s.nama;
    kode = s.kode;
    peran = s.peran;
    rondeTerakhir = -1;
    rollTerakhir = -1;
    setTombolAwal(true);
    pesan("pesan-awal", "Membuka ruangan " + kode + "...", true);
    if (peran === "host" && s.state) {
      state = s.state;
      mulaiHost(true);
    } else {
      state = null;
      mulaiTamu();
    }
  }

  // Menutup ruangan di HP ini dan kembali ke layar awal. Permainan tersimpan dihapus.
  function akhiriRuangan() {
    sengajaKeluar = true;
    clearTimeout(timerBot);
    $("pilih-topik").innerHTML = "";
    setTimeout(tutupPeer, 300);
    hapusSesi();
    state = null;
    peran = null;
    terhubung = false;
    tutupModal();
    siapkanLayarAwal();
    tampilkanLayar("layar-awal");
  }

  function keluar() {
    const peringatan = conn && conn.open ? "" : " Saat ini kamu belum tersambung dengan pasanganmu, jadi ia belum akan langsung tahu kamu keluar.";
    if (!confirm("Keluar dari permainan? Permainan akan selesai untuk kalian berdua dan tidak bisa dilanjutkan lagi." + peringatan)) return;
    if (conn && conn.open) { try { conn.send({ t: peran === "host" ? "tutup" : "keluar" }); } catch (e) {} }
    akhiriRuangan();
  }

  // Layar awal punya dua langkah: pilih cara ngobrol, lalu isi nama.
  // Tamu yang datang lewat tautan undangan langsung ke langkah nama, karena mode mengikuti ruangan.
  function tampilLangkahAwal() {
    const dariTautan = ruangDariTautanAktif && !modeDipilih;
    const langkahNama = !!modeDipilih || dariTautan;
    $("pilih-mode").hidden = langkahNama;
    $("isi-nama").hidden = !langkahNama;
    $("btn-buat").hidden = dariTautan;
    document.querySelector("#isi-nama .pemisah").hidden = dariTautan;
    $("label-mode").textContent = dariTautan ? "Mode mengikuti ruangan yang mengundangmu" : "Mode: " + NAMA_MODE[modeDipilih];
    $("btn-ganti-mode").textContent = dariTautan ? "Buat ruangan sendiri" : "Ganti";
    $("catatan-mode").textContent = !langkahNama ? "Pilih cara ngobrol yang paling nyaman untuk kalian berdua."
      : modeDipilih === "teks" ? "Kalian cukup saling berkirim jawaban lewat game ini, tanpa perlu telepon."
      : modeDipilih === "telepon" ? "Game ini hanya menampilkan permainan. Untuk ngobrol, gunakan telepon WhatsApp seperti biasa."
      : "";
  }

  function siapkanLayarAwal() {
    setTombolAwal(false);
    pesan("pesan-awal", "");
    tampilLangkahAwal();
    const s = bacaSesi();
    const btn = $("btn-lanjut");
    if (s && s.kode && s.nama) {
      btn.hidden = false;
      btn.textContent = "Lanjut Main di Ruangan " + s.kode;
    } else {
      btn.hidden = true;
    }
  }

  // =====================================================================
  // PASANG TOMBOL
  // =====================================================================
  document.querySelectorAll(".opsi-mode").forEach((b) => b.addEventListener("click", () => {
    modeDipilih = b.dataset.mode;
    pesan("pesan-awal", "");
    tampilLangkahAwal();
    $("input-nama").focus();
  }));
  $("btn-ganti-mode").addEventListener("click", () => {
    modeDipilih = null;
    ruangDariTautanAktif = false;
    pesan("pesan-awal", "");
    tampilLangkahAwal();
  });
  $("input-jawaban").addEventListener("input", (e) => {
    $("hitung-jawaban").textContent = e.target.value.length;
    $("btn-kirim-jawaban").disabled = !e.target.value.trim() || !terhubung;
  });
  $("btn-kirim-jawaban").addEventListener("click", () => {
    const teks = $("input-jawaban").value.trim();
    if (!teks) return;
    $("btn-kirim-jawaban").disabled = true;
    minta({ t: "jawab", jawaban: teks });
  });
  $("btn-buat").addEventListener("click", buatRuangan);
  $("btn-gabung").addEventListener("click", gabungRuangan);
  $("btn-lanjut").addEventListener("click", lanjutkanSesi);
  $("input-kode").addEventListener("input", (e) => { e.target.value = bersihkanKode(e.target.value); });
  $("input-kode").addEventListener("keydown", (e) => { if (e.key === "Enter") gabungRuangan(); });

  $("btn-salin").addEventListener("click", async () => {
    const link = tautanRuangan();
    try {
      await navigator.clipboard.writeText(link);
    } catch (e) {
      const t = document.createElement("textarea");
      t.value = link; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (_) {}
      t.remove();
    }
    toast("Tautan disalin");
  });

  $("btn-batal").addEventListener("click", () => {
    sengajaKeluar = true;
    tutupPeer();
    hapusSesi();
    state = null;
    siapkanLayarAwal();
    tampilkanLayar("layar-awal");
  });

  $("btn-siap").addEventListener("click", () => {
    const tanya = $("rahasia-1").value.trim();
    if (!tanya) {
      pesan("pesan-persiapan", "Tulis pertanyaan rahasianya dulu, ya.");
      $("rahasia-1").focus();
      return;
    }
    minta({ t: "siap", pertanyaan: tanya, tantangan: $("rahasia-2").value.trim() });
  });
  $("btn-ubah-rahasia").addEventListener("click", () => {
    minta({ t: "batalSiap" });
    setTimeout(() => $("rahasia-1").focus(), 100);
  });
  $("btn-setuju-topik").addEventListener("click", () => { if (state) minta({ t: "setujuTopik", topik: state.topik }); });
  $("btn-tutup-aturan").addEventListener("click", tutupAturan);
  $("btn-keluar-topik").addEventListener("click", keluar);
  $("pilih-target").addEventListener("change", (e) => minta({ t: "target", target: Number(e.target.value) }));

  $("btn-putar").addEventListener("click", () => {
    if (!state || !bolehPutar(state, indeksSaya()) || Date.now() < animasiSampai) return;
    $("btn-putar").disabled = true;
    minta({ t: "putar" });
  });

  $("bintang-pilih").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) aturBintangPilih(Number(b.dataset.n));
  });
  $("btn-nilai").addEventListener("click", () => {
    if (!bintangDipilih) return;
    $("btn-nilai").disabled = true;
    minta({ t: "nilai", bintang: bintangDipilih, catatan: $("input-catatan").value });
  });
  $("btn-akhiri").addEventListener("click", () => {
    const k = state && kartuKini(state);
    const peringatan = k && !k.bintang ? " Kartu terakhir belum dinilai dan tidak akan masuk penilaian." : "";
    if (confirm("Rehat dulu dan lihat rangkuman? Permainan tetap tersimpan, jadi bisa lanjut kapan saja." + peringatan)) minta({ t: "akhiri" });
  });

  const mintaUlang = () => {
    if (confirm("Mulai dari awal? Semua kartu dikocok ulang, penilaian dihapus, dan kalian menulis pertanyaan rahasia baru.")) minta({ t: "ulang" });
  };
  $("btn-ulang").addEventListener("click", mintaUlang);
  $("btn-lanjut-main").addEventListener("click", () => minta({ t: "lanjut" }));
  $("btn-keluar").addEventListener("click", keluar);
  $("btn-keluar-akhir").addEventListener("click", keluar);

  // =====================================================================
  // MULAI
  // =====================================================================
  ruangDariTautanAktif = !!bersihkanKode(new URLSearchParams(location.search).get("room"));
  const ruangDariTautan = bersihkanKode(new URLSearchParams(location.search).get("room"));
  const sesiLama = bacaSesi();
  if (sesiLama && sesiLama.nama) $("input-nama").value = sesiLama.nama;
  if (ruangDariTautan) $("input-kode").value = ruangDariTautan;
  siapkanLayarAwal();
  if (ruangDariTautan) pesan("pesan-awal", "Kamu diundang ke ruangan " + ruangDariTautan + ". Tulis namamu lalu tekan Gabung.", true);
  if (DEV) {
    const tanda = el("div", "tanda-dev", "Mode pengembangan: main bareng bot");
    document.body.appendChild(tanda);
    document.body.classList.add("dev");
    // Akses untuk pengujian otomatis, hanya di mode pengembangan
    window.__salingBercerita = { get state() { return state; }, kirim: () => kirimDanTerapkan(false) };
  } else if (typeof Peer === "undefined") {
    pesan("pesan-awal", "Gagal memuat komponen online. Periksa koneksi internet lalu muat ulang halaman.");
    setTombolAwal(true);
  }
})();
