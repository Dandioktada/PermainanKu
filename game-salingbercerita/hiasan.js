/* Saling Bercerita: hewan yang sesekali terbang melintas di depan layar.
 * Kucing bersayap dan kupu-kupu muncul bergantian dengan jeda acak,
 * supaya tampilan terasa hidup tapi tidak mengganggu permainan.
 */
(function () {
  "use strict";

  // ---------- Tema siang/malam ----------
  // Dicek setiap menit, jadi tema berganti sendiri saat lewat pukul 18.00 atau 06.00.
  function perbaruiWaktu() {
    const paksa = new URLSearchParams(location.search).get("waktu");
    const dev = /^pengembangan--/.test(location.hostname);
    const jam = new Date().getHours();
    const waktu = paksa === "siang" || paksa === "malam" ? paksa : dev ? "malam" : (jam >= 6 && jam < 18 ? "siang" : "malam");
    document.documentElement.setAttribute("data-waktu", waktu);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", waktu === "malam" ? "#121a3a" : "#8fcbee");
  }
  perbaruiWaktu();
  setInterval(perbaruiWaktu, 60000);

  const lapisan = document.getElementById("terbang");
  if (!lapisan) return;
  const kurangiGerak = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (kurangiGerak) return;

  const JEDA_MIN = 25000;   // jeda paling cepat antar hewan (ms)
  const JEDA_MAKS = 50000;  // jeda paling lama antar hewan (ms)
  let hitung = 0;

  function acakAntara(a, b) { return a + Math.random() * (b - a); }

  // Kucing hitam meloncat-loncat menyusuri bagian bawah layar
  function lepaskanKucingHitam() {
    const keKanan = Math.random() < 0.5;   // sprite menghadap kiri; dibalik kalau bergerak ke kanan
    const lintas = document.createElement("div");
    lintas.className = "loncat-lintas" + (keKanan ? " ke-kanan" : " ke-kiri");
    lintas.style.animationDuration = acakAntara(7, 9) + "s";
    const lompat = document.createElement("div");
    lompat.className = "lompat";
    const kucing = document.createElement("div");
    kucing.className = "kucing-hitam";
    lompat.appendChild(kucing);
    lintas.appendChild(lompat);
    lapisan.appendChild(lintas);
    lintas.addEventListener("animationend", (e) => { if (e.target === lintas) lintas.remove(); });
  }

  function lepaskanHewan() {
    if (document.visibilityState !== "visible") return;
    hitung += 1;
    // Urutan: kupu-kupu, kucing hitam, kucing bersayap, kupu-kupu, kucing hitam, ...
    if (hitung % 3 === 2) { lepaskanKucingHitam(); return; }
    // Kucing bersayap muncul setiap 3 kali, sisanya kupu-kupu
    const kucing = hitung % 3 === 0;
    const keKiri = Math.random() < 0.5;
    const durasi = kucing ? acakAntara(13, 17) : acakAntara(16, 22);

    const lintas = document.createElement("div");
    lintas.className = "lintas" + (keKiri ? " ke-kiri" : "");
    lintas.style.top = acakAntara(12, 70) + "vh";
    lintas.style.animationDuration = durasi + "s";

    const goyang = document.createElement("div");
    goyang.className = "goyang";
    goyang.style.animationDuration = (kucing ? 2.6 : 1.6) + "s";

    const hewan = document.createElement("div");
    const malam = document.documentElement.getAttribute("data-waktu") === "malam";
    // Malam hari: kupu-kupu diganti kunang-kunang
    hewan.className = kucing ? "kucing-terbang" : malam ? "kunang" : "kupu-kupu" + (Math.random() < 0.5 ? " biru" : "");

    goyang.appendChild(hewan);
    lintas.appendChild(goyang);
    lapisan.appendChild(lintas);
    lintas.addEventListener("animationend", (e) => { if (e.target === lintas) lintas.remove(); });
  }

  function jadwalkan() {
    setTimeout(() => { lepaskanHewan(); jadwalkan(); }, acakAntara(JEDA_MIN, JEDA_MAKS));
  }

  // Hewan pertama muncul tidak lama setelah halaman dibuka
  setTimeout(lepaskanHewan, 6000);
  jadwalkan();

  // Untuk uji tampilan: window.lepaskanHewan() memunculkan hewan langsung
  window.lepaskanHewan = lepaskanHewan;
  window.lepaskanKucingHitam = lepaskanKucingHitam;
})();
