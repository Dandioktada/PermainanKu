/* Saling Bercerita
 * Dua pemain terhubung lewat internet (PeerJS / WebRTC).
 * Pembuat ruangan (host) menyimpan keadaan permainan dan mengirimkannya ke tamu.
 * Semua aksi tamu dikirim ke host, diproses di fungsi aksi(), lalu hasilnya dikirim balik.
 */
(function () {
  "use strict";

  const VERSI = 2;
  const AWALAN_ID = "salingbercerita-";
  const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const KUNCI_SESI = "salingbercerita-sesi";
  const LAMA_ANIMASI = 1600;
  const BATAS_SENYAP = 12000;
  const MAKS_MENIT_PER_KARTU = 60; // durasi kartu di atas ini dianggap jeda, tidak dihitung

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
  let topikDipilih = TOPIK[0].id;
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
  let popupDilihat = "";
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
  function cariTopik(id) { return TOPIK.find((t) => t.id === id) || TOPIK[0]; }
  function bintangTeks(n) { return "★".repeat(n) + "☆".repeat(5 - n); }
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
    try {
      const data = { peran, kode, nama: namaSaya };
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
  function hapusSesi() {
    try { localStorage.removeItem(KUNCI_SESI); } catch (e) { /* abaikan */ }
  }

  function opsiPeer() {
    // Untuk pengujian lokal: ?server=localhost:9000
    const s = new URLSearchParams(location.search).get("server");
    if (!s) return { debug: 1 };
    const [host, port] = s.split(":");
    return { host, port: Number(port) || 9000, path: "/", secure: false, debug: 1 };
  }

  function tutupPeer() {
    clearTimeout(timerSambung);
    timerSambung = null;
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    conn = null;
    peer = null;
  }

  // =====================================================================
  // KEADAAN PERMAINAN (hanya diubah oleh host)
  // =====================================================================
  function stateBaru(namaHost, topikId, ronde) {
    const t = cariTopik(topikId);
    return {
      versi: VERSI,
      topik: t.id,
      nama: [namaHost, null],
      fase: "persiapan",          // persiapan | main | ringkasan
      siap: [false, false],
      rahasia: [],                // { dari, untuk, teks, posisi, keluar }
      dek: { coklat: acak(urutan(t.coklat.kartu.length)), hijau: acak(urutan(t.hijau.kartu.length)) },
      giliran: 0,
      riwayat: [],                // kartu yang sudah keluar; kartu terakhir = kartu yang sedang dibahas
      rollId: 0,
      ronde: ronde || 0,
      sesi: 1,
      selesaiPada: null,
    };
  }

  function kartuKini(s) { return s.riwayat.length ? s.riwayat[s.riwayat.length - 1] : null; }
  function sisaRahasia(s) { return s.rahasia.filter((r) => !r.keluar).length; }
  function sisaTotal(s) { return s.dek.coklat.length + s.dek.hijau.length + sisaRahasia(s); }
  function teksKartu(s, k) {
    if (k.jenis === "rahasia") return k.teks;
    return cariTopik(s.topik)[k.warna].kartu[k.idx];
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
        nomor: state.riwayat.filter((r) => r.jenis === "rahasia").length + 1 };
    } else {
      let warna = Math.random() < 0.5 ? "coklat" : "hijau";
      if (state.dek[warna].length === 0) warna = warna === "coklat" ? "hijau" : "coklat";
      const pilihanSisi = Object.keys(SISI).filter((k) => SISI[k].warna === warna);
      const sisi = pilihanSisi[Math.floor(Math.random() * pilihanSisi.length)];
      const idx = state.dek[warna].pop();
      kartu = { jenis: "biasa", warna, sisi, idx, nomor: t[warna].kartu.length - state.dek[warna].length };
    }
    Object.assign(kartu, { oleh, sesi: state.sesi, bintang: null, catatan: "", waktuBuka: sekarang + LAMA_ANIMASI, waktuSelesai: null });
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
      case "siap": {
        if (state.fase !== "persiapan" || state.siap[oleh]) return;
        const daftar = (Array.isArray(d.pertanyaan) ? d.pertanyaan : [])
          .map((x) => String(x || "").trim().slice(0, 200)).filter(Boolean).slice(0, 3);
        if (!daftar.length) return;
        state.rahasia = state.rahasia.filter((r) => r.dari !== oleh)
          .concat(daftar.map((teks) => ({ dari: oleh, untuk: 1 - oleh, teks, posisi: 9999, keluar: false })));
        state.siap[oleh] = true;
        if (state.siap[0] && state.siap[1]) {
          jadwalkanRahasia();
          state.fase = "main";
        }
        break;
      }
      case "putar":
        putar(oleh);
        return;
      case "nilai": {
        const k = kartuKini(state);
        const n = Math.round(Number(d.bintang));
        if (state.fase !== "main" || !k || k.bintang || k.oleh === oleh || !(n >= 1 && n <= 5)) return;
        k.bintang = n;
        k.catatan = String(d.catatan || "").trim().slice(0, 300);
        break;
      }
      case "akhiri": {
        if (state.fase !== "main") return;
        const k = kartuKini(state);
        if (k && !k.waktuSelesai) k.waktuSelesai = Date.now();
        state.fase = "ringkasan";
        state.selesaiPada = Date.now();
        break;
      }
      case "lanjut":
        if (state.fase !== "ringkasan") return;
        state.fase = "main";
        state.sesi += 1;
        // Kartu terakhir yang belum sempat dinilai ikut dinilai di sesi baru
        { const k = kartuKini(state); if (k && !k.bintang) k.sesi = state.sesi; }
        break;
      case "ulang": {
        const nama = state.nama;
        state = stateBaru(nama[0], state.topik, state.ronde + 1);
        state.nama = nama;
        break;
      }
      default:
        return;
    }
    kirimDanTerapkan(false);
  }

  function kirimDanTerapkan(animasi) {
    simpanSesi();
    if (conn && conn.open) conn.send({ t: "state", state, animasi });
    terapkanState(state, animasi);
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
      $("kartu-tema").textContent = "Kartu Rahasia dari " + namaPemain(k.dari);
      $("kartu-teks").textContent = k.teks;
      $("kartu-no").textContent = "Pertanyaan ini untuk " + A + ". Jawab dengan jujur, ya.";
    } else {
      $("kartu-tema").textContent = t[k.warna].label;
      isiNama($("kartu-teks"), t[k.warna].kartu[k.idx], A, B);
      $("kartu-no").textContent = `Kartu ${NAMA_WARNA[k.warna]} ${k.nomor}/${t[k.warna].kartu.length} · dijawab ${A}`;
    }
    if (balik) { void box.offsetWidth; box.classList.add("balik"); }
  }

  // ---------- Panel penilaian (selama permainan, hanya untuk pendengar) ----------
  function perbaruiPanelNilai() {
    const k = kartuKini(state);
    const saya = indeksSaya();
    const tampil = state.fase === "main" && k && !k.bintang && k.oleh !== saya && Date.now() >= animasiSampai;
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

  // ---------- Pop-up feedback (muncul saat permainan diakhiri) ----------
  // Menampilkan bintang dan kalimat feedback yang DITERIMA pemain ini pada sesi yang baru selesai.
  function tampilPopupFeedback() {
    const modal = $("modal-feedback");
    const kunci = state.ronde + ":" + state.sesi;
    if (state.fase !== "ringkasan" || popupDilihat === kunci) {
      modal.hidden = true;
      document.body.classList.remove("modal-buka");
      return;
    }
    if (!modal.hidden) return;
    const saya = indeksSaya();
    const lawan = namaPemain(1 - saya);
    modal.querySelectorAll(".nama-lawan").forEach((e) => { e.textContent = lawan; });
    const wadah = $("daftar-feedback");
    wadah.innerHTML = "";
    const milik = state.riwayat.filter((r) => r.oleh === saya && r.sesi === state.sesi);
    if (!milik.length) wadah.appendChild(el("p", "nilai-tunggu", "Di sesi ini kamu belum menjawab kartu."));
    milik.forEach((r, urut) => {
      const item = el("div", "item-nilai " + r.warna);
      const asal = r.jenis === "rahasia" ? "Kartu rahasia" : "Kartu " + NAMA_WARNA[r.warna];
      item.appendChild(el("p", "item-nilai-label", (urut + 1) + ". " + asal));
      item.appendChild(el("p", "item-nilai-teks", teksPolos(teksKartu(state, r), namaPemain(r.oleh), namaPemain(1 - r.oleh))));
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
    modal.hidden = false;
    document.body.classList.add("modal-buka");
    wadah.scrollTop = 0;
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
    else if (habis) teks = "Semua kartu sudah keluar. Tekan Akhiri permainan untuk menilai dan melihat ringkasan.";
    else if (k && !k.bintang && k.oleh === saya) teks = "Giliran kamu bercerita. Setelah selesai, " + lawan + " mengisi penilaian.";
    else if (k && !k.bintang) { teks = "Dengarkan cerita " + lawan + ", lalu isi penilaian di bawah."; sorot = true; }
    else if (state.giliran === saya) { teks = "Giliran kamu memutar dadu"; sorot = true; }
    else teks = "Menunggu " + lawan + " memutar dadu";

    info.textContent = teks;
    info.classList.toggle("saya", sorot);
    btn.hidden = habis;
    btn.disabled = !bolehPutar(state, saya) || !terhubung || sedangAnimasi;
    $("btn-akhiri").disabled = !terhubung;
    perbaruiPanelNilai();
  }

  function perbaruiSisaDanRiwayat() {
    $("sisa-coklat").textContent = state.dek.coklat.length;
    $("sisa-hijau").textContent = state.dek.hijau.length;
    $("jumlah-riwayat").textContent = state.riwayat.length;
    const ol = $("daftar-riwayat");
    ol.innerHTML = "";
    state.riwayat.slice().reverse().forEach((r) => {
      const li = el("li", r.warna);
      const kecil = el("small", null, NAMA_WARNA[r.warna] + " " + r.nomor + " · dijawab " + namaPemain(r.oleh) + " ");
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
    if (sudah) pesan("pesan-persiapan", "Pertanyaanmu sudah tersimpan. Menunggu " + lawan + " selesai menulis...", true);
    [0, 1].forEach((i) => {
      const c = $("siap-" + i);
      c.textContent = namaPemain(i) + (state.siap[i] ? ": siap" : ": sedang menulis");
      c.classList.toggle("ok", !!state.siap[i]);
    });
    const t = cariTopik(state.topik);
    const n = t.coklat.kartu.length + t.hijau.kartu.length;
    $("info-durasi").innerHTML = "";
    $("info-durasi").append(
      "Topik ", el("b", null, t.nama), " berisi " + n + " kartu. Setiap kartu biasanya dijawab 10 sampai 15 menit, jadi semua kartu butuh sekitar " +
      formatMenit(n * 10) + " sampai " + formatMenit(n * 15) + ". Tidak perlu dihabiskan sekaligus. Tekan ",
      el("b", null, "Akhiri permainan"), " kapan saja untuk melihat ringkasan, lalu lanjutkan sisa kartu di lain waktu."
    );
  }

  function layarUntuk(s) {
    if (!s.nama[1]) return "layar-tunggu";
    return { persiapan: "layar-persiapan", main: "layar-main", ringkasan: "layar-ringkasan" }[s.fase];
  }

  function terapkanState(s, animasi) {
    const rondeBaru = s.ronde !== rondeTerakhir;
    const adaRollBaru = !rondeBaru && s.rollId > rollTerakhir;
    if (rondeBaru) {
      document.querySelectorAll(".input-rahasia").forEach((t) => { t.value = ""; });
      pesan("pesan-persiapan", "");
    }
    state = s;
    rondeTerakhir = s.ronde;
    rollTerakhir = s.rollId;

    const layar = layarUntuk(s);
    if (layar === "layar-tunggu") { if (peran === "host") tampilkanRuanganTunggu(); return; }
    tampilkanLayar(layar);
    tampilPopupFeedback();

    // Beri tahu yang menjawab bahwa penilaian sudah masuk, tanpa menunjukkan isinya
    const kk = kartuKini(s);
    const tandaNilai = kk ? s.ronde + ":" + s.rollId + ":" + !!kk.bintang : "";
    if (kk && kk.bintang && kk.oleh === indeksSaya() && tandaTerakhir && tandaTerakhir !== tandaNilai && s.fase === "main") {
      toast(namaPemain(1 - kk.oleh) + " sudah mengisi penilaian. Hasilnya bisa dilihat saat permainan diakhiri.");
    }
    tandaTerakhir = tandaNilai;

    if (s.fase === "persiapan") { perbaruiPersiapan(); return; }
    if (s.fase === "ringkasan") { tampilRingkasan(); return; }

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
  }

  // =====================================================================
  // RINGKASAN DAN SARAN
  // =====================================================================
  function hitungRingkasan(s) {
    const t = cariTopik(s.topik);
    const dinilai = s.riwayat.filter((r) => r.bintang);
    const durasi = s.riwayat.filter((r) => r.waktuSelesai)
      .map((r) => Math.max(0, (r.waktuSelesai - r.waktuBuka) / 60000)).filter((m) => m <= MAKS_MENIT_PER_KARTU);
    const pemain = [0, 1].map((i) => {
      const milik = dinilai.filter((r) => r.oleh === i);
      const perWarna = {};
      ["coklat", "hijau", "rahasia"].forEach((w) => {
        perWarna[w] = rata(milik.filter((r) => r.warna === w).map((r) => r.bintang));
      });
      return { nama: s.nama[i], jumlah: milik.length, rata: rata(milik.map((r) => r.bintang)), perWarna };
    });
    const sesiIni = dinilai.filter((r) => r.sesi === s.sesi);
    return {
      topik: t,
      dinilai,
      sesiIni,
      totalKartu: t.coklat.kartu.length + t.hijau.kartu.length,
      sisaBiasa: s.dek.coklat.length + s.dek.hijau.length,
      sisaRahasia: sisaRahasia(s),
      totalMenit: durasi.reduce((a, b) => a + b, 0),
      rataMenit: rata(durasi),
      rataSemua: rata(dinilai.map((r) => r.bintang)),
      pemain,
      berkesan: dinilai.filter((r) => r.bintang >= 5),
      perluDibahas: dinilai.filter((r) => r.bintang <= 2),
      rahasia: s.riwayat.filter((r) => r.jenis === "rahasia"),
    };
  }

  function buatSaran(s, R) {
    const saran = [];
    const [p0, p1] = R.pemain;
    const nama = (i) => s.nama[i];

    if (!R.dinilai.length) {
      saran.push("Belum ada kartu yang selesai dinilai. Coba jawab minimal tiga atau empat kartu dulu supaya ringkasannya lebih bermakna.");
      return saran;
    }

    if (R.rataSemua >= 4.5) {
      saran.push("Obrolan kalian hari ini terasa sangat nyambung. Pertahankan kebiasaan saling mendengarkan seperti ini, termasuk di luar permainan.");
    } else if (R.rataSemua >= 3.5) {
      saran.push("Secara umum kalian sudah saling puas dengan jawaban masing-masing. Untuk jawaban yang masih di bintang 3, coba ajukan satu pertanyaan lanjutan supaya ceritanya lebih utuh.");
    } else {
      saran.push("Masih banyak jawaban yang terasa belum tuntas. Tidak apa-apa, justru ini tanda ada hal penting yang perlu dibicarakan lebih pelan. Pilih waktu yang lebih santai dan tidak terburu-buru.");
    }

    [0, 1].forEach((i) => {
      const p = R.pemain[i];
      const lawan = nama(1 - i);
      const t = R.topik;
      if (p.perWarna.coklat != null && p.perWarna.coklat < 3) {
        saran.push(`Saat ${p.nama} bercerita soal ${t.coklat.label.toLowerCase().replace(/ · /g, ", ")}, ${lawan} merasa jawabannya belum cukup jelas. ${p.nama} bisa mencoba bercerita lebih konkret, misalnya dengan contoh atau rencana kecil yang nyata.`);
      }
      if (p.perWarna.hijau != null && p.perWarna.hijau < 3) {
        saran.push(`Untuk kartu ${t.hijau.label.toLowerCase().replace(/ · /g, ", ")}, jawaban ${p.nama} masih terasa kurang buat ${lawan}. ${lawan} bisa menyampaikan apa yang sebenarnya ingin didengar, dan ${p.nama} bisa mencoba lebih terbuka soal perasaan.`);
      }
      if (p.perWarna.rahasia != null && p.perWarna.rahasia < 4) {
        saran.push(`Pertanyaan rahasia dari ${lawan} belum terjawab dengan tuntas. Hal yang ditulis di kartu rahasia biasanya sudah lama dipikirkan, jadi sebaiknya dibahas lagi berdua di waktu khusus.`);
      }
    });

    if (p0.rata != null && p1.rata != null && Math.abs(p0.rata - p1.rata) >= 1) {
      const rendah = p0.rata < p1.rata ? 0 : 1;
      saran.push(`Ada selisih penilaian yang cukup jauh antara kalian. ${nama(1 - rendah)} tampaknya butuh jawaban yang lebih dalam dari ${nama(rendah)}. Tanyakan langsung: "Bagian mana yang masih kurang?"`);
    }

    if (R.perluDibahas.length) {
      saran.push(`Ada ${R.perluDibahas.length} kartu dengan bintang 1 atau 2. Kartu-kartu itu tercantum di bagian "Perlu dibicarakan lagi". Bahas satu per satu dengan kepala dingin, jangan sekaligus.`);
    }

    if (R.rataMenit != null && R.rataMenit < 5 && R.dinilai.length >= 3) {
      saran.push(`Rata-rata satu kartu selesai dalam ${formatMenit(R.rataMenit)}. Coba beri ruang lebih lama untuk bercerita. Pendengar juga boleh bertanya "Terus?" atau "Kenapa begitu?" sebelum mengisi penilaian.`);
    }

    if (R.berkesan.length) {
      saran.push(`Ada ${R.berkesan.length} jawaban yang mendapat bintang 5. Simpan momen-momen itu, karena di situlah kalian merasa paling dimengerti.`);
    }

    if (R.sisaBiasa + R.sisaRahasia > 0) {
      saran.push(`Masih ada ${R.sisaBiasa + R.sisaRahasia} kartu tersisa. Lanjutkan di sesi berikutnya, cukup 4 sampai 6 kartu sekali main supaya tidak melelahkan.`);
    } else {
      saran.push("Semua kartu sudah kalian jawab. Selamat! Kalian bisa mengulang dari awal beberapa bulan lagi untuk melihat apa saja yang berubah.");
    }
    return saran;
  }

  function tampilRingkasan() {
    const s = state;
    const R = hitungRingkasan(s);
    const wadah = $("ringkasan-isi");
    wadah.innerHTML = "";
    const tgl = new Date(s.selesaiPada || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    $("ringkasan-sub").textContent = R.topik.nama + " · " + s.nama[0] + " & " + s.nama[1] + " · " + tgl;

    // Angka utama
    const b1 = el("section", "blok");
    const stat = el("div", "statistik");
    [[s.riwayat.length + "/" + (R.totalKartu + s.rahasia.length), "kartu dijawab"],
     [R.totalMenit ? formatMenit(R.totalMenit) : "-", "waktu bercerita"],
     [R.rataSemua != null ? bulat1(R.rataSemua) + "★" : "-", "rata-rata bintang"]].forEach(([a, b]) => {
      const d = el("div"); d.append(el("b", null, a), el("span", null, b)); stat.appendChild(d);
    });
    b1.appendChild(stat);
    if (s.sesi > 1) b1.appendChild(el("p", "kosong-ket", "Ini rangkuman dari " + s.sesi + " sesi bermain. Di sesi ini kalian menjawab " + R.sesiIni.length + " kartu."));
    wadah.appendChild(b1);

    // Per pemain
    const b2 = el("section", "blok");
    b2.appendChild(el("h2", null, "Penilaian untuk masing-masing"));
    const skor = el("div", "skor-pemain");
    R.pemain.forEach((p, i) => {
      const baris = el("div", "skor-baris");
      const atas = el("div", "atas");
      atas.append(el("span", null, p.nama), el("span", "bintang-tampil", p.rata != null ? bulat1(p.rata) + " ★" : "-"));
      baris.appendChild(atas);
      const bagian = [];
      ["coklat", "hijau", "rahasia"].forEach((w) => { if (p.perWarna[w] != null) bagian.push(NAMA_WARNA[w] + " " + bulat1(p.perWarna[w]) + "★"); });
      baris.appendChild(el("small", null, "Menjawab " + p.jumlah + " kartu, dinilai oleh " + s.nama[1 - i] + (bagian.length ? " · " + bagian.join(" · ") : "")));
      skor.appendChild(baris);
    });
    b2.appendChild(skor);
    wadah.appendChild(b2);

    const daftarKartu = (judul, list, kosong) => {
      const b = el("section", "blok");
      b.appendChild(el("h2", null, judul));
      if (!list.length) { b.appendChild(el("p", "kosong-ket", kosong)); return b; }
      list.forEach((r) => {
        const it = el("div", "item-kartu " + r.warna);
        const asal = r.jenis === "rahasia" ? "Rahasia dari " + s.nama[r.dari] : NAMA_WARNA[r.warna] + " " + r.nomor;
        it.appendChild(el("small", null, asal + " · dijawab " + s.nama[r.oleh] + " · " + bintangTeks(r.bintang)));
        it.appendChild(document.createTextNode(teksPolos(teksKartu(s, r), s.nama[r.oleh], s.nama[1 - r.oleh])));
        if (r.catatan) it.appendChild(el("q", null, s.nama[1 - r.oleh] + ": " + r.catatan));
        b.appendChild(it);
      });
      return b;
    };
    wadah.appendChild(daftarKartu("Jawaban paling berkesan", R.berkesan, "Belum ada jawaban dengan bintang 5."));
    wadah.appendChild(daftarKartu("Perlu dibicarakan lagi", R.perluDibahas, "Tidak ada kartu dengan bintang 1 atau 2."));
    if (R.rahasia.length) wadah.appendChild(daftarKartu("Kartu rahasia", R.rahasia.filter((r) => r.bintang), "Kartu rahasia belum dinilai."));

    // Semua kalimat feedback, dikelompokkan per penerima
    const bFb = el("section", "blok");
    bFb.appendChild(el("h2", null, "Kalimat feedback"));
    let adaFb = false;
    [0, 1].forEach((i) => {
      const milik = R.dinilai.filter((r) => r.oleh === i && r.catatan);
      if (!milik.length) return;
      adaFb = true;
      bFb.appendChild(el("p", "fb-judul", "Untuk " + s.nama[i] + ", dari " + s.nama[1 - i]));
      milik.forEach((r) => {
        const it = el("div", "item-kartu " + r.warna);
        it.appendChild(el("small", null, bintangTeks(r.bintang) + " · " + teksPolos(teksKartu(s, r), s.nama[r.oleh], s.nama[1 - r.oleh])));
        it.appendChild(document.createTextNode(r.catatan));
        bFb.appendChild(it);
      });
    });
    if (!adaFb) bFb.appendChild(el("p", "kosong-ket", "Belum ada kalimat feedback yang ditulis."));
    wadah.appendChild(bFb);

    // Saran
    const b5 = el("section", "blok saran");
    b5.appendChild(el("h2", null, "Saran dan masukan"));
    const ul = el("ul");
    buatSaran(s, R).forEach((x) => ul.appendChild(el("li", null, x)));
    b5.appendChild(ul);
    wadah.appendChild(b5);

    $("btn-wa-ringkasan").href = "https://wa.me/?text=" + encodeURIComponent(teksRingkasanWA(s, R));
    $("btn-lanjut-main").hidden = R.sisaBiasa + R.sisaRahasia === 0;
  }

  function teksRingkasanWA(s, R) {
    const baris = [];
    baris.push("*Ringkasan Saling Bercerita*");
    baris.push(R.topik.nama + " · " + s.nama[0] + " & " + s.nama[1]);
    baris.push("");
    baris.push("Kartu dijawab: " + R.dinilai.length);
    if (R.totalMenit) baris.push("Waktu bercerita: " + formatMenit(R.totalMenit));
    R.pemain.forEach((p) => baris.push(p.nama + ": " + (p.rata != null ? bulat1(p.rata) + "★" : "-") + " dari " + p.jumlah + " kartu"));
    if (R.perluDibahas.length) {
      baris.push("");
      baris.push("*Perlu dibicarakan lagi:*");
      R.perluDibahas.forEach((r) => baris.push("- " + teksPolos(teksKartu(s, r), s.nama[r.oleh], s.nama[1 - r.oleh])));
    }
    const fb = R.dinilai.filter((r) => r.catatan);
    if (fb.length) {
      baris.push("");
      baris.push("*Kalimat feedback:*");
      fb.forEach((r) => baris.push("- Untuk " + s.nama[r.oleh] + " (" + r.bintang + "★): " + r.catatan));
    }
    baris.push("");
    baris.push("*Saran:*");
    buatSaran(s, R).forEach((x) => baris.push("- " + x));
    return baris.join("\n");
  }

  // =====================================================================
  // KONEKSI: HOST
  // =====================================================================
  function mulaiHost(lanjutan, percobaan) {
    percobaan = percobaan || 0;
    sengajaKeluar = false;
    peer = new Peer(AWALAN_ID + kode, opsiPeer());

    peer.on("open", () => {
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
        if (lanjutan && percobaan < 5) {
          pesan("pesan-awal", "Membuka ruangan lagi...", true);
          setTimeout(() => mulaiHost(true, percobaan + 1), 3000);
        } else if (!lanjutan) {
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
      if (conn && conn !== c) { try { conn.close(); } catch (e) {} }
      conn = c;
      const namaTamu = String(d.nama || "Tamu").trim().slice(0, 20) || "Tamu";
      const baru = !state.nama[1];
      state.nama[1] = namaTamu;
      terhubung = true;
      kirimDanTerapkan(false);
      toast(namaTamu + (baru ? " bergabung" : " tersambung lagi"));
      return;
    }
    if (c !== conn) return;
    aksi(1, d);
  }

  function tampilkanRuanganTunggu() {
    $("tampil-kode").textContent = kode;
    $("tampil-topik-tunggu").textContent = "Topik: " + cariTopik(state.topik).nama;
    const teks = "Yuk main Saling Bercerita bareng aku. Buka tautan ini: " + tautanRuangan() + " (kode ruangan: " + kode + ")";
    $("btn-wa").href = "https://wa.me/?text=" + encodeURIComponent(teks);
    pesan("pesan-tunggu", location.protocol === "file:" ? "Halaman ini dibuka dari file lokal, jadi tautan tidak bisa dibuka orang lain. Bagikan kodenya saja, atau unggah game ke hosting." : "");
    tampilkanLayar("layar-tunggu");
  }

  // =====================================================================
  // KONEKSI: TAMU
  // =====================================================================
  function mulaiTamu() {
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
    conn = c;
    c.on("open", () => {
      c.send({ t: "halo", nama: namaSaya });
      simpanSesi();
    });
    c.on("data", (d) => {
      if (!d || typeof d !== "object") return;
      pesanTerakhir = Date.now();
      if (d.t === "pong") { if (!terhubung && state) aturTerhubung(true); return; }
      if (d.t === "state") {
        terhubung = true;
        setTombolAwal(false);
        pesan("pesan-awal", "");
        terapkanState(d.state, !!d.animasi);
      }
      if (d.t === "tutup") {
        sengajaKeluar = true;
        hapusSesi();
        tutupPeer();
        state = null;
        siapkanLayarAwal();
        tampilkanLayar("layar-awal");
        pesan("pesan-awal", "Ruangan sudah ditutup oleh pembuatnya.");
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

  function tampilDaftarTopik() {
    const wadah = $("daftar-topik");
    wadah.innerHTML = "";
    TOPIK.forEach((t) => {
      const b = el("button", "opsi-topik");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(t.id === topikDipilih));
      b.appendChild(el("b", null, t.nama));
      const n = t.coklat.kartu.length + t.hijau.kartu.length;
      const kecil = el("small", null, t.deskripsi + " ");
      kecil.appendChild(el("span", "jumlah", n + " kartu."));
      b.appendChild(kecil);
      b.addEventListener("click", () => { topikDipilih = t.id; tampilDaftarTopik(); });
      wadah.appendChild(b);
    });
    if (TOPIK.length < 2) wadah.appendChild(el("p", "topik-segera", "Topik lain segera hadir."));
  }

  function buatRuangan() {
    const n = ambilNama();
    if (!n) return;
    tutupPeer();
    namaSaya = n;
    peran = "host";
    kode = buatKode();
    state = stateBaru(n, topikDipilih, 0);
    rondeTerakhir = -1;
    rollTerakhir = -1;
    pesan("pesan-awal", "Membuat ruangan...", true);
    setTombolAwal(true);
    mulaiHost(false);
  }

  function gabungRuangan() {
    const n = ambilNama();
    if (!n) return;
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

  function keluar() {
    if (!confirm("Keluar dari ruangan ini? Permainan yang belum selesai akan hilang.")) return;
    sengajaKeluar = true;
    if (peran === "host" && conn && conn.open) { try { conn.send({ t: "tutup" }); } catch (e) {} }
    setTimeout(tutupPeer, 200);
    hapusSesi();
    state = null;
    peran = null;
    terhubung = false;
    siapkanLayarAwal();
    tampilkanLayar("layar-awal");
  }

  function siapkanLayarAwal() {
    setTombolAwal(false);
    pesan("pesan-awal", "");
    tampilDaftarTopik();
    const s = bacaSesi();
    const btn = $("btn-lanjut");
    if (s && s.kode && s.nama) {
      btn.hidden = false;
      btn.textContent = "Lanjutkan ruangan " + s.kode + " sebagai " + s.nama;
    } else {
      btn.hidden = true;
    }
  }

  // =====================================================================
  // PASANG TOMBOL
  // =====================================================================
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
    const daftar = Array.from(document.querySelectorAll(".input-rahasia")).map((t) => t.value.trim()).filter(Boolean);
    if (!daftar.length) {
      pesan("pesan-persiapan", "Tulis minimal satu pertanyaan, ya.");
      $("rahasia-1").focus();
      return;
    }
    minta({ t: "siap", pertanyaan: daftar });
  });

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
  $("btn-tutup-feedback").addEventListener("click", () => {
    popupDilihat = state.ronde + ":" + state.sesi;
    tampilPopupFeedback();
    window.scrollTo(0, 0);
  });

  $("btn-akhiri").addEventListener("click", () => {
    const k = state && kartuKini(state);
    const peringatan = k && !k.bintang ? " Kartu terakhir belum dinilai dan tidak akan masuk penilaian." : "";
    if (confirm("Akhiri permainan sekarang dan lihat hasil feedback?" + peringatan + " Sisa kartu tetap tersimpan dan bisa dilanjutkan nanti.")) minta({ t: "akhiri" });
  });
  $("btn-lanjut-main").addEventListener("click", () => minta({ t: "lanjut" }));

  const mintaUlang = () => {
    if (confirm("Mulai dari awal? Semua kartu dikocok ulang, penilaian dihapus, dan kalian menulis pertanyaan rahasia baru.")) minta({ t: "ulang" });
  };
  $("btn-ulang").addEventListener("click", mintaUlang);
  $("btn-ulang-2").addEventListener("click", mintaUlang);
  $("btn-keluar").addEventListener("click", keluar);
  $("btn-keluar-2").addEventListener("click", keluar);

  // =====================================================================
  // MULAI
  // =====================================================================
  const ruangDariTautan = bersihkanKode(new URLSearchParams(location.search).get("room"));
  const sesiLama = bacaSesi();
  if (sesiLama && sesiLama.nama) $("input-nama").value = sesiLama.nama;
  if (ruangDariTautan) $("input-kode").value = ruangDariTautan;
  siapkanLayarAwal();
  if (ruangDariTautan) pesan("pesan-awal", "Kamu diundang ke ruangan " + ruangDariTautan + ". Tulis namamu lalu tekan Gabung.", true);
  if (typeof Peer === "undefined") {
    pesan("pesan-awal", "Gagal memuat komponen online. Periksa koneksi internet lalu muat ulang halaman.");
    setTombolAwal(true);
  }
})();
