export const DEFAULT_SITE_SETTINGS: Record<
  string,
  Record<string, unknown>
> = {
  brand: {
    name: 'Kılıç Coffee Roasters',
    slogan: 'Engineered Precision. Artisanal Depth.',
    tagline:
      'Engineered Precision. Artisanal Depth. Seçkin profesyoneller için yüksek teknolojili kavrum.',
    established: 'EST. 2024',
    location: 'Torbalı · İzmir',
  },
  contact: {
    address:
      'AYRANCILAR MAHALLESİ DEĞİRMEN CAD. NO:55A AYRANCILAR, 35870 Torbalı/İzmir',
    email: 'info@kiliccoffeeroasters.com.tr',
    phone: '+90 232 000 00 00',
    hours: 'Pzt — Cmt / 08:00 — 18:00',
    locationLabel: 'Torbalı / İzmir',
  },
  seo: {
    title: 'Kılıç Coffee Roasters',
    description:
      'Engineered Precision. Artisanal Depth. Torbalı / İzmir özel kahve kavurucusu.',
    keywords: [
      'kahve',
      'kavurma',
      'specialty coffee',
      'Torbalı',
      'İzmir',
      'Kılıç Coffee Roasters',
    ],
    ogImage:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
  },
  navigation: {
    header: [
      { href: '/urunler', label: 'Kavrumlar' },
      { href: '/blog', label: 'Blog' },
      { href: '/iletisim', label: 'İletişim' },
      { href: '/takip', label: 'Takip' },
    ],
    footerNav: [
      { href: '/urunler', label: 'Kavrumlar' },
      { href: '/blog', label: 'Blog' },
      { href: '/iletisim', label: 'İletişim' },
      { href: '/sepet', label: 'Sepet' },
      { href: '/hesabim', label: 'Hesabım' },
    ],
    footerLegal: [
      { href: '/kvkk', label: 'KVKK' },
      { href: '/gizlilik', label: 'Gizlilik' },
      { href: '/cerez-politikasi', label: 'Çerez Politikası' },
      { href: '/mesafeli-satis', label: 'Mesafeli Satış' },
      { href: '/on-bilgilendirme', label: 'Ön Bilgilendirme' },
      { href: '/iptal-iade', label: 'İptal & İade' },
      { href: '/aydinlatma-metni', label: 'Aydınlatma Metni' },
    ],
  },
  social: {
    instagram: '',
    facebook: '',
    googleMaps: '',
  },
  footer: {
    description:
      'Ampirik veri ve zanaat sezgisiyle mükemmel kavrum profilini mühendislik seviyesinde üretir. Torbalı / İzmir.',
    copyrightSuffix: 'Engineered Precision.',
  },
};

export const DEFAULT_HOME_SECTIONS = [
  {
    page: 'home',
    sectionKey: 'hero',
    title: 'Hero',
    sortOrder: 1,
    content: {
      imageUrl:
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=2000&q=80',
      eyebrow: 'EST. 2024 / TORBALI · İZMİR',
      titleLine1: 'Kılıç',
      titleLine2: 'Roasters',
      description:
        'Engineered Precision. Artisanal Depth. Seçkin profesyoneller için yüksek teknolojili kavrum.',
      ctaPrimary: { label: 'Koleksiyonu Keşfet', href: '/urunler' },
      ctaSecondary: { label: 'Ethos', href: '#ethos' },
      sidebar: [
        { label: 'System_Status', value: 'Optimal' },
        { label: 'Latency', value: '14ms' },
        { label: 'Grid', value: 'Torbalı / İzmir' },
      ],
    },
  },
  {
    page: 'home',
    sectionKey: 'ethos',
    title: 'Ethos',
    sortOrder: 2,
    content: {
      titleLines: ['The', 'Roasting', 'Ethos'],
      description:
        'Metodolojimiz veriye dayanır. Her batch için termal eğri boyunca tutarlılığı garanti etmek üzere onlarca değişken izleriz.',
      stats: [
        { label: 'Drum Speed', value: '54 RPM' },
        { label: 'Airflow', value: '82%' },
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80',
      telemetry: {
        profile: 'KRC-74-Alpha',
        feed: 'Live_Feed: Active',
        metrics: [
          { label: 'Temp_Internal', value: '204.5°C' },
          { label: 'RoR_Phase', value: '+8.2' },
          { label: 'Exhaust_Temp', value: '188.1°C' },
          { label: 'Fuel_Stability', value: '99.8%' },
        ],
      },
    },
  },
  {
    page: 'home',
    sectionKey: 'products',
    title: 'Featured Products',
    sortOrder: 3,
    content: {
      title: 'Curated Specimens',
      subtitle: 'Seçilmiş hasat // veriye göre filtrele',
      ctaLabel: 'Tümünü Gör',
      ctaHref: '/urunler',
    },
  },
  {
    page: 'home',
    sectionKey: 'workshop',
    title: 'Workshop',
    sortOrder: 4,
    content: {
      subtitle: 'Physical Node',
      titleLines: ['Visit The', 'Workshop'],
      description:
        'Hassasiyeti deneyimleyin. Torbalı merkezimizde tadım laboratuvarı ve endüstriyel kavrum hattı bir arada.',
      imageUrl:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80',
      ctaLabel: 'İletişime Geç',
      ctaHref: '/iletisim',
    },
  },
  {
    page: 'home',
    sectionKey: 'newsletter',
    title: 'Newsletter',
    sortOrder: 5,
    content: {
      title: 'System Notifications',
      description: 'Drop uyarıları ve teknik loglar için ağa katılın',
    },
  },
  {
    page: 'contact',
    sectionKey: 'header',
    title: 'İletişim Başlık',
    sortOrder: 1,
    content: {
      title: 'İletişim',
      subtitle: 'Protokol mesajı gönderin veya atölyemizi ziyaret edin.',
    },
  },
];
