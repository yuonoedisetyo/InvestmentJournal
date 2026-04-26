export const articles = [
  {
    slug: 'memahami-margin-of-safety',
    title: 'Memahami Margin of Safety Sebelum Membeli Saham',
    excerpt:
      'Margin of safety membantu kita memberi ruang terhadap asumsi yang meleset, terutama saat valuasi terasa menarik di atas kertas.',
    category: 'Valuasi',
    publishedAt: '2026-04-10',
    readingTime: '6 menit',
    coverAccent: 'sunrise',
    content: [
      {
        type: 'paragraph',
        text: 'Harga murah belum tentu aman. Margin of safety dipakai untuk menjaga jarak antara nilai intrinsik yang kita hitung dengan harga pasar yang sedang berlaku.',
      },
      {
        type: 'heading',
        text: 'Kenapa perlu ruang aman?',
      },
      {
        type: 'paragraph',
        text: 'Asumsi pertumbuhan, margin bisnis, dan tingkat diskonto jarang tepat seratus persen. Sedikit ruang aman membuat keputusan investasi tidak rapuh terhadap perubahan kecil pada asumsi.',
      },
      {
        type: 'bullet_list',
        items: [
          'Gunakan asumsi pertumbuhan yang masuk akal, bukan skenario terbaik.',
          'Bandingkan nilai intrinsik dengan harga pasar saat ini.',
          'Sisakan buffer agar kesalahan kecil tidak langsung merusak tesis.',
        ],
      },
    ],
  },
  {
    slug: 'membaca-free-cash-flow-dengan-sederhana',
    title: 'Membaca Free Cash Flow dengan Cara yang Lebih Sederhana',
    excerpt:
      'Free cash flow sering terasa teknis, padahal inti manfaatnya sederhana: apakah bisnis benar-benar menghasilkan kas setelah kebutuhan operasional dan belanja modal.',
    category: 'Fundamental',
    publishedAt: '2026-04-17',
    readingTime: '7 menit',
    coverAccent: 'mint',
    content: [
      {
        type: 'paragraph',
        text: 'Free cash flow atau FCF menunjukkan kas yang tersisa setelah perusahaan menjalankan bisnis dan menjaga aset produktifnya. Untuk investor, ini penting karena FCF sering menjadi bahan utama valuasi DCF.',
      },
      {
        type: 'heading',
        text: 'Hal yang perlu dilihat',
      },
      {
        type: 'bullet_list',
        items: [
          'Apakah FCF konsisten positif dalam beberapa tahun terakhir.',
          'Apakah pertumbuhan FCF didukung bisnis inti, bukan kejadian satu kali.',
          'Apakah kebutuhan capex terlalu besar sehingga FCF sulit bertahan.',
        ],
      },
      {
        type: 'paragraph',
        text: 'FCF yang bagus bukan sekadar besar, tetapi juga berulang dan punya kualitas yang baik. Di sinilah catatan portofolio dan valuasi mulai saling melengkapi.',
      },
    ],
  },
  {
    slug: 'cara-menggunakan-dcf-tanpa-terjebak-angka',
    title: 'Cara Menggunakan DCF Tanpa Terjebak pada Angka yang Terlalu Indah',
    excerpt:
      'DCF berguna untuk menyusun ekspektasi, bukan untuk memberi kepastian palsu. Gunakan sebagai alat berpikir, bukan mesin jawaban otomatis.',
    category: 'DCF',
    publishedAt: '2026-04-22',
    readingTime: '8 menit',
    coverAccent: 'ocean',
    content: [
      {
        type: 'paragraph',
        text: 'Model DCF sensitif terhadap pertumbuhan, diskonto, dan terminal growth. Itu bukan kelemahan, selama kita sadar bahwa hasil akhirnya adalah rentang nilai, bukan angka sakral.',
      },
      {
        type: 'heading',
        text: 'Prinsip praktis memakai DCF',
      },
      {
        type: 'bullet_list',
        items: [
          'Mulai dari baseline konservatif lebih dulu.',
          'Uji beberapa skenario untuk melihat seberapa sensitif hasilnya.',
          'Bandingkan hasil DCF dengan kualitas bisnis dan konteks industri.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Kalau hasil DCF hanya terlihat menarik saat asumsi dibuat sangat optimistis, biasanya itu sinyal untuk berhenti sejenak dan meninjau ulang tesisnya.',
      },
    ],
  },
];

export function getArticleBySlug(slug) {
  return articles.find((article) => article.slug === slug) ?? null;
}

export function getLatestArticles(limit = 3) {
  return [...articles]
    .sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt))
    .slice(0, limit);
}
