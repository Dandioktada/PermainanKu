// Isi kartu Saling Bercerita.
//
// Penanda nama di dalam kalimat:
//   {A} = pemain yang memutar dadu (yang menjawab kartu)
//   {B} = pasangannya (yang mendengarkan dan memberi bintang)
// Saat kartu tampil, penanda ini otomatis diganti nama yang diketik pemain.
//
// Setiap topik berisi dua kelompok kartu: coklat dan hijau.
// Untuk menambah topik baru, salin satu blok { ... } di dalam TOPIK lalu ubah isinya.

const TOPIK = [
  {
    id: "calon-pengantin",
    nama: "Calon Pengantin",
    deskripsi: "Untuk pasangan yang sedang bersiap menikah. Membahas mimpi, rencana rumah tangga, komitmen, cara menghadapi konflik, dan hubungan dengan keluarga.",
    coklat: {
      label: "Masa Depan · Rencana · Mimpi",
      kartu: [
        "Mimpi besar apa yang masih {A} simpan, tapi belum pernah diceritakan utuh ke {B}?",
        "Kalau boleh merancang lima tahun pertama pernikahan sesuka hati, {A} mau hidup kita seperti apa?",
        "Tempat mana yang paling ingin {A} datangi bareng {B} setelah menikah? Kenapa tempat itu?",
        "Kebiasaan kecil apa yang ingin {A} jalani bareng {B} setiap hari setelah menikah?",
        "Setelah menikah nanti, rumah seperti apa yang {A} bayangkan untuk ditinggali bareng {B}? Apa yang bikin rumah itu terasa \"pulang\"?",
        "Kalau nanti kita dikaruniai anak, nilai apa yang paling ingin {A} tanamkan?",
        "Dari semua hal tentang hidup berumah tangga, apa yang paling {A} tunggu-tunggu?",
        "Ada target pribadi yang sedang {A} kejar? Dukungan seperti apa yang {A} harapkan dari {B}?",
        "Petualangan apa yang ingin {A} coba bareng {B}, minimal sekali seumur hidup?",
        "Menurut {A}, ulang tahun pernikahan kita nanti enaknya dirayakan seperti apa?",
        "Hal apa dari {B} yang bikin {A} tenang setiap membayangkan masa depan berdua?",
        "Kalau suatu saat kita harus pindah kota atau bahkan negara, apa yang paling {A} pertimbangkan?",
        "Tiga tahun lagi, satu hal apa dalam diri {A} yang ingin sudah berubah jadi lebih baik?",
        "Seperti apa \"hari biasa yang sempurna\" versi {A} setelah kita menikah? Dari bangun tidur sampai malam.",
        "Hal apa yang paling bikin {A} cemas soal masa depan? Gimana kita bisa menghadapinya berdua?",
        "Satu target keuangan apa yang ingin {A} capai bareng {B}? Kenapa itu penting buat {A}?",
        "Kalau kita bikin satu tradisi baru untuk keluarga kecil kita, {A} mau tradisinya seperti apa?",
        "Menurut {A}, apa yang harus kita jaga supaya makin lama menikah, kita malah makin dekat?",
        "Hobi atau keterampilan apa yang ingin {A} pelajari bareng {B}? Kenapa itu?",
        "Waktu kita sudah tua nanti, {A} membayangkan kita menghabiskan hari seperti apa?",
        "Mimpi apa yang dulu sempat {A} lepaskan, tapi sekarang ingin dikejar lagi?",
        "Kalau nanti ada masalah besar dalam rumah tangga kita, {A} ingin kita saling menguatkan dengan cara apa?",
        "Di umur 40 atau 50 nanti, {A} ingin merasakan hidup seperti apa bareng {B}?",
        "Kalau kita bikin bucket list pernikahan, tiga hal apa yang pasti {A} tulis pertama?",
        "Lima puluh tahun lagi, cerita apa tentang pernikahan kita yang ingin {A} bagikan ke cucu-cucu?",
        "Setelah menikah, {A} ingin hubungan kita dengan orang tua dan mertua seperti apa?",
        "Kebiasaan atau tradisi keluarga {A} yang mana yang ingin diteruskan di rumah tangga kita nanti?",
        "Kalau kita sudah punya rumah sendiri, seberapa jauh {A} ingin orang tua ikut terlibat dalam keseharian kita?",
        "Lewat pernikahan ini, apa yang ingin {A} buktikan atau berikan untuk orang tua sendiri?",
        "Menurut {A}, nanti saat orang tua kita makin sepuh, gimana cara merawat mereka tanpa mengorbankan rumah tangga kita?",
      ],
    },
    hijau: {
      label: "Komitmen · Kejujuran · Kasih Sayang",
      kartu: [
        "Kapan {A} merasa paling disayang {B}? Ceritakan momennya.",
        "Apa yang bikin {A} merasa aman untuk jujur sepenuhnya ke {B}?",
        "Ada hal yang selama ini ingin {A} sampaikan ke {B}, tapi masih ragu? Coba ceritakan sekarang, pelan-pelan saja.",
        "Di hari-hari biasa, {A} paling senang disayang {B} dengan cara apa?",
        "Menurut {A}, apa yang paling penting supaya janji pernikahan kita tetap terjaga sampai tua?",
        "Kapan {A} merasa bangga banget punya {B}?",
        "Kapan {A} merasa paling dihargai {B}?",
        "Kalau {A} lagi capek atau sedih, apa yang paling {A} butuhkan dari {B}?",
        "Menurut {A}, setia dalam pernikahan itu seperti apa? Bukan cuma soal fisik, tapi juga soal hati.",
        "Kebiasaan kecil {B} yang mana yang berarti banget buat {A}, padahal mungkin {B} tidak sadar?",
        "Kalau harus menyampaikan hal yang pahit, {A} ingin kita jujur dengan cara seperti apa?",
        "Kapan terakhir kali {A} merasa dekat banget sama {B}? Apa yang bikin momen itu spesial?",
        "Kapan {A} mulai yakin bahwa {B} adalah orang yang tepat untuk dinikahi?",
        "Ceritakan satu momen saat {A} merasa benar-benar dimengerti oleh {B}.",
        "Kalimat apa yang ingin lebih sering {A} dengar dari {B}?",
        "Kalau nanti kita bertengkar setelah menikah, {A} ingin kita menyelesaikannya dengan cara seperti apa?",
        "Saat kita sedang berselisih, apa yang bikin {A} merasa didengar, bukan diserang?",
        "Apa yang bikin {A} tetap memilih {B} setiap hari, bahkan di hari yang berat?",
        "Menurut {A}, hal apa yang tidak boleh kita ucapkan atau lakukan saat sedang bertengkar?",
        "Hari ini, apa yang paling {A} syukuri dari hubungan dengan {B}?",
        "Apa yang bisa {B} lakukan supaya {A} lebih mudah terbuka?",
        "Kalau suatu hari rasa sayang terasa memudar, apa yang akan {A} lakukan supaya kita tetap bertahan?",
        "Setelah bertengkar, apa yang {A} butuhkan dari {B} supaya hati bisa tenang dan dekat lagi?",
        "Apa yang bikin {A} percaya kita bisa melewati masa sulit berdua?",
        "Dari cara orang tua {A} saling menyayangi, bagian mana yang ingin kita tiru, dan mana yang ingin kita lakukan berbeda?",
        "Soal hubungan kita, hal apa yang masih sulit {A} bicarakan dengan orang tua?",
        "Kalau ada tuntutan atau harapan orang tua yang terasa berat, {A} ingin {B} mendukung dengan cara apa?",
        "Kalau orang tua punya pandangan yang berbeda dengan kita, apa yang menurut {A} harus tetap kita jaga?",
        "Kapan {A} merasa orang tua mendukung hubungan kita? Apa artinya momen itu buat {A}?",
        "Menurut {A}, gimana caranya tetap dekat dengan orang tua dan mertua tanpa membuat rumah tangga kita terganggu?",
      ],
    },
  },
];
