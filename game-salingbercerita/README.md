# Saling Bercerita

Alamat permainan: https://salingbercerita.netlify.app

Game kartu obrolan untuk dua orang yang terhubung lewat internet.
Game ini hanya menampilkan permainan. Obrolannya dilakukan lewat telepon WhatsApp.

## Dua Mode

Di layar awal, pembuat ruangan memilih cara ngobrol:

- **Ngobrol lewat teks**: jawaban diketik dan dikirim lewat game. Kartunya ringan dan cukup dijawab beberapa kalimat.
- **Ngobrol lewat telepon**: jawaban diceritakan sambil telepon WhatsApp. Kartunya lebih dalam.

Pasangan yang membuka tautan undangan otomatis mengikuti mode ruangan.

## Cara Bermain

1. Pemain pertama menulis nama, lalu menekan **Bikin Ruangan, Yuk!**.
2. Kode ruangan atau tautannya dikirim ke pemain kedua, misalnya lewat WhatsApp.
3. Pemain kedua membuka tautan, menulis nama, lalu menekan **Gas Gabung!**.
4. Setelah keduanya masuk, muncul layar **Pilih Topik**. Siapa saja boleh mengganti topik, dan pilihan itu langsung terlihat di HP pasangannya. Permainan lanjut setelah keduanya menekan **Oke, Pakai Topik Ini!** di topik yang sama. Setelah itu muncul gulungan kertas berisi cara main singkat.
5. Masing-masing menulis satu **pertanyaan rahasia** (wajib) dan satu **tantangan rahasia** (boleh dikosongkan) untuk pasangannya, misalnya "Kirim satu foto lama kita ke chat". Keduanya muncul diam-diam sebagai kartu rahasia saat giliran pasangannya. Setelah disimpan, isian masih bisa diubah lewat tombol **Ubah Isian** selama pasangannya belum selesai menulis. Sebelum kartu rahasia pertama dan di antara dua kartu rahasia selalu ada 2 atau 3 kartu biasa. Di mode telepon, pemain juga bisa memilih **target kartu malam ini** (3, 5, 7, atau 10 kartu). Saat target tercapai, permainan otomatis rehat dan rangkuman muncul.
6. Pemain bergiliran menekan **Putar Dadu**. Dadu punya 3 sisi Cokelat dan 3 sisi Hijau. Warna yang keluar menentukan kartu yang diambil.
7. **Yang memutar dadu menjawab kartu.** Nama di kartu otomatis mengikuti nama pemain. Di mode teks, jawaban diketik lalu dikirim, dan pasangannya membaca jawaban itu dalam bentuk gelembung pesan.
Setiap kartu punya **timer**: 10 menit di mode teks (sampai jawaban dikirim) dan 15 menit di mode telepon (sampai penilaian disimpan). Saat waktu tinggal 2 menit, muncul peringatan, lalu tulisan "Waktu habis" kalau waktunya lewat.

8. Setelah yang menjawab selesai bercerita, pasangan yang mendengarkan mengisi **bintang 1 sampai 5** dan kalimat feedback. Penilaian ini disembunyikan dari yang menjawab. Dadu baru bisa diputar lagi setelah penilaian disimpan.
9. **Rehat Dulu, Yuk** berfungsi sebagai jeda. Masing-masing melihat pop-up rangkuman **khusus untuk dirinya sendiri**: jumlah kartu yang dijawab, rata-rata bintang, bintang dan kalimat feedback per kartu, serta saran. Pemain tidak bisa melihat rangkuman pasangannya.
10. Permainan tersimpan di ruangan yang sama. Tekan **Lanjut Cerita, Gas!** (keduanya harus menekan) untuk melanjutkan sesi berikutnya. Kalau aplikasi sempat ditutup, pembuat ruangan menekan **Lanjut Main di Ruangan** di layar awal, lalu pasangannya bergabung lagi dengan kode yang sama.
11. Permainan benar-benar selesai saat salah satu pemain menekan **Udahan, Keluar**.

Permainan tidak menampilkan jumlah total kartu, hanya jumlah kartu yang sudah terbuka. Karena itu kalimat kartu bisa ditambah sebanyak apa pun, sampai ratusan.

## Isi Kartu

Kartu dikelompokkan per topik. Topik dipilih bersama setelah kedua pemain masuk:

