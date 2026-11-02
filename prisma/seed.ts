import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bersihin data lama
  await prisma.testimonial.deleteMany();
  await prisma.heroBadge.deleteMany();
  await prisma.heroSection.deleteMany();
  await prisma.statistic.deleteMany();
  await prisma.painPoint.deleteMany();
  await prisma.solution.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.howItWorksStep.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.companyProfile.deleteMany();

  // 1. Company Profile
  await prisma.companyProfile.create({
    data: {
      name: "Marica",
      tagline: "Platform edukasi calistung terbaik untuk anak-anak Indonesia",
      description:
        "Marica Experience Store menghadirkan pengalaman belajar keluarga berbasis phygital.",
      phone: "+62 858 7045 9329",
      email: "pt.sebangku@gmail.com",
      instagram: "@kids.marica",
      tiktok: "@kids.marica",
      youtube: "@kids.marica",
      website: "www.marica.id",
      address: "Jl. Bakungan No.10A, Bakungan, Wedomartani, Kec. Ngemplak, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55584"
    },
  });

  // 2. Hero Section + Badges
  await prisma.heroSection.create({
    data: {
      headline: "Ciptakan Momen Belajar Ceria dan Bermakna Bersama Si Kecil Setiap Hari",
      subheadline:
        "Bingung mencari aktivitas bermanfaat untuk anak? Dari keseruan area bermain fisik, workshop akhir pekan, hingga paket edukasi rutin di rumah, Marica siap mendampingi tiap tahapan tumbuh kembang anak Anda.",
      imageUrl: "/images/hero-character.png",
      ctaText: "Eksplor Serunya Marica",
      ctaLink: "#program",
      badges: {
        create: [
          { label: "Board Game", icon: "dice", order: 1 },
          { label: "Playpass", icon: "ticket", order: 2 },
          { label: "Workshop", icon: "pencil", order: 3 },
          { label: "Edu Kit", icon: "box", order: 4 },
        ],
      },
    },
  });

  // 3. Statistics (hero)
  await prisma.statistic.createMany({
    data: [
      { label: "Keluarga", value: "5000+", icon: "users", order: 1 },
      { label: "Rating Review", value: "4.9/5", icon: "star", order: 2 },
      { label: "Aktivitas", value: "100+", icon: "box", order: 3 },
    ],
  });

  // 4. Pain Points (Problem)
  await prisma.painPoint.createMany({
    data: [
      {
        title: "Bingung Mau Ajak Anak Main ke Mana Lagi?",
        description:
          "Bosan dengan tempat rekreasi yang itu-itu saja dan cuma bikin anak muter-muter tanpa dapat manfaat atau stimulasi belajar yang berarti.",
        imageUrl: "/images/problemkids1.png",
        order: 1,
      },
      {
        title: "Habis Ide Bikin Aktivitas Seru di Rumah",
        description:
          "Pengen banget dampingi anak main yang kreatif dan melatih logika, tapi sering kehabisan ide, bingung cari bahan mainnya, dan nggak ada waktu buat ngerancang sendiri dari nol.",
        imageUrl: "/images/problemkids2.png",
        order: 2,
      },
      {
        title: "Mainan Anak Cuma Jadi Pajangan & Gampang Bikin Bosan",
        description:
          "Sudah beli banyak mainan, tapi cuma dimainkan sekali-dua kali lalu ditinggal begitu saja karena kurang interaktif dan nggak ada alur permainan yang seru untuk dimainkan bareng.",
        imageUrl: "/images/problemkids3.png",
        order: 3,
      },
    ],
  });

  // 7. Benefits ("Apa yang Didapatkan Bunda & Si Kecil?")
  await prisma.benefit.createMany({
    data: [
      {
        category: "LOGIKA & KREATIVITAS",
        icon: "💡",
        title: "Bermain Sambil Melatih Logika & Kreativitas",
        description:
          "Anak-anak diajak berpikir kritis, memecahkan masalah, dan mengasah imajinasi lewat ratusan board game pilihan, buku interaktif, dan workshop sains serta kriya (craft kit).",
        imageUrl: "/images/benefit1.png",
        tags: ["Board Game", "Buku Interaktif", "Workshop", "Craft Kit"],
        order: 1,
      },
      {
        category: "FAMILY BONDING",
        icon: "🤝",
        title: "Menguatkan Bonding Ibu & Anak",
        description:
          "Menciptakan quality time yang hangat dan penuh tawa bersama keluarga melalui sesi bermain meja (Table-fee) dan kelas edukasi interaktif.",
        imageUrl: "/images/benefit2.png",
        tags: ["Quality Time", "Kelas Edukasi"],
        order: 2,
      },
      {
        category: "EDU-RECREATION",
        icon: "🎉",
        title: "Rekreasi Seru yang Berbobot Edukasi",
        description:
          "Alternatif tempat main fisik (Playpass) yang tidak hanya menyenangkan, tetapi juga aman, nyaman, dan mendukung perkembangan karakter serta sosialisasi anak.",
        imageUrl: "/images/benefit3.png",
        tags: ["Playpass", "Aman", "Sosialisasi", "Karakter Positif"],
        order: 3,
      },
      {
        category: "HOME LEARNING",
        icon: "📦",
        title: "Praktis! Inspirasi Main Tanpa Ribet di Rumah",
        description:
          "Lewat layanan Edu-Kit & Langganan Bulanan, Bunda tak perlu pusing lagi memikirkan ide permainan kreatif—bahan dan panduan aktivitas langsung dikirim rapi ke rumah.",
        imageUrl: "/images/benefit4.png",
        tags: ["Edu Kit", "Langganan", "Aktivitas Rumah", "Panduan"],
        order: 4,
      },
      {
        category: "HOLISTIC SUPPORT",
        icon: "🏠",
        title: "Dukungan Tumbuh Kembang Terpadu",
        description:
          "Menyediakan wadah sharing session / parenting class untuk orang tua, paket perayaan ulang tahun edukatif, hingga pelatihan media ajar untuk guru dan sekolah.",
        imageUrl: "/images/benefit5.png",
        tags: ["Parenting Class", "Birthday Package", "Pelatihan Guru", "Sekolah"],
        order: 5,
      },
    ],
  });

  // 8. How It Works Steps
  await prisma.howItWorksStep.createMany({
    data: [
      {
        stepNumber: 1,
        title: "Pilih Aktivitas Favorit",
        description:
          "Jelajahi Pilihan Bermain & Belajar > Pilih pengalaman yang cocok untuk Si Kecil melalui situs web kami—mulai dari main di area Playpass, ikutan Workshop akhir pekan, atau berlangganan Edu-Kit bulanan untuk di rumah.",
        order: 1,
      },
      {
        stepNumber: 2,
        title: "Datang Lansung atau Terima di Rumah",
        description:
          "Fleksibel Sesuai Kebutuhan Bunda > Datang langsung ke toko fisik Marica Experience Store untuk seru-seruan bersama, atau cukup duduk manis di rumah menunggu paket Edu-Kit dikirim langsung ke depan pintu.",
        order: 2,
      },
      {
        stepNumber: 3,
        title: "Nikmati Momen Belajar Ceria",
        description:
          "Lihat Si Kecil Tumbuh Makin Kreatif & Cerdas > Nikmati momen quality time yang hangat, bebas pusing, dan penuh tawa saat melihat anak aktif mengeksplorasi imajinasi serta logikanya lewat cara yang menyenangkan.",
        order: 3,
      },
    ],
  });

  // 9. Testimoni
  await prisma.testimonial.createMany({
    data: [
      {
        customerName: "Bunda Sarah Melati",
        role: "Ibu Rumah Tangga & Ibu dari 2 Anak",
        avatarUrl: "/images/testimoni1.png",
        message:
          "Akhirnya ketemu tempat main yang bikin anak betah berjam-jam tanpa perlu main HP! Tempatnya bersih, pilihan board game-nya banyak banget, dan stafnya telaten ngajarin cara mainnya. Jadi punya tempat quality time favorit baru bareng anak di akhir pekan.",
        order: 1,
      },
      {
        customerName: "Bunda Anita Rahma, S.T.",
        role: "Ibu Bekerja & Penggemar Edukasi Anak",
        avatarUrl: "/images/testimoni2.png",
        message:
          "Workshop sains dan kriya mingguan di Marica selalu bikin si kecil antusias! Materi belajar yang biasanya membosankan di sekolah, di sini malah disajikan seru banget lewat praktik langsung. Sepulang dari workshop, anaknya makin kritis dan kreatif.",
        order: 2,
      },
      {
        customerName: "Bunda Citra Kirana",
        role: "Ibu Bekerja & Pelanggan Edu-Kit Bulanan",
        avatarUrl: "/images/testimoni3.png",
        message:
          "Jujur sebagai working mom, saya sering kehabisan waktu dan ide buat ngerancang permainan edukatif di rumah. Berlangganan Edu-Kit Marica bener-bener menyelamatkan! Tiap bulan tinggal tunggu paket datang, semua bahan & panduannya sudah lengkap dan siap pakai.",
        order: 3,
      },
      {
        customerName: "Bunda Maya Indah",
        role: "Content Creator & Pegiat Parenting",
        avatarUrl: "/images/testimoni4.png",
        message:
          "Koleksi buku cerita dan edugame dari Marica desainnya bagus-bagus banget dan alur permainannya edukatif. Anak saya jadi lebih cepat paham konsep logika sederhana lewat cara yang menyenangkan. Recommended banget buat koleksi di rumah!",
        order: 4,
      },
      {
        customerName: "Ibu Ratna Dewi, S.Pd.",
        role: "Kepala Sekolah & Pendidik PAUD/TK",
        avatarUrl: "/images/testimoni5.png",
        message:
          "Siswa-siswi kami sangat antusias saat ikutan acara kunjungan dan pelatihan media ajar edugame dari Marica. Konsep belajar sambil bermainnya sangat pas untuk membantu anak-anak memahami materi dengan lebih cepat dan ceria!",
        order: 5,
      },
    ],
  });

  // 14. FAQ
  await prisma.faq.createMany({
    data: [
      {
        question: "Untuk anak usia berapa saja aktivitas dan produk di Marica?",
        answer: "Aktivitas dan produk Marica dirancang khusus untuk anak usia 2 hingga 12 tahun, mulai dari balita (pendampingan orang tua) hingga anak usia sekolah dasar.",
        order: 1,
      },
      {
        question: "Apakah harus reservasi terlebih dahulu jika ingin datang main ke Marica Experience Store?",
        answer: "Bunda bisa langsung datang (walk-in) untuk area bermain (Playpass) dan sewa meja board game. Namun, untuk Weekend Workshop dan kelas khusus, kami menyarankan reservasi terlebih dahulu agar kepastian slot tempat terjamin.",
        order: 2,
      },
      {
        question: "Apa isi dari paket berlangganan Edu-Kit bulanan Marica?",
        answer: "Paket Edu-Kit berisi kotak aktivitas mandiri terstruktur (craft kit, permainan logika/sains, atau board game) yang dilengkapi panduan belajar interaktif dan dikirim rutin langsung ke rumah setiap bulan.",
        order: 3,
      },
      {
        question: "Apakah tempatnya nyaman dan aman untuk balita dan keluarga?",
        answer: "Sangat aman dan nyaman! Seluruh area bermain fisik, fasilitas meja, dan alat peraga kami selalu dibersihkan secara berkala, ramah anak, serta didampingi oleh staf/fasilitator yang telaten.",
        order: 4,
      },
      {
        question: "Bisakah Marica menyelenggarkan acara sekolah, privat, atau ulang tahun?",
        answer: "Sangat bisa! Kami menyediakan paket perayaan ulang tahun edukatif, penyewaan seluruh area toko (space renting), hingga program pelatihan media ajar edugame untuk guru dan sekolah.",
        order: 5,
      },
    ],
  });

  // 15. Users (Bunda Rani, Admin, Kasir)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@marica.id' },
    update: {},
    create: {
      name: 'Admin Marica',
      email: 'admin@marica.id',
      role: 'ADMIN',
    }
  });

  await prisma.user.upsert({
    where: { email: 'kasir@marica.id' },
    update: {},
    create: {
      name: 'Kasir Marica',
      email: 'kasir@marica.id',
      role: 'KASIR',
    }
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'bunda.rani@gmail.com' },
    update: {},
    create: {
      name: 'Bunda Rani',
      email: 'bunda.rani@gmail.com',
      role: 'USER',
    }
  });

  // 16. Point Account for Customer
  await prisma.pointAccount.upsert({
    where: { userId: customerUser.id },
    update: { balance: 2500 },
    create: {
      userId: customerUser.id,
      balance: 2500,
    }
  });

  // 17. Vouchers (Katalog)
  await prisma.userVoucher.deleteMany();
  await prisma.voucher.deleteMany();
  const v1 = await prisma.voucher.create({
    data: {
      code: 'POTONGAN10K',
      title: 'Voucher Belanja Rp10.000',
      description: 'Potongan harga belanja online dan offline',
      pointsCost: 500,
      discountAmount: 10000,
      isActive: true,
      status: 'ACTIVE',
    }
  });
  const v2 = await prisma.voucher.create({
    data: {
      code: 'POTONGAN25K',
      title: 'Voucher Belanja Rp25.000',
      description: 'Potongan harga belanja online dan offline minimal belanja 200rb',
      pointsCost: 1000,
      discountAmount: 25000,
      isActive: true,
      status: 'ACTIVE',
    }
  });
  await prisma.voucher.create({
    data: {
      code: 'POTONGAN30K',
      title: 'Voucher Belanja Rp30.000',
      description: 'Potongan harga khusus Marica Store',
      pointsCost: 1200,
      discountAmount: 30000,
      isActive: true,
      status: 'ACTIVE',
    }
  });
  const v4 = await prisma.voucher.create({
    data: {
      code: 'ONGKIR15K',
      title: 'Gratis Ongkir Rp15.000',
      description: 'Potongan ongkos kirim online',
      pointsCost: 800,
      discountAmount: 15000,
      isActive: true,
      status: 'ACTIVE',
    }
  });

  // 18. User Vouchers
  await prisma.userVoucher.create({
    data: {
      userId: customerUser.id,
      voucherId: v1.id,
      status: 'AVAILABLE',
    }
  });
  await prisma.userVoucher.create({
    data: {
      userId: customerUser.id,
      voucherId: v4.id,
      status: 'AVAILABLE',
    }
  });
  await prisma.userVoucher.create({
    data: {
      userId: customerUser.id,
      voucherId: v2.id,
      status: 'USED',
      usedAt: new Date(),
    }
  });

  // 18b. Playpass, table reservation, and F&B demo catalog
  const playpassDemoPackages = [
    { id: 'seed-playpass-anak', name: 'Playpass Anak - 2 Jam', durationMinutes: 120, price: 50000, maxParticipants: 6, slotCapacity: 6 },
    { id: 'seed-playpass-keluarga', name: 'Playpass Keluarga - 3 Jam', durationMinutes: 180, price: 120000, maxParticipants: 8, slotCapacity: 4 },
  ];
  for (const item of playpassDemoPackages) {
    await prisma.playpassPackage.upsert({ where: { id: item.id }, update: item, create: item });
  }
  const tableDemoPackages = [
    { id: 'seed-table-boardgame', name: 'Meja Board Game - 2 Jam', durationMinutes: 120, price: 75000, maxPlayers: 6, slotCapacity: 4 },
    { id: 'seed-table-family', name: 'Meja Family - 3 Jam', durationMinutes: 180, price: 100000, maxPlayers: 8, slotCapacity: 3 },
  ];
  for (const item of tableDemoPackages) {
    await prisma.tableFeePackage.upsert({ where: { id: item.id }, update: item, create: item });
  }
  const fnbDemoProducts = [
    { id: 'seed-fnb-air-mineral', name: 'Air Mineral Marica', description: 'Air mineral dingin untuk menemani aktivitas bermain.', price: 8000, stock: 100, imageUrl: '/images/fnb-water.png' },
    { id: 'seed-fnb-roti-cokelat', name: 'Roti Cokelat Mini', description: 'Roti lembut dengan isian cokelat, cocok untuk anak.', price: 15000, stock: 40, imageUrl: '/images/fnb-bread.png' },
    { id: 'seed-fnb-paket-keluarga', name: 'Paket Snack Keluarga', description: 'Kombinasi snack ringan untuk 3-4 orang.', price: 45000, stock: 25, imageUrl: '/images/fnb-snack.png' },
  ];
  for (const item of fnbDemoProducts) {
    await prisma.fnbProduct.upsert({ where: { id: item.id }, update: item, create: item });
  }
  const demoInquiry = await prisma.b2BInquiry.upsert({
    where: { inquiryNumber: 'B2B-DEMO-001' },
    update: { organizationName: 'SD Ceria Yogyakarta', organizationType: 'SCHOOL', contactName: 'Ibu Diah', email: 'diah@sdceria.sch.id', whatsapp: '081234567890', requestType: 'KUNJUNGAN_SEKOLAH', participantCount: 30, eventDate: new Date('2026-10-17T00:00:00.000Z'), budget: 5000000, notes: 'Paket kunjungan edukatif untuk siswa kelas 3-4.', status: 'QUOTED', quotationNumber: 'QT-DEMO-001', quotedTotal: 4200000, validUntil: new Date('2026-10-10T00:00:00.000Z'), userId: customerUser.id },
    create: { inquiryNumber: 'B2B-DEMO-001', userId: customerUser.id, organizationName: 'SD Ceria Yogyakarta', organizationType: 'SCHOOL', contactName: 'Ibu Diah', email: 'diah@sdceria.sch.id', whatsapp: '081234567890', requestType: 'KUNJUNGAN_SEKOLAH', participantCount: 30, eventDate: new Date('2026-10-17T00:00:00.000Z'), budget: 5000000, notes: 'Paket kunjungan edukatif untuk siswa kelas 3-4.', status: 'QUOTED', quotationNumber: 'QT-DEMO-001', quotedTotal: 4200000, validUntil: new Date('2026-10-10T00:00:00.000Z') },
  });
  await prisma.b2BQuotationItem.deleteMany({ where: { inquiryId: demoInquiry.id } });
  await prisma.b2BQuotationItem.createMany({ data: [
    { inquiryId: demoInquiry.id, name: 'Paket Playpass Rombongan', description: 'Tiket area bermain untuk 30 peserta.', quantity: 30, unitPrice: 100000, discount: 300000, subtotal: 2700000 },
    { inquiryId: demoInquiry.id, name: 'Workshop Edugame', description: 'Sesi fasilitator dan aktivitas edukatif.', quantity: 1, unitPrice: 1500000, discount: 0, subtotal: 1500000 },
  ] });

  // 19. Products & Categories
  await prisma.preOrderReservation.deleteMany();
  await prisma.preOrderCampaign.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.productBundleItem.deleteMany();
  await prisma.productBundle.deleteMany();
  await prisma.cartItem.deleteMany();
  
  const toyCategory = await prisma.productCategory.upsert({
    where: { slug: 'mainan-edukasi' },
    update: { name: 'Mainan Edukasi', isActive: true },
    create: { name: 'Mainan Edukasi', slug: 'mainan-edukasi', colorTag: 'blue', isActive: true }
  });
  const bookCategory = await prisma.productCategory.upsert({
    where: { slug: 'buku-cerita-3' },
    update: { name: 'Buku Cerita', isActive: true },
    create: { name: 'Buku Cerita', slug: 'buku-cerita-3', colorTag: 'purple', isActive: true }
  });
  const cat1 = await prisma.productCategory.upsert({
    where: { slug: 'board-games' },
    update: { name: 'Board Games', colorTag: 'blue', isActive: true, parentId: toyCategory.id },
    create: { name: 'Board Games', slug: 'board-games', colorTag: 'blue', parentId: toyCategory.id }
  });
  const cat2 = await prisma.productCategory.upsert({
    where: { slug: 'edu-kit' },
    update: { name: 'Edu Kit', colorTag: 'orange', isActive: true, parentId: toyCategory.id },
    create: { name: 'Edu Kit', slug: 'edu-kit', colorTag: 'orange', parentId: toyCategory.id }
  });

  const smartBoard = await prisma.product.upsert({
    where: { slug: 'marica-smart-board' },
    update: {
      name: 'Marica Smart Board',
      description: 'Papan pintar edukatif untuk anak',
      price: 150000,
      stock: 50,
      categoryId: cat1.id,
      highlights: ['Meningkatkan motorik', 'Warna cerah'],
      isActive: true,
    },
    create: { name: 'Marica Smart Board', slug: 'marica-smart-board', description: 'Papan pintar edukatif untuk anak', price: 150000, stock: 50, categoryId: cat1.id, highlights: ['Meningkatkan motorik', 'Warna cerah'] }
  });
  const puzzle = await prisma.product.upsert({
    where: { slug: 'puzzle-logika-anak' },
    update: {
      name: 'Puzzle Logika Anak',
      description: 'Puzzle kayu melatih problem solving',
      price: 75000,
      stock: 100,
      categoryId: cat1.id,
      highlights: ['Bahan kayu aman', 'Melatih fokus'],
      isActive: true,
    },
    create: { name: 'Puzzle Logika Anak', slug: 'puzzle-logika-anak', description: 'Puzzle kayu melatih problem solving', price: 75000, stock: 100, categoryId: cat1.id, highlights: ['Bahan kayu aman', 'Melatih fokus'] }
  });
  const sensoryKit = await prisma.product.upsert({
    where: { slug: 'sensory-play-kit' },
    update: {
      name: 'Sensory Play Kit',
      description: 'Paket bermain sensori untuk balita',
      price: 120000,
      stock: 30,
      categoryId: cat2.id,
      highlights: ['Tekstur beragam', 'Aman jika tertelan sedikit'],
      isActive: true,
    },
    create: { name: 'Sensory Play Kit', slug: 'sensory-play-kit', description: 'Paket bermain sensori untuk balita', price: 120000, stock: 30, categoryId: cat2.id, highlights: ['Tekstur beragam', 'Aman jika tertelan sedikit'] }
  });
  await prisma.productImage.upsert({ where: { id: 'seed-image-smart-board' }, update: { url: '/images/product1.png', productId: smartBoard.id }, create: { id: 'seed-image-smart-board', url: '/images/product1.png', productId: smartBoard.id } });
  await prisma.productImage.upsert({ where: { id: 'seed-image-puzzle' }, update: { url: '/images/product2.png', productId: puzzle.id }, create: { id: 'seed-image-puzzle', url: '/images/product2.png', productId: puzzle.id } });
  await prisma.productImage.upsert({ where: { id: 'seed-image-sensory-kit' }, update: { url: '/images/product3.png', productId: sensoryKit.id }, create: { id: 'seed-image-sensory-kit', url: '/images/product3.png', productId: sensoryKit.id } });

  const documentProductCategories: { name: string; slug: string; colorTag: string; order: number; parentId?: string }[] = [
    { name: 'WORKSHEET', slug: 'worksheet', colorTag: 'green', order: 1 },
    { name: 'ENSIKLOPEDIA', slug: 'ensiklopedia', colorTag: 'blue', order: 2 },
    { name: 'Buku Rasa Majalah', slug: 'buku-rasa-majalah', colorTag: 'orange', order: 3 },
    { name: 'Cerita Bergambar Marica', slug: 'cerita-bergambar-marica', colorTag: 'purple', order: 4, parentId: bookCategory.id },
  ];

  const categoriesBySlug = new Map<string, string>();
  for (const category of documentProductCategories) {
    const record = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        colorTag: category.colorTag,
        order: category.order,
        ...(category.parentId ? { parentId: category.parentId } : {}),
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        colorTag: category.colorTag,
        order: category.order,
        ...(category.parentId ? { parentId: category.parentId } : {}),
        isActive: true,
      },
    });
    categoriesBySlug.set(category.slug, record.id);
  }

  const documentProducts = [
    {
      name: 'Worksheet Ramadhan Activity for Kids',
      slug: 'worksheet-ramadhan-activity-for-kids',
      category: 'worksheet',
      price: 49000,
      description:
        'Lembar kerja interaktif bertema Ramadhan dengan jurnal ibadah harian, aktivitas mewarnai, labirin, dan tantangan kebaikan untuk membantu anak memahami makna puasa dengan cara yang menyenangkan.',
    },
    {
      name: 'Buku Ensiklopedia Bangun Ruang',
      slug: 'buku-ensiklopedia-bangun-ruang',
      category: 'ensiklopedia',
      price: 49000,
      description:
        'Buku visual interaktif untuk membantu anak memahami konsep bangun ruang dan membangun fondasi matematika dengan cara yang nyata dan menyenangkan.',
    },
    {
      name: 'Buku Ensiklopedia Mengenal Bilangan',
      slug: 'buku-ensiklopedia-mengenal-bilangan',
      category: 'ensiklopedia',
      price: 29000,
      description:
        'Buku visual dengan ilustrasi dan penjelasan interaktif untuk mengenalkan angka kepada anak melalui petualangan belajar yang seru dan mudah dipahami.',
    },
    {
      name: 'Buku Ensiklopedia Belajar Panjang & Perkalian',
      slug: 'buku-ensiklopedia-belajar-panjang-perkalian',
      category: 'ensiklopedia',
      price: 29000,
      description:
        'Buku visual yang mengubah konsep panjang dan perkalian menjadi aktivitas belajar yang seru sehingga anak lebih mudah memahami logika hitungan.',
    },
    {
      name: 'Terbang Ke Luar Angkasa',
      slug: 'terbang-ke-luar-angkasa',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah edukasi visual berisi fakta astronomi dan ilustrasi memukau yang mengajak anak menjelajahi galaksi dan mengenal dunia luar angkasa.',
    },
    {
      name: 'Penemuan Robot Masa Depan',
      slug: 'penemuan-robot-masa-depan',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah visual tentang inovasi robotika yang memicu kreativitas dan imajinasi anak untuk menjadi penemu hebat di masa depan.',
    },
    {
      name: 'Kreasi Bangun Ruang',
      slug: 'kreasi-bangun-ruang',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Buku aktivitas interaktif untuk melatih kecerdasan spasial anak melalui kegiatan melipat, menempel, dan merakit bentuk tiga dimensi.',
    },
    {
      name: 'Ayo Mengenal Anatomi',
      slug: 'ayo-mengenal-anatomi',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah visual yang mengenalkan organ dan sistem tubuh manusia melalui ilustrasi detail agar belajar biologi terasa seperti petualangan.',
    },
    {
      name: 'Ibadah Ke Tanah Suci',
      slug: 'ibadah-ke-tanah-suci',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah visual interaktif yang mengenalkan tata cara haji dan umrah serta menanamkan rasa cinta kepada Baitullah sejak dini.',
    },
    {
      name: 'Petualangan Di Dunia Dinosaurus',
      slug: 'petualangan-di-dunia-dinosaurus',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah visual berisi fakta seru dan ilustrasi dinosaurus yang mengajak anak menjelajahi dunia prasejarah.',
    },
    {
      name: 'Jelajahi Dunia Dengan Transportasi (Bonus Video)',
      slug: 'jelajahi-dunia-dengan-transportasi',
      category: 'buku-rasa-majalah',
      price: 29000,
      description:
        'Majalah visual tentang berbagai kendaraan di dunia yang dilengkapi bonus video interaktif untuk membuat pengalaman belajar semakin nyata.',
    },
    {
      name: 'Memilih Keputusan Terbaik',
      slug: 'memilih-keputusan-terbaik',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual yang melatih kemampuan berpikir kritis dan karakter anak melalui skenario pengambilan keputusan dalam kehidupan sehari-hari.',
    },
    {
      name: 'Pemilihan Hewan Terbaik (Bonus Video)',
      slug: 'pemilihan-hewan-terbaik',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual tentang keunikan fauna yang dilengkapi bonus video interaktif untuk membantu anak mengenal karakter dan kelebihan setiap hewan.',
    },
    {
      name: 'Sahabat Baru dari Zaman Purba',
      slug: 'sahabat-baru-dari-zaman-purba',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual tentang persahabatan dengan makhluk purbakala yang memicu imajinasi dan empati anak.',
    },
    {
      name: 'CIT CIT CIT',
      slug: 'cit-cit-cit',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Kisah Mari dan Caca tentang mengembalikan anak burung ke sarangnya sekaligus mengajarkan kasih sayang dan kepedulian terhadap makhluk hidup.',
    },
    {
      name: 'Kunjungan ke Rumah Bibi Megi (Bonus Video)',
      slug: 'kunjungan-ke-rumah-bibi-megi',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual dengan bonus video yang mengajarkan etika bertamu dan kebersamaan melalui kisah keluarga yang ceria.',
    },
    {
      name: 'Petualangan Mari Menuju Rumah Jaja (Bonus Video)',
      slug: 'petualangan-mari-menuju-rumah-jaja',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual dengan bonus video yang melatih kemandirian dan kecerdasan spasial melalui rute perjalanan penuh warna.',
    },
    {
      name: 'Perjalanan Tarsius Kecil',
      slug: 'perjalanan-tarsius-kecil',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual tentang petualangan tarsius di hutan yang mengenalkan keajaiban satwa langka Indonesia dan pentingnya menjaga alam.',
    },
    {
      name: 'Merawat Bunga Matahari',
      slug: 'merawat-bunga-matahari',
      category: 'cerita-bergambar-marica',
      price: 19000,
      description:
        'Cerita visual dengan panduan praktis yang mengajarkan tanggung jawab, cara menanam, dan kecintaan terhadap alam.',
    },
  ] as const;

  for (const item of documentProducts) {
    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        stock: 100,
        categoryId: categoriesBySlug.get(item.category),
        isActive: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        stock: 100,
        categoryId: categoriesBySlug.get(item.category),
        highlights: [],
        isActive: true,
      },
    });
  }

  // 20. Articles & Categories
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.articleCategory.deleteMany();

  const blogCat1 = await prisma.articleCategory.create({
    data: { name: 'Parenting', slug: 'parenting', colorTag: 'purple' }
  });
  const blogCat2 = await prisma.articleCategory.create({
    data: { name: 'Edukatif', slug: 'edukatif', colorTag: 'green' }
  });

  await prisma.article.create({
    data: {
      title: '5 Cara Menumbuhkan Minat Baca Anak',
      slug: '5-cara-menumbuhkan-minat-baca',
      excerpt: 'Tips praktis bagi orang tua untuk membuat anak gemar membaca.',
      content: '<p>Membaca adalah jendela dunia...</p>',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: blogCat1.id,
      authorId: adminUser.id,
    }
  });
  await prisma.article.create({
    data: {
      title: 'Pentingnya Bermain Sensori',
      slug: 'pentingnya-bermain-sensori',
      excerpt: 'Mengapa balita butuh bermain sensori?',
      content: '<p>Bermain sensori sangat penting untuk saraf motorik...</p>',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: blogCat2.id,
      authorId: adminUser.id,
    }
  });
  await prisma.article.create({
    data: {
      title: 'Mengenal Konsep STEM Sejak Dini',
      slug: 'mengenal-konsep-stem',
      excerpt: 'Sains dan Matematika yang menyenangkan.',
      content: '<p>STEM (Science, Technology, Engineering, Math) bisa diajarkan dengan cara seru...</p>',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: blogCat2.id,
      authorId: adminUser.id,
    }
  });

  console.log("Seed selesai ✅");
  await prisma.preOrderCampaign.upsert({
    where: { slug: 'marica-edugame-adventure-kit' },
    update: {
      title: 'Marica Edugame Adventure Kit - Exclusive Release',
      description: 'Paket edugame self-published Marica dengan jumlah batch perdana terbatas.',
      productId: sensoryKit.id,
      price: 175000,
      preorderOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      preorderCloseAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      releaseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stockLimit: 50,
      status: 'PUBLISHED',
    },
    create: {
      slug: 'marica-edugame-adventure-kit',
      title: 'Marica Edugame Adventure Kit - Exclusive Release',
      description: 'Paket edugame self-published Marica dengan jumlah batch perdana terbatas.',
      productId: sensoryKit.id,
      price: 175000,
      preorderOpenAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      preorderCloseAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      releaseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stockLimit: 50,
      status: 'PUBLISHED',
    },
  });
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'edu-kit-bulanan' },
    update: { name: 'Edu-Kit Bulanan', description: 'Paket aktivitas edukatif yang dikirim setiap bulan.', price: 199000, interval: 'MONTHLY', isActive: true },
    create: { slug: 'edu-kit-bulanan', name: 'Edu-Kit Bulanan', description: 'Paket aktivitas edukatif yang dikirim setiap bulan.', price: 199000, interval: 'MONTHLY', isActive: true },
  });
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'edu-kit-triwulan' },
    update: { name: 'Edu-Kit Triwulan', description: 'Paket aktivitas edukatif untuk tiga bulan dengan harga spesial.', price: 549000, interval: 'QUARTERLY', isActive: true },
    create: { slug: 'edu-kit-triwulan', name: 'Edu-Kit Triwulan', description: 'Paket aktivitas edukatif untuk tiga bulan dengan harga spesial.', price: 549000, interval: 'QUARTERLY', isActive: true },
  });
  const subscriptionActivities = [
    { slug: 'eksperimen-warna-di-rumah', title: 'Eksperimen Warna di Rumah', description: 'Panduan aktivitas sederhana untuk mengenalkan pencampuran warna menggunakan bahan yang aman di rumah.', contentType: 'GUIDE', videoUrl: 'https://www.youtube.com/watch?v=marica-demo-warna', guideUrl: '/activity-guides/eksperimen-warna-di-rumah.pdf', thumbnailUrl: '/images/activity-color-mixing.png', ageMin: 4, ageMax: 8, sortOrder: 1, isPublished: true },
    { slug: 'misi-mencari-bentuk', title: 'Misi Mencari Bentuk', description: 'Aktivitas observasi untuk melatih kemampuan mengenali bentuk dan memecahkan tantangan kecil bersama orang tua.', contentType: 'VIDEO', videoUrl: 'https://www.youtube.com/watch?v=marica-demo-bentuk', guideUrl: null, thumbnailUrl: '/images/activity-shapes.png', ageMin: 3, ageMax: 7, sortOrder: 2, isPublished: true },
    { slug: 'cerita-sebelum-tidur', title: 'Cerita Sebelum Tidur: Berani Mencoba', description: 'Cerita singkat dan pertanyaan refleksi untuk membangun keberanian anak mencoba hal baru.', contentType: 'GUIDE', videoUrl: null, guideUrl: '/activity-guides/cerita-berani-mencoba.pdf', thumbnailUrl: '/images/activity-story.png', ageMin: 3, ageMax: 6, sortOrder: 3, isPublished: true },
  ];
  for (const activity of subscriptionActivities) {
    await prisma.subscriptionActivity.upsert({ where: { slug: activity.slug }, update: activity, create: activity });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
