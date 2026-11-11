# Saling Bercerita

Alamat permainan: https://salingbercerita.netlify.app

Game kartu obrolan untuk dua orang yang terhubung lewat internet.
Game ini hanya menampilkan permainan. Obrolannya dilakukan lewat telepon WhatsApp.

## Cara Bermain

1. Pemain pertama menulis nama, memilih topik, lalu menekan **Buat Ruangan**.
2. Kode ruangan atau tautannya dikirim ke pemain kedua, misalnya lewat WhatsApp.
3. Pemain kedua membuka tautan, menulis nama, lalu menekan **Gabung**.
4. Masing-masing menulis 1 sampai 3 **pertanyaan rahasia** untuk pasangannya. Pertanyaan ini muncul diam-diam sebagai kartu rahasia saat giliran pasangannya. Sebelum kartu rahasia pertama dan di antara dua kartu rahasia selalu ada 2 atau 3 kartu biasa.
5. Pemain bergiliran menekan **Putar Dadu**. Dadu punya 3 sisi Cokelat dan 3 sisi Hijau. Warna yang keluar menentukan kartu yang diambil.
6. **Yang memutar dadu menjawab kartu.** Nama di kartu otomatis mengikuti nama pemain.
7. Setelah yang menjawab selesai bercerita, pasangan yang mendengarkan mengisi **bintang 1 sampai 5** dan kalimat feedback. Penilaian ini disembunyikan dari yang menjawab. Dadu baru bisa diputar lagi setelah penilaian disimpan.
8. Tekan **Akhiri permainan** kapan saja. Masing-masing melihat pop-up **Feedback untukmu** berisi bintang dan kalimat feedback untuk setiap kartu yang dijawabnya di sesi itu. Setelah pop-up ditutup, tampil ringkasan: statistik, jawaban paling berkesan, kartu yang perlu dibahas lagi, kalimat feedback, serta saran dan masukan. Ringkasan bisa dikirim ke WhatsApp.
9. Sisa kartu tetap tersimpan. Tekan **Lanjutkan bermain** untuk sesi berikutnya.

Satu kartu biasanya dijawab 10 sampai 15 menit. Topik berisi 60 kartu butuh sekitar 10 sampai 15 jam, jadi sebaiknya dimainkan beberapa sesi, 4 sampai 6 kartu sekali main.

## Isi Kartu

Kartu dikelompokkan per topik. Saat ini tersedia satu topik:

| Topik | Cokelat | Hijau |
|---|---|---|
| Calon Pengantin | 30 kartu: masa depan, rencana, mimpi | 30 kartu: komitmen, kejujuran, kasih sayang |

Semua kalimat ada di file `kartu.js`. Penanda `{A}` diganti nama yang menjawab, `{B}` diganti nama pasangannya. Topik baru ditambahkan dengan menyalin satu blok topik di file tersebut.

## File

- `index.html` : susunan halaman
- `style.css` : tampilan
- `game.js` : jalannya permainan dan koneksi online
- `kartu.js` : daftar topik dan isi kartu
- `font/` : huruf pixel Pixelify Sans dan VT323 (lisensi SIL Open Font License 1.1, berkas lisensi ada di folder yang sama)

## Catatan Teknis

Koneksi antarpemain memakai PeerJS (WebRTC) dengan server sinyal gratis milik PeerJS, jadi tidak perlu server sendiri.
Game di-hosting di Netlify (project `salingbercerita`) dan tersambung ke branch `main` dengan base directory `game-salingbercerita`.
Setiap perubahan yang di-push ke `main` otomatis ter-update di situs.

## Tampilan

Gaya pixel art yang cozy: langit bertingkat, awan bergerak, rumput dan bunga, serta bingkai kotak bertepi tegas.
Semua ikon pixel (dadu, bintang, hati, awan, matahari, bunga, gembok) digambar sebagai grid di `bahan/sprite.py`, lalu hasilnya disimpan di bagian bawah `style.css`.
Angka memakai huruf VT323 supaya kode ruangan dan angka tidak tertukar dengan huruf S atau Z.
