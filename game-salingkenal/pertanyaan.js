// Bank pertanyaan Saling Kenal.
//
// Dipakai untuk membantu menyusun pertanyaan ta'aruf. Semua kalimat ditulis sendiri,
// cakupan topiknya mengacu pada topik umum lembar profil diri sebelum menikah.
//
// Setiap kategori punya tiga tingkat:
//   dasar     = cocok untuk yang baru kenal, pertanyaan pembuka
//   menengah  = mulai menggali kebiasaan, nilai, dan cara berpikir
//   lanjutan  = konkret dan mendalam, cocok untuk yang sudah kenal lama
//
// Silakan tambah, ubah, atau hapus kalimat. Jumlahnya bebas.

const TINGKAT = [
  { id: "dasar", nama: "Dasar" },
  { id: "menengah", nama: "Menengah" },
  { id: "lanjutan", nama: "Lanjutan" },
];

const BANK_PERTANYAAN = [
  {
    id: "diri",
    nama: "Tentang Diri",
    dasar: [
      "Boleh ceritakan tentang dirimu secara singkat?",
      "Bagaimana orang-orang terdekatmu biasanya menggambarkan dirimu?",
      "Apa kegiatan yang paling kamu nikmati di waktu luang?",
    ],
    menengah: [
      "Sifat baik apa dalam dirimu yang menurutmu akan bermanfaat dalam rumah tangga?",
      "Kebiasaan apa yang sedang kamu usahakan untuk diperbaiki?",
      "Sifat seperti apa dari orang lain yang membuatmu tidak nyaman?",
    ],
    lanjutan: [
      "Kekurangan apa dalam dirimu yang perlu calon pasangan ketahui sejak awal?",
      "Pengalaman hidup apa yang paling membentuk dirimu yang sekarang?",
      "Kalau sedang berada di titik terendah, apa yang biasanya membuatmu bangkit lagi?",
    ],
  },
  {
    id: "ibadah",
    nama: "Ibadah dan Keislaman",
    dasar: [
      "Bagaimana kamu menjaga ibadah harian di tengah kesibukan?",
      "Apakah kamu rutin mengikuti kajian? Biasanya di mana atau bersama siapa?",
      "Ibadah sunnah apa yang sedang kamu usahakan untuk istiqamah?",
    ],
    menengah: [
      "Bagaimana kamu belajar agama selama ini, dan apa yang sedang ingin kamu pelajari?",
      "Bagaimana kebiasaanmu berinteraksi dengan Al-Qur'an, misalnya tilawah atau hafalan?",
      "Menurutmu, bagaimana cara saling mengingatkan dalam kebaikan tanpa menyinggung?",
    ],
    lanjutan: [
      "Suasana ibadah seperti apa yang ingin kamu bangun di rumah setelah menikah?",
      "Bagaimana pandanganmu tentang peran suami dan istri dalam membimbing ibadah keluarga?",
      "Kalau di kemudian hari ada perbedaan pandangan dalam praktik ibadah, bagaimana kamu ingin menyikapinya?",
    ],
  },
  {
    id: "keluarga",
    nama: "Keluarga",
    dasar: [
      "Boleh ceritakan tentang keluargamu? Berapa bersaudara dan kamu anak ke berapa?",
      "Apa pekerjaan atau kesibukan orang tuamu saat ini?",
      "Siapa anggota keluarga yang paling dekat denganmu?",
    ],
    menengah: [
      "Nilai apa dari keluargamu yang ingin kamu bawa ke rumah tangga nanti?",
      "Bagaimana suasana komunikasi di keluargamu sehari-hari?",
      "Apakah ada tanggung jawab khusus di keluarga yang sedang atau akan kamu pegang?",
    ],
    lanjutan: [
      "Bagaimana sikap orang tuamu terhadap rencana pernikahanmu saat ini?",
      "Seberapa jauh kamu ingin orang tua terlibat dalam keputusan rumah tangga nanti?",
      "Bagaimana rencanamu berbakti dan membagi perhatian untuk orang tua dan mertua setelah menikah?",
    ],
  },
  {
    id: "pendidikan",
    nama: "Pendidikan dan Pekerjaan",
    dasar: [
      "Apa latar belakang pendidikanmu?",
      "Apa pekerjaan atau kesibukanmu saat ini?",
      "Apa yang paling kamu sukai dari pekerjaanmu sekarang?",
    ],
    menengah: [
      "Karier atau bidang apa yang ingin kamu tekuni ke depan?",
      "Apakah kamu punya rencana melanjutkan pendidikan? Kapan dan di mana?",
      "Bagaimana kamu membagi waktu antara pekerjaan, ibadah, dan keluarga?",
    ],
    lanjutan: [
      "Setelah menikah, apakah kamu berencana tetap bekerja di luar rumah? Bagaimana dengan pasangan?",
      "Kalau pekerjaan menuntut pindah kota, bagaimana kamu ingin menyikapinya bersama pasangan?",
      "Bagaimana pandanganmu jika suatu saat penghasilan istri lebih besar daripada suami?",
    ],
  },
  {
    id: "kesehatan",
    nama: "Kesehatan",
    dasar: [
      "Bagaimana kamu menjaga kesehatan sehari-hari?",
      "Apakah ada olahraga atau kegiatan fisik yang rutin kamu lakukan?",
    ],
    menengah: [
      "Apakah ada pantangan makanan atau alergi yang perlu diketahui?",
      "Bagaimana pola tidur dan istirahatmu selama ini?",
    ],
    lanjutan: [
      "Apakah ada riwayat penyakit, baik pada dirimu maupun keluarga, yang perlu diketahui sejak awal?",
      "Bagaimana pandanganmu tentang pemeriksaan kesehatan sebelum menikah?",
    ],
  },
  {
    id: "komunikasi",
    nama: "Komunikasi dan Emosi",
    dasar: [
      "Bagaimana gaya komunikasimu sehari-hari? Lebih banyak bicara atau mendengarkan?",
      "Kamu lebih nyaman menyampaikan sesuatu secara langsung atau lewat tulisan?",
    ],
    menengah: [
      "Apa yang biasanya kamu lakukan ketika sedang marah atau sedih?",
      "Apa yang sebaiknya dilakukan orang lain agar kamu kembali tenang?",
      "Bagaimana cara yang paling tepat untuk menasihatimu ketika kamu keliru?",
    ],
    lanjutan: [
      "Ketika terjadi perbedaan pendapat dengan pasangan, bagaimana cara yang menurutmu paling sehat untuk menyelesaikannya?",
      "Hal apa yang paling sulit kamu sampaikan kepada orang lain, dan bagaimana kamu ingin pasangan membantumu?",
      "Bagaimana sikapmu jika suatu saat merasa tersinggung oleh ucapan pasangan?",
    ],
  },
  {
    id: "visi",
    nama: "Visi dan Rencana Hidup",
    dasar: [
      "Apa impian terbesar dalam hidupmu?",
      "Apa yang ingin kamu capai dalam lima tahun ke depan?",
    ],
    menengah: [
      "Apa tujuan utamamu menikah?",
      "Apa yang kamu harapkan dari pasangan dalam mewujudkan impianmu?",
      "Kontribusi apa yang ingin kamu berikan untuk keluarga dan masyarakat?",
    ],
    lanjutan: [
      "Visi rumah tangga seperti apa yang ingin kamu bangun bersama pasangan?",
      "Kalau impian pribadimu dan kebutuhan keluarga bertabrakan, bagaimana kamu akan memilih?",
      "Target bersama apa yang ingin kamu capai dalam tahun-tahun pertama pernikahan?",
    ],
  },
  {
    id: "kriteria",
    nama: "Harapan terhadap Pasangan",
    dasar: [
      "Sifat apa yang paling kamu harapkan dari calon pasangan?",
      "Hal apa yang menurutmu penting dalam memilih pasangan hidup?",
    ],
    menengah: [
      "Adakah kriteria dari orang tuamu untuk calon pasangan yang perlu diketahui?",
      "Hal apa yang menurutmu tidak bisa ditawar dalam memilih pasangan?",
    ],
    lanjutan: [
      "Apa yang membuatmu bersedia melanjutkan proses ta'aruf ini?",
      "Apa yang ingin kamu ketahui lebih jauh tentang diriku untuk memantapkan hati?",
    ],
  },
  {
    id: "kesiapan",
    nama: "Kesiapan Menikah",
    dasar: [
      "Apa yang membuatmu merasa sudah siap untuk menikah?",
      "Ilmu tentang pernikahan apa saja yang sudah kamu pelajari?",
    ],
    menengah: [
      "Bagaimana kesiapan finansialmu untuk menikah saat ini?",
      "Apakah orang tuamu sudah memberi restu untuk menikah dalam waktu dekat?",
      "Apa kekhawatiran terbesarmu tentang pernikahan?",
    ],
    lanjutan: [
      "Apakah ada tanggungan atau utang yang perlu diketahui sebelum melangkah lebih jauh?",
      "Apa yang sedang kamu persiapkan untuk menjadi suami atau istri yang baik?",
    ],
  },
  {
    id: "rencana-nikah",
    nama: "Rencana Pernikahan",
    dasar: [
      "Gambaran acara pernikahan seperti apa yang kamu inginkan? Akad saja atau dengan resepsi?",
    ],
    menengah: [
      "Kapan kira-kira waktu yang menurutmu ideal untuk menikah?",
      "Bagaimana pandanganmu tentang biaya pernikahan dan siapa yang menanggungnya?",
    ],
    lanjutan: [
      "Hal apa dalam rencana pernikahan yang menurutmu masih bisa disesuaikan, dan mana yang tidak?",
      "Bagaimana kita sebaiknya melibatkan kedua keluarga dalam menyiapkan pernikahan?",
    ],
  },
  {
    id: "tempat",
    nama: "Tempat Tinggal",
    dasar: [
      "Di mana kamu tinggal saat ini, dan apakah ada rencana pindah?",
    ],
    menengah: [
      "Setelah menikah, kamu ingin tinggal di mana? Kenapa memilih tempat itu?",
      "Bagaimana pandanganmu tentang tinggal bersama orang tua atau mertua setelah menikah?",
    ],
    lanjutan: [
      "Kalau kita berasal dari kota yang berbeda, bagaimana kamu membayangkan keputusan tempat tinggal kita?",
      "Rumah sendiri, sewa, atau ikut keluarga dulu? Apa pertimbanganmu?",
    ],
  },
  {
    id: "rumah-tangga",
    nama: "Peran dalam Rumah Tangga",
    dasar: [
      "Pekerjaan rumah apa yang biasa kamu kerjakan sekarang?",
    ],
    menengah: [
      "Bagaimana kamu membayangkan pembagian pekerjaan rumah setelah menikah?",
      "Bagaimana pandanganmu tentang peran suami dan istri dalam rumah tangga?",
    ],
    lanjutan: [
      "Siapa yang menurutmu sebaiknya mengambil keputusan besar dalam keluarga, dan bagaimana prosesnya?",
      "Kalau kita sama-sama bekerja, bagaimana pembagian tanggung jawab di rumah yang adil menurutmu?",
    ],
  },
  {
    id: "keuangan",
    nama: "Keuangan Keluarga",
    dasar: [
      "Bagaimana kebiasaanmu mengatur uang pribadi saat ini?",
    ],
    menengah: [
      "Apakah kamu terbiasa menabung atau mencatat pengeluaran?",
      "Bagaimana pandanganmu tentang sedekah dan berbagi dari penghasilan?",
    ],
    lanjutan: [
      "Bagaimana pola pengaturan keuangan keluarga yang kamu inginkan setelah menikah?",
      "Bagaimana pandanganmu tentang membantu keuangan keluarga besar setelah menikah?",
      "Bagaimana sikapmu terhadap utang dan cicilan dalam rumah tangga?",
    ],
  },
  {
    id: "anak",
    nama: "Anak dan Pengasuhan",
    dasar: [
      "Bagaimana perasaanmu ketika berada di dekat anak-anak?",
    ],
    menengah: [
      "Apakah kamu ingin segera memiliki anak setelah menikah?",
      "Nilai apa yang paling ingin kamu tanamkan kepada anak-anak kelak?",
    ],
    lanjutan: [
      "Konsep pendidikan anak seperti apa yang ingin kamu terapkan?",
      "Bagaimana pembagian peran dalam mengasuh anak yang kamu bayangkan?",
      "Bagaimana sikapmu jika Allah belum memberikan keturunan dalam waktu yang lama?",
    ],
  },
  {
    id: "pengembangan",
    nama: "Pengembangan Diri dan Keluarga",
    dasar: [
      "Apa hal baru yang sedang kamu pelajari akhir-akhir ini?",
    ],
    menengah: [
      "Bagaimana kamu ingin terus bertumbuh setelah menikah?",
      "Kegiatan belajar apa yang ingin kamu lakukan bersama pasangan, misalnya kajian atau membaca bersama?",
    ],
    lanjutan: [
      "Bagaimana rencanamu agar ilmu dan iman keluarga terus bertambah?",
      "Apa satu target bersama yang ingin kamu capai di tahun pertama pernikahan?",
    ],
  },
];
