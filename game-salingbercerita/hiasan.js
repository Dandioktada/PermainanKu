/* Saling Bercerita: hewan yang sesekali terbang melintas di depan layar.
 * Kucing bersayap dan kupu-kupu muncul bergantian dengan jeda acak,
 * supaya tampilan terasa hidup tapi tidak mengganggu permainan.
 */
(function () {
  "use strict";

  const lapisan = document.getElementById("terbang");
  if (!lapisan) return;
  const kurangiGerak = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (kurangiGerak) return;

  const JEDA_MIN = 25000;   // jeda paling cepat antar hewan (ms)
  const JEDA_MAKS = 50000;  // jeda paling lama antar hewan (ms)
  let hitung = 0;

  function acakAntara(a, b) { return a + Math.random() * (b - a); }

  function lepaskanHewan() {
    if (document.visibilityState !== "visible") return;
    hitung += 1;
    // Kucing muncul setiap 3 kali terbang, sisanya kupu-kupu
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
    hewan.className = kucing ? "kucing-terbang" : "kupu-kupu" + (Math.random() < 0.5 ? " biru" : "");

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
})();
