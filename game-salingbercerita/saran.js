// Kalimat saran di rangkuman Saling Bercerita.
//
// Saran dipilih dengan aturan sederhana (tanpa AI) berdasarkan bintang dan durasi.
// Setiap kondisi punya beberapa kalimat; game memilih satu secara acak,
// jadi saran bisa berbeda di setiap permainan. Silakan ubah atau tambah kalimatnya.
//
// Penanda yang bisa dipakai di dalam kalimat:
//   {lawan}  = nama pasangan (yang memberi penilaian)
//   {tema}   = nama tema kartu, misalnya "masa depan, rencana, mimpi"
//   {jumlah} = jumlah kartu yang dimaksud
//   {menit}  = rata-rata lama bercerita, misalnya "3 menit"

const SARAN = {
  // Pemain belum menjawab kartu di sesi ini
  belumJawab: [
    "Di sesi ini kamu belum sempat menjawab kartu. Nanti saat lanjut, coba jawab tiga atau empat kartu dulu sebelum rehat, ya.",
    "Belum ada kartu yang kamu jawab di sesi ini. Santai saja, giliranmu bercerita masih banyak.",
    "Sesi ini masih kosong buatmu. Lain kali, putar dadunya beberapa kali dulu sebelum rehat supaya ada yang bisa dirangkum.",
    "Kamu belum dapat giliran menjawab di sesi ini. Pas lanjut nanti, bisa jadi giliranmu yang pertama.",
    "Rangkuman ini masih sepi karena kamu belum menjawab kartu. Yuk, lanjut main sebentar lagi.",
    "Belum ada cerita darimu di sesi ini. {lawan} pasti penasaran dengan jawabanmu nanti.",
  ],

  // Sudah menjawab, tapi belum ada yang dinilai
  belumDinilai: [
    "Jawabanmu belum sempat dinilai. Lain kali, tekan Rehat Dulu setelah {lawan} selesai mengisi penilaian.",
    "{lawan} belum sempat memberi penilaian untuk jawabanmu. Saat lanjut nanti, penilaiannya masih bisa diisi.",
    "Penilaian dari {lawan} belum masuk, jadi belum ada yang bisa disimpulkan. Tunggu sampai penilaiannya tersimpan sebelum rehat, ya.",
    "Kartumu sudah terjawab, tapi belum dinilai. Rangkumannya akan lebih lengkap kalau {lawan} sempat mengisi bintang dulu.",
    "Sepertinya permainan rehat terlalu cepat. Biarkan {lawan} menilai dulu, baru tekan Rehat Dulu.",
  ],

  // Rata-rata bintang 4,5 ke atas
  sangatPuas: [
    "{lawan} merasa sangat puas dengan cerita-ceritamu. Pertahankan keterbukaan seperti ini, juga di luar permainan.",
    "Bintangmu hampir penuh semua. Kelihatannya {lawan} benar-benar menikmati setiap ceritamu.",
    "Kamu bercerita dengan sangat terbuka hari ini, dan {lawan} merasakannya. Simpan rasa nyaman ini baik-baik.",
    "Jawaban-jawabanmu bikin {lawan} puas. Coba ingat apa yang membuatmu leluasa bercerita hari ini, lalu bawa ke obrolan sehari-hari.",
    "Hampir semua jawabanmu dapat bintang tinggi. Tanda kalian sedang sangat nyambung.",
    "{lawan} kelihatan senang sekali mendengar ceritamu. Sesekali, tanyakan balik hal yang sama ke {lawan}, ya.",
    "Ceritamu hari ini sampai ke hati {lawan}. Momen seperti ini layak diulang di sesi berikutnya.",
    "Nilai setinggi ini bukan soal jawaban yang sempurna, tapi soal kejujuranmu. Teruskan, ya.",
  ],

  // Rata-rata bintang 3,5 sampai di bawah 4,5
  puas: [
    "Sebagian besar jawabanmu sudah membuat {lawan} puas. Untuk kartu yang bintangnya belum penuh, tanyakan bagian mana yang ingin didengar lebih jauh.",
    "Ceritamu sudah cukup sampai ke {lawan}. Sedikit lagi lebih detail, pasti bintangnya makin penuh.",
    "{lawan} cukup puas dengan jawabanmu. Coba tambahkan contoh nyata atau kenangan kecil di cerita berikutnya.",
    "Obrolan kalian hari ini sudah hangat. Ada beberapa jawaban yang masih bisa digali lebih dalam kalau kalian mau.",
    "Jawabanmu sudah bagus. Kalau ada kartu yang bintangnya belum penuh, mungkin {lawan} masih menunggu cerita lanjutannya.",
    "Kamu sudah bercerita dengan baik. Lain kali, coba ceritakan juga perasaanmu, bukan hanya kejadiannya.",
    "Sudah cukup nyambung, tapi masih ada ruang untuk lebih dekat. Pilih satu kartu dan ajak {lawan} membahasnya lagi sambil santai.",
  ],

  // Rata-rata bintang di bawah 3,5
  kurangPuas: [
    "Beberapa jawabanmu masih terasa belum tuntas bagi {lawan}. Tidak apa-apa, pilih satu kartu di atas lalu bahas lagi berdua dengan lebih santai.",
    "Bintangnya belum banyak, tapi ini justru kesempatan untuk saling memahami. Tanyakan ke {lawan} jawaban seperti apa yang ia harapkan.",
    "Mungkin ada pertanyaan yang terasa berat dijawab hari ini. Wajar, kok. Coba ceritakan lagi saat suasananya lebih santai.",
    "{lawan} sepertinya ingin mendengar lebih banyak darimu. Tidak perlu panjang, yang penting jujur.",
    "Nilai yang rendah bukan berarti gagal. Itu tanda ada hal penting yang perlu kalian obrolkan lebih pelan.",
    "Coba ingat-ingat, kartu mana yang paling sulit kamu jawab? Ceritakan ke {lawan} kenapa terasa sulit.",
    "Kadang jawaban terasa kurang karena kita buru-buru. Lain kali, ambil napas dulu sebelum mulai bercerita.",
  ],

  // Rata-rata kartu Cokelat di bawah 3
  coklatRendah: [
    "Saat bercerita soal {tema}, coba lebih konkret. Ceritakan contoh nyata atau langkah kecil yang ingin kamu lakukan.",
    "Untuk kartu soal {tema}, {lawan} mungkin ingin tahu rencanamu lebih jelas. Tidak harus pasti, gambaran kasarnya juga sudah membantu.",
    "Mimpi dan rencana memang kadang susah diungkapkan. Coba mulai dari hal kecil, misalnya rencana untuk tahun ini.",
    "Jawabanmu soal {tema} masih terasa samar buat {lawan}. Coba tambahkan alasan di balik rencanamu.",
    "Kalau bingung menjawab soal masa depan, ceritakan saja apa yang kamu bayangkan. Bayangan juga bagian dari rencana.",
    "Ajak {lawan} menyusun satu rencana kecil bersama dari kartu tadi, supaya obrolannya terasa lebih nyata.",
  ],

  // Rata-rata kartu Hijau di bawah 3
  hijauRendah: [
    "Untuk kartu soal {tema}, {lawan} tampaknya ingin kamu lebih terbuka. Tidak harus sempurna, cukup jujur.",
    "Bercerita soal perasaan memang tidak selalu mudah. Coba mulai dengan satu kalimat sederhana, misalnya \"Aku merasa...\".",
    "{lawan} mungkin menunggu cerita yang lebih dari hati. Pelan-pelan saja, tidak perlu sekaligus.",
    "Jawabanmu soal {tema} masih bisa lebih hangat. Coba sertakan momen nyata yang pernah kalian alami.",
    "Kadang yang ingin didengar pasangan bukan jawaban yang benar, tapi jawaban yang jujur. Coba lagi di sesi berikutnya.",
    "Kalau ada yang sulit kamu ungkapkan soal {tema}, bilang saja ke {lawan} bahwa kamu butuh waktu. Itu juga bentuk kejujuran.",
  ],

  // Rata-rata kartu rahasia (pertanyaan atau tantangan) di bawah 4
  rahasiaRendah: [
    "Kartu rahasia dari {lawan} belum terjawab tuntas. Kartu itu biasanya sudah lama dipikirkan, jadi ada baiknya dibahas lagi di waktu khusus.",
    "{lawan} menulis kartu rahasia itu dengan harapan tertentu. Coba tanyakan langsung apa yang sebenarnya ingin ia dengar.",
    "Kartu rahasia sering menyimpan hal yang mengganjal. Luangkan waktu berdua untuk membahasnya lagi tanpa terburu-buru.",
    "Jawabanmu untuk kartu rahasia belum sepenuhnya menjawab rasa penasaran {lawan}. Tidak apa-apa, obrolan ini bisa dilanjutkan kapan saja.",
    "Ada sesuatu di balik kartu rahasia dari {lawan}. Coba tanyakan, \"Kenapa kamu kepikiran soal ini?\"",
  ],

  // Ada jawaban dengan bintang 1 atau 2
  perluDibahas: [
    "Ada {jumlah} jawaban yang ditandai \"perlu dibahas lagi\". Bahas satu per satu dengan kepala dingin, jangan sekaligus.",
    "{jumlah} kartu masih perlu diobrolkan lagi. Pilih waktu yang santai, misalnya sambil jalan sore atau makan malam.",
    "Kartu yang ditandai \"perlu dibahas lagi\" bukan tanda masalah besar. Anggap saja itu daftar obrolan untuk lain waktu.",
    "Ada {jumlah} jawaban yang belum sampai ke hati {lawan}. Coba tanyakan, bagian mana yang terasa kurang.",
    "Simpan {jumlah} kartu yang perlu dibahas lagi itu. Ngobrol pelan-pelan, satu kartu satu waktu.",
    "Yang ditandai \"perlu dibahas lagi\" justru bisa jadi obrolan paling berharga. Jangan dilewatkan, ya.",
  ],

  // Rata-rata lama bercerita di bawah 5 menit (minimal 3 kartu)
  terburuBuru: [
    "Rata-rata kamu bercerita {menit} per kartu. Tidak perlu terburu-buru, cerita yang pelan sering terasa lebih dalam.",
    "Ceritamu rata-rata selesai dalam {menit}. Coba beri ruang lebih, {lawan} pasti senang mendengar lebih banyak.",
    "Kartu-kartumu terjawab cukup cepat. Lain kali, tambahkan satu cerita kecil atau alasan di balik jawabanmu.",
    "Waktunya masih banyak, kok. Pakai waktu itu untuk bercerita lebih leluasa.",
    "Jawaban singkat itu tidak salah, tapi {lawan} mungkin ingin tahu ceritanya lebih jauh. Coba tambahkan \"karena...\" di jawabanmu.",
  ],

  // Ada jawaban dengan bintang 5
  bintangLima: [
    "Ada {jumlah} jawabanmu yang mendapat bintang 5. Di situlah {lawan} merasa paling dekat denganmu.",
    "{jumlah} jawabanmu dapat bintang penuh. Coba ingat lagi apa yang kamu ceritakan di sana, itu yang paling mengena buat {lawan}.",
    "Bintang 5 dari {lawan} untuk {jumlah} kartu. Cerita-cerita itu layak diulang di lain waktu.",
    "Ada {jumlah} jawaban yang benar-benar sampai ke hati {lawan}. Simpan momen itu baik-baik.",
    "Jawaban dengan bintang 5 biasanya lahir dari kejujuran. Kamu sudah melakukannya {jumlah} kali di sesi ini.",
    "{lawan} memberi bintang penuh untuk {jumlah} jawabanmu. Kalian sedang sangat nyambung di bagian itu.",
  ],
};
