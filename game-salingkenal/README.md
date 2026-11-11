# Saling Kenal

**Mulai Mengenal dari Bercerita**

Alamat permainan: https://salingkenal.netlify.app (versi uji: https://pengembangan--salingkenal.netlify.app, mode pengembangan: tambahkan `?dev=1`)

Alat bantu bertanya untuk muslim dan muslimah yang sedang menjalani proses ta'aruf, terutama yang berjauhan. Melengkapi tukar CV dengan sesi tanya jawab yang terarah, lalu hasilnya bisa diunduh sebagai PDF untuk dibaca bersama perantara atau wali.

## Alur

1. Pemain pertama menulis nama lalu menekan **Buat Ruangan**. Kode atau tautan ruangan dikirim ke calon, misalnya lewat WhatsApp.
2. Calon membuka tautan, menulis nama, lalu menekan **Gabung**. Keduanya harus online bersamaan.
3. **Susun.** Masing-masing memilih jumlah pertanyaan (3, 5, 7, atau 10), memilih "Baru kenal" atau "Sudah kenal lama", lalu menyusun pertanyaan. Pertanyaan boleh ditulis sendiri atau dipilih dari bantuan pertanyaan, lalu disunting.
4. **Jawab.** Setelah keduanya mengirim pertanyaan, masing-masing menjawab pertanyaan dari calonnya.
5. **Nilai.** Setiap jawaban yang diterima tampil bersama pertanyaannya. Bintang wajib diisi untuk menilai kejelasan jawaban:
   1 Tidak jelas, 2 Cukup tidak jelas, 3 Cukup jelas, 4 Jelas, 5 Sangat jelas.
   Catatan tertulis boleh dikosongkan. Jawaban bisa ditandai **Minta diperjelas** (otomatis tercentang untuk bintang 1 sampai 2).
6. **Perjelas.** Kalau ada jawaban yang diminta diperjelas, penjawab menulis penjelasan tambahan.
7. **Selesai.** Semua pertanyaan, jawaban, penilaian, catatan, dan penjelasan dari kedua pihak tampil di layar dan bisa diunduh sebagai **PDF**.

Data hanya berpindah langsung antara dua HP lewat koneksi WebRTC. Tidak ada jawaban yang disimpan di server.

## Bantuan pertanyaan

Ada di `pertanyaan.js`: 18 kategori dengan tiga tingkat (dasar, menengah, lanjutan), total 125 pertanyaan. Tombol **Pilihkan untukku** mengisi kolom kosong secara seimbang, satu pertanyaan dari setiap kategori penting. Cakupan topik diperkuat dari riset Kemenag, Kemenkes, BKKBN, penelitian pranikah, dan kajian ta'aruf (lihat `bahan/riset-pertanyaan-salingkenal.md`). "Baru kenal" disarankan mulai dari tingkat dasar, "Sudah kenal lama" mulai dari tingkat lanjutan, tapi semua tingkat bisa dibuka. Semua kalimat ditulis sendiri; cakupan topiknya mengacu pada topik umum lembar profil diri sebelum menikah. Kalimat bisa ditambah, diubah, atau dihapus.

## Tampilan

Modern dan elegan bernuansa undangan: latar gradasi hijau ke cokelat, panel krem berbingkai garis ganda, serta ornamen bunga di sudut.
Palet: Green Fern `#34420D`, Lichen `#90967A`, Creme `#F8F5F0`, Brown `#6B553D`, Dark Brown `#342B1C`.
Huruf (folder `font/`, lisensi SIL OFL 1.1): Pinyon Script untuk judul, Cormorant Garamond untuk subjudul, Jost untuk teks dan tombol.
Ornamen bunga ada di folder `gambar/` dan digambar khusus untuk game ini.

## Mode pengembangan

Tambahkan `?dev=1` di akhir alamat. Kedua pemain disimulasikan di satu layar tanpa koneksi internet:

- **Lihat sebagai**: berpindah tampilan antara Pemain A dan Pemain B
- **Isi otomatis**: mengisi tahap yang sedang berjalan untuk pemain yang dipilih
- **Ulang dari awal**: memulai ulang semua tahap

## File

- `index.html` : susunan halaman
- `style.css` : tampilan minimalis
- `app.js` : alur permainan, koneksi dua pemain, mode pengembangan, dan pembuatan PDF
- `pertanyaan.js` : bank bantuan pertanyaan
- `font/` dan `gambar/` : huruf dan ornamen bunga
- `netlify.toml` : pengaturan Netlify (Base directory: `game-salingkenal`)

## Catatan teknis

- Koneksi memakai PeerJS (WebRTC), sama seperti Saling Bercerita.
- PDF dibuat langsung di HP dengan jsPDF. Huruf standar PDF hanya mendukung huruf Latin, jadi tulisan Arab di dalam jawaban akan diganti tanda tanya di PDF (tetap tampil normal di layar).
- Versi berikutnya yang direncanakan: mode dicicil (tidak harus online bersamaan).