| Topik | Mode | Cokelat | Hijau |
|---|---|---|---|
| Ayang | Telepon | 30 kartu: masa depan, rencana, mimpi | 30 kartu: komitmen, kejujuran, kasih sayang |
| Ayang | Teks | 30 kartu ringan | 30 kartu ringan |
| Sohib | Telepon | 30 kartu: kenangan, petualangan, mimpi | 30 kartu: dukungan, kejujuran, saling jaga |
| Sohib | Teks | 30 kartu ringan | 30 kartu ringan |
| Kenalan | Telepon | 30 kartu: keseharian, cerita hidup, selera | 30 kartu: nilai, harapan, sudut pandang |
| Kenalan | Teks | 30 kartu ringan | 30 kartu ringan |
| Acak | Keduanya | Gabungan kartu cokelat dari tiga topik di atas | Gabungan kartu hijau |

Topik Ayang adalah penyesuaian dari topik lama Calon Pengantin, supaya cocok untuk pasangan yang belum maupun sudah menikah. Dasar riset untuk Sohib dan Kenalan dicatat di `bahan/riset-pertanyaan-salingbercerita.md`.

Semua kalimat ada di file `kartu.js`. Penanda `{A}` diganti nama yang menjawab, `{B}` diganti nama pasangannya. Topik baru ditambahkan dengan menyalin satu blok topik di file tersebut, dan otomatis ikut masuk ke topik Acak.

## Mode Pengembangan

Buka alamat permainan dengan tambahan `?dev=1`, misalnya `https://pengembangan--salingbercerita.netlify.app/?dev=1`. Di mode ini kamu bermain sendiri melawan **Bot** tanpa koneksi online:

- Pilih mode, tulis nama, lalu tekan **Bikin Ruangan, Yuk!**. Bot masuk otomatis.
- Bot ikut setuju setelah kamu memilih topik.
- Bot menulis isian rahasia sekitar 6 detik setelah kamu siap, jadi tombol **Ubah Isian** sempat dicoba.
- Saat bermain, bot memutar dadu, menjawab kartu (mode teks), memberi bintang, dan ikut menekan Lanjut setelah rehat.
- Permainan di mode ini tidak disimpan.

## File

- `index.html` : susunan halaman
- `style.css` : tampilan
- `game.js` : jalannya permainan dan koneksi online
- `kartu.js` : daftar topik dan isi kartu
- `saran.js` : kalimat saran di rangkuman, beberapa variasi untuk setiap kondisi (dipilih acak, tanpa AI)
- `hiasan.js` : hewan yang sesekali terbang melintas (kucing bersayap dan kupu-kupu)
- `font/` : huruf Silkscreen (judul dan tombol) dan Geist Pixel (isi permainan), lisensi SIL Open Font License 1.1, berkas lisensi ada di folder yang sama

## Catatan Teknis

Koneksi antarpemain memakai PeerJS (WebRTC) dengan server sinyal gratis milik PeerJS, jadi tidak perlu server sendiri.
Game di-hosting di Netlify (project `salingbercerita`) dan tersambung ke branch `main` dengan base directory `game-salingbercerita`.
Setiap perubahan yang di-push ke `main` otomatis ter-update di situs.

## Tema Siang dan Malam

Game membaca jam di HP pemain. Pukul 06.00 sampai 17.59 memakai tema siang (langit biru, matahari, kupu-kupu), dan pukul 18.00 sampai 05.59 memakai tema malam (langit gelap, bulan, bintang berkelip, kunang-kunang). Tema dicek setiap menit, jadi berganti sendiri saat jamnya lewat.

Untuk mencoba tema tertentu, tambahkan `?waktu=siang` atau `?waktu=malam` di akhir alamat. Di situs pengembangan (`pengembangan--salingbercerita.netlify.app`), tema malam selalu aktif supaya mudah dicoba.

## Tampilan

Gaya pixel art yang cozy: langit bertingkat, awan bergerak, matahari di dekat kotak permainan, rumput dan bunga, serta bingkai kotak bertepi tegas.
Judul memakai huruf Silkscreen dengan isi dua warna dan garis tepi gelap. Tombol bergaya tombol game dengan sorot di atas dan tepi bawah gelap.
Kupu-kupu, kucing hitam yang meloncat, dan kucing bersayap bergantian melintas di depan layar, dengan jeda acak 25 sampai 50 detik.
Bintang, hati, gelembung pesan, ikon telepon, dan kucing hitam mengikuti gambar referensi dari pemilik game. Bintang dan hati dipotong dari referensi dengan `bahan/potong_sprite.py`, sedangkan sisanya digambar ulang sebagai grid di `bahan/sprite.py`.
Semua ikon dan hewan pixel digambar sebagai grid di `bahan/sprite.py`, lalu hasilnya disimpan di bagian bawah `style.css`.
