/**
 * PayTR / mesafeli satış için yönetmeliklere uygun yasal metin şablonları.
 * Şirket unvanı, vergi no ve MERSİS bilgilerini canlıya çıkmadan önce güncelleyin.
 */

const SELLER = {
  name: "Kılıç Coffee Roasters",
  address:
    "AYRANCILAR MAHALLESİ DEĞİRMEN CAD. NO:55A AYRANCILAR, 35870 Torbalı/İzmir",
  email: "info@kiliccoffeeroasters.com.tr",
  phone: "+90 232 000 00 00",
  website: "https://kiliccoffeeroasters.com.tr",
  taxOffice: "[Vergi Dairesi — güncellenecek]",
  taxNumber: "[Vergi No / TCKN — güncellenecek]",
  mersis: "[MERSİS No — güncellenecek]",
};

export const LEGAL_DEFAULTS: Record<
  string,
  { title: string; content: string }
> = {
  kvkk: {
    title: "KVKK Aydınlatma",
    content: `${SELLER.name} olarak kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında işleriz. Verileriniz sipariş, teslimat, müşteri desteği, ödeme süreçleri ve yasal yükümlülüklerin yerine getirilmesi amacıyla sınırlı olarak kullanılır.

Veri sorumlusu: ${SELLER.name}
Adres: ${SELLER.address}
İletişim: ${SELLER.email} · ${SELLER.phone}

Haklarınız: KVKK m.11 uyarınca verilerinize erişme, düzeltme, silme, işlemeyi kısıtlama, itiraz etme ve şikayette bulunma haklarına sahipsiniz. Başvurularınızı ${SELLER.email} adresine iletebilirsiniz.`,
  },
  "cerez-politikasi": {
    title: "Çerez Kullanımı Hakkında Bilgilendirme",
    content: `Bu Çerez Politikası, ${SELLER.name} (“Şirket”, “biz”) tarafından işletilen ${SELLER.website} internet sitesinde kullanılan çerezler hakkında 6698 sayılı KVKK ve ilgili mevzuat uyarınca bilgilendirme amacıyla hazırlanmıştır.

1. Çerez nedir?
Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcınıza veya cihazınıza kaydedilen küçük metin dosyalarıdır. Oturumun sürdürülmesi, sepetin korunması, güvenlik ve site performansının ölçülmesi gibi amaçlarla kullanılır.

2. Kullandığımız çerez türleri
a) Zorunlu çerezler: Sitenin temel işlevleri (oturum, sepet, güvenlik, dil tercihleri) için gereklidir. Bunlar olmadan alışveriş tamamlanamaz.
b) İşlevsel çerezler: Tercihlerinizi hatırlamak için kullanılır.
c) Analitik / performans çerezleri: Trafik ve kullanım istatistiklerini anonim veya takma adlı biçimde ölçmek için kullanılabilir; açık rızanız olmadan pazarlama amaçlı profilleme yapılmaz.
d) Ödeme / güvenlik çerezleri: PayTR ve benzeri ödeme altyapıları, 3D Secure ve dolandırıcılık önleme süreçlerinde kendi güvenlik çerezlerini kullanabilir.

3. Çerezlerin yönetimi
Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin engellenmesi halinde sepet, giriş ve ödeme işlevleri çalışmayabilir. Rıza paneli üzerinden isteğe bağlı çerez tercihlerinizi güncelleyebilirsiniz.

4. Saklama süreleri
Oturum çerezleri tarayıcı kapanınca silinir. Kalıcı çerezler, amaçlarına uygun makul sürelerle (ör. sepet sürekliliği, rıza kaydı) saklanır; süre sonunda silinir veya anonimleştirilir.

5. Üçüncü taraflar
Ödeme (PayTR), kargo, e-posta/SMS ve analiz hizmet sağlayıcıları, yalnızca hizmetin ifası için gerekli ölçüde çerez veya benzeri teknolojiler kullanabilir. Bu tarafların kendi gizlilik politikaları da geçerlidir.

6. İletişim
Çerezler ve KVKK talepleriniz için: ${SELLER.email}

Son güncelleme: ${2026}`,
  },
  "mesafeli-satis": {
    title: "Mesafeli Satış Sözleşmesi",
    content: `MADDE 1 — TARAFLAR
İşbu Mesafeli Satış Sözleşmesi (“Sözleşme”), 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca aşağıda bilgileri yer alan satıcı ile elektronik ortamda sipariş veren alıcı arasında akdedilmiştir.

1.1. Satıcı
Unvan / İşletme adı: ${SELLER.name}
Adres: ${SELLER.address}
Telefon: ${SELLER.phone}
E-posta: ${SELLER.email}
Web: ${SELLER.website}
Vergi dairesi / No: ${SELLER.taxOffice} / ${SELLER.taxNumber}
MERSİS: ${SELLER.mersis}

1.2. Alıcı
Sipariş formunda beyan edilen ad-soyad / unvan, adres, telefon ve e-posta bilgilerine sahip gerçek veya tüzel kişidir.

MADDE 2 — KONU
Sözleşmenin konusu; alıcının satıcıya ait internet sitesinden elektronik ortamda siparişini verdiği, nitelikleri ve satış fiyatı sipariş özetinde belirtilen ürün/hizmetin satışı ve teslimidir.

MADDE 3 — SÖZLEŞMENİN KURULMASI
Alıcı, sipariş öncesi ön bilgilendirme formunu ve işbu sözleşmeyi okuyup onayladıktan sonra ödemeyi tamamlayarak siparişi kesinleştirir. Ödemenin onaylanması ile sözleşme kurulmuş sayılır.

MADDE 4 — ÜRÜN VE BEDEL
Ürünlerin temel nitelikleri, birim fiyatı, kargo bedeli, vergiler ve toplam tutar sipariş özetinde ve ödeme ekranında gösterilir. Fiyatlar aksi belirtilmedikçe Türk Lirası ve KDV dahildir.

MADDE 5 — ÖDEME
Ödeme, PayTR ödeme altyapısı üzerinden kredi/banka kartı veya satıcının sunduğu diğer yöntemlerle yapılır. Kart bilgileri satıcı sunucularında saklanmaz; işlem 3D Secure ile doğrulanabilir.

MADDE 6 — TESLİMAT
Teslimat, alıcının bildirdiği adrese, seçilen kargo firması ile yapılır. Stok ve kavrum takvimine bağlı olarak hazırlık süresi sipariş onayında veya ürün sayfasında belirtilen süreye tabidir. Mücbir sebeplerde süre uzayabilir; alıcı bilgilendirilir.

MADDE 7 — CAYMA HAKKI
Alıcı, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkını kullanabilir. Cayma bildirimi yazılı veya kalıcı veri saklayıcısı ile (e-posta: ${SELLER.email}) yapılmalıdır.

Aşağıdaki hallerde cayma hakkı kullanılamaz / sınırlıdır (Yönetmelik m.15 ve ilgili hükümler):
- Tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler
- Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler
- Teslimden sonra ambalajı açılmış; sağlık/hijyen açısından iadesi uygun olmayan ürünler (açılmış kahve ambalajları vb.)
- Elektronik ortamda anında ifa edilen veya tüketicinin onayıyla ifasına başlanan dijital içerikler (varsa)

MADDE 8 — İADE VE ÜCRET İADESİ
Cayma hakkının usulüne uygun kullanılması halinde satıcı, ürünün iadesini takip eden en geç 14 gün içinde bedeli, alıcının ödeme yaptığı yönteme uygun şekilde iade eder. İade kargo koşulları “İptal ve İade” politikasında belirtilir.

MADDE 9 — AYIPLI MAL
6502 sayılı Kanun ve ilgili yönetmelikler kapsamında ayıplı mal hükümleri saklıdır. Ayıplı ürünlerde alıcı; ücretsiz onarım, değiştirme, bedel iadesi veya ayıp oranında indirim seçeneklerinden birini talep edebilir.

MADDE 10 — KİŞİSEL VERİLER
Alıcının kişisel verileri KVKK ve aydınlatma metni kapsamında işlenir.

MADDE 11 — UYUŞMAZLIKLAR
Uyuşmazlıklarda, alıcının yerleşim yerindeki Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Ayrıca satıcıya yazılı başvuru yapılabilir.

MADDE 12 — YÜRÜRLÜK
Alıcının elektronik ortamda onay vermesi ile sözleşme yürürlüğe girer. Sözleşme sureti alıcının erişimine sunulur ve sipariş kaydıyla saklanır.

Satıcı: ${SELLER.name}`,
  },
  "on-bilgilendirme": {
    title: "Ön Bilgilendirme Formu",
    content: `6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği gereği, siparişinizden önce aşağıdaki bilgilendirme sunulmaktadır.

SATICI BİLGİLERİ
${SELLER.name}
${SELLER.address}
Tel: ${SELLER.phone} · E-posta: ${SELLER.email}
Vergi: ${SELLER.taxOffice} / ${SELLER.taxNumber}

ÜRÜNÜN TEMEL NİTELİKLERİ
Sipariş ettiğiniz ürünlerin cinsi, miktarı, öğütüm tercihi, ağırlık/gramaj ve satış bedeli sepet ve ödeme ekranında gösterilir. Kahve ürünleri taze kavrulmuş olup saklama koşullarına uygun ambalajlanır.

TOPLAM BEDEL
Ürün bedeli, varsa indirimler, kargo ücreti ve vergiler ödeme adımında toplam tutar olarak gösterilir. Ödeme tamamlanmadan ek ücret tahsil edilmez.

ÖDEME
Ödeme PayTR güvenli ödeme altyapısı ile kredi/banka kartı üzerinden yapılır.

TESLİMAT
Teslimat seçtiğiniz kargo firması ile sipariş adresinize yapılır. Tahmini hazırlık/kargo süreleri ürün veya ödeme ekranında belirtilir.

CAYMA HAKKI
Teslimden itibaren 14 gün içinde cayma hakkınız vardır; istisnalar Mesafeli Satış Sözleşmesi ve İptal-İade politikasında açıklanmıştır.

ŞİKAYET VE İTİRAZ
${SELLER.email} ve ${SELLER.phone} üzerinden iletebilirsiniz. Tüketici Hakem Heyeti / Tüketici Mahkemeleri yolları açıktır.

Bu formu okuyup onaylayarak bilgilendirildiğinizi kabul etmiş olursunuz.`,
  },
  "iptal-iade": {
    title: "İade Politikası / İptal ve İade Koşulları",
    content: `${SELLER.name} olarak müşteri memnuniyetini ve 6502 sayılı Kanun ile Mesafeli Sözleşmeler Yönetmeliği’ne uyumu esas alırız.

1. Sipariş iptali
Ödeme alınmadan veya ürün kargoya verilmeden önce talebinizi ${SELLER.email} adresine ileterek iptal isteğinde bulunabilirsiniz. Ödeme alınmış ancak henüz hazırlanmamış siparişlerde bedel iadesi başlatılır.

2. Cayma hakkı (14 gün)
Mesafeli satışlarda, ürünü teslim aldığınız tarihten itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkınız vardır. Bildirim: ${SELLER.email} (sipariş no, ad-soyad, iade nedeni varsa).

3. İade edilemeyecek / sınırlı ürünler
- Ambalajı açılmış, hijyen ve sağlık açısından iadesi uygun olmayan kahve ürünleri
- Kişisel talep doğrultusunda özel hazırlanmış ürünler
- Çabuk bozulabilir nitelikte olup uygun saklanmamış ürünler
- Kullanılmış, hasar görmüş veya eksik parçalı ürünler (ayıp halleri hariç)

4. İade gönderimi
Cayma onayından sonra ürünü, orijinal ambalajı bozulmamış ve yeniden satılabilir durumda, fatura/irsaliye ile birlikte satıcının bildirdiği adrese göndermeniz gerekir. Usulüne uygun caymalarda iade kargo bedeli politikamıza göre karşılanır; ayıplı üründe kargo satıcıya aittir.

5. Ücret iadesi
Ürün tarafımıza ulaştıktan ve kontrol edildikten sonra, ödemenin yapıldığı karta/yönteme en geç 14 gün içinde iade edilir. Banka süreçleri nedeniyle kartınıza yansıma süresi bankanıza göre değişebilir.

6. Ayıplı / hasarlı teslimat
Kargo hasarı veya ayıp durumunda teslimatta tutanak tutturunuz ve 48 saat içinde ${SELLER.email} adresine fotoğraf/video ile bildirin. Değişim veya bedel iadesi sağlanır.

7. İletişim
${SELLER.name} · ${SELLER.address}
${SELLER.email} · ${SELLER.phone}`,
  },
  "musteri-memnuniyeti": {
    title: "Müşteri Memnuniyeti Politikası",
    content: `${SELLER.name}, taze kavrulmuş kahve ürünlerinde kalite, şeffaflık ve hızlı destek sunmayı taahhüt eder.

1. İlkelerimiz
- Sipariş ve teslimat süreçlerinde açık bilgilendirme
- Gıda güvenliği ve hijyen standartlarına uygun paketleme
- Taleplere makul sürede dönüş
- Yasal tüketici haklarına tam uyum

2. Destek kanalları
E-posta: ${SELLER.email}
Telefon: ${SELLER.phone}
Çalışma saatleri: Pzt — Cmt / 08:00 — 18:00 (resmi tatiller hariç)

3. Şikayet süreci
1) Talebinizi sipariş numaranızla iletin
2) En geç 3 iş günü içinde ön değerlendirme yanıtı verilir
3) Gerekirse değişim, yeniden gönderim veya bedel iadesi planlanır
4) Sonuç yazılı olarak bildirilir

4. Kalite taahhüdü
Kavrum profili, tazelik ve ambalaj bütünlüğünde sorun yaşarsanız, ayıp hükümleri çerçevesinde ücretsiz çözüm sunarız.

5. Geri bildirim
Ürün ve hizmet iyileştirmeleri için görüşleriniz değerlidir. Memnuniyet anketleri veya e-posta yoluyla ilettiğiniz geri bildirimler KVKK’ya uygun işlenir.

Bu politika, Mesafeli Satış Sözleşmesi ve İade Politikası ile birlikte uygulanır.`,
  },
  "guvenli-alisveris": {
    title: "Güvenli Alışveriş",
    content: `${SELLER.name} internet mağazasında alışverişiniz; teknik, hukuki ve operasyonel güvenlik önlemleriyle korunur.

1. Ödeme güvenliği (PayTR)
Kartlı ödemeler PayTR sanal POS / iFrame altyapısı üzerinden alınır. Kart numarası, CVV ve son kullanma tarihi sitemize iletilmez ve sunucularımızda saklanmaz. İşlemler SSL/TLS ile şifrelenir; bankaların 3D Secure doğrulaması desteklenir. PayTR, PCI-DSS uyumlu ödeme kuruluşu olarak faaliyet gösterir.

2. Site güvenliği
Yönetim paneli ve müşteri hesapları kimlik doğrulama ile korunur. Şüpheli oturum ve ödeme denemelerinde ek kontroller uygulanabilir.

3. Kişisel verilerin korunması
Sipariş, teslimat ve fatura için zorunlu veriler KVKK kapsamında işlenir. Ayrıntılar için Gizlilik Politikası, KVKK ve Aydınlatma Metni’ni inceleyiniz.

4. Dolandırıcılık önleme
Anormal sipariş, adres veya ödeme davranışlarında sipariş geçici olarak beklemeye alınabilir; doğrulama için sizinle iletişime geçilebilir.

5. Fatura ve kayıt
Sipariş ve ödeme kayıtları yasal saklama süreleriyle muhafaza edilir. Sipariş özeti e-posta ile iletilir.

6. Güvenli alışveriş ipuçları
- Yalnızca resmi domain üzerinden alışveriş yapın
- Ortak bilgisayarlarda “beni hatırla” kullanmayın
- Ödeme ekranında adres çubuğunun kilit/https olduğundan emin olun
- Kart bilgilerinizi e-posta veya telefonla paylaşmayın (biz de bunu asla istemeyiz)

7. Destek
Güvenlik şüphesi halinde derhal ${SELLER.email} adresine yazın.

Ödeme altyapısı: PayTR · Desteklenen kart programları arasında Advantage, Axess, Bankkart, Bonus, CardFinans, Maximum, Paraf, World ve diğer banka kartları yer alır (bankanızın taksit/kampanya kuralları saklıdır).`,
  },
  "aydinlatma-metni": {
    title: "Aydınlatma Metni",
    content: `6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) m.10 uyarınca ${SELLER.name} (“Veri Sorumlusu”) olarak kişisel verilerinizin işlenmesine ilişkin bilgilendirme:

1. Veri sorumlusu
${SELLER.name}
${SELLER.address}
${SELLER.email} · ${SELLER.phone}

2. İşlenen veriler
Kimlik (ad-soyad), iletişim (e-posta, telefon, adres), sipariş/ödeme işlem bilgileri, işlem güvenliği kayıtları, çerez kayıtları (rızaya bağlı olanlar ayrı).

3. Amaçlar
Siparişin oluşturulması ve ifası, ödeme, faturalama, kargo, müşteri desteği, yasal yükümlülükler, bilgilendirme (ticari ileti için ayrı rıza), güvenlik ve dolandırıcılık önleme.

4. Hukuki sebepler
KVKK m.5/2: sözleşmenin kurulması/ifası, hukuki yükümlülük, meşru menfaat; rıza gerektiren işlemlerde açık rıza.

5. Aktarım
Kargo firmaları, ödeme kuruluşu (PayTR), e-posta/SMS sağlayıcıları, barındırma/BT hizmetleri ve yetkili kamu kurumları — amaçla sınırlı olarak.

6. Saklama
Mevzuattaki saklama süreleri ve işleme amaçlarının gerektirdiği süre boyunca; sonrasında silme, yok etme veya anonimleştirme.

7. Haklarınız (KVKK m.11)
Erişim, düzeltme, silme/yok etme, işlemeyi kısıtlama, aktarılan üçüncü kişileri öğrenme, itiraz, zararın giderilmesini talep. Başvuru: ${SELLER.email}

8. Başvuru süresi
Başvurularınız en geç 30 gün içinde sonuçlandırılır.`,
  },
  gizlilik: {
    title: "Gizlilik Politikası",
    content: `${SELLER.name} olarak gizliliğinize saygı duyarız. Bu politika; sitemizi ziyaret eden, üye olan veya sipariş veren kişilerin verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.

1. Topladığımız bilgiler
Hesap ve sipariş için verdiğiniz kimlik/iletişim bilgileri, teslimat adresi, sipariş içeriği, ödeme işlem sonuçları (kart detayları hariç), teknik loglar ve çerez verileri.

2. Kullanım amaçları
Hizmet sunumu, sipariş ve destek, yasal yükümlülükler, güvenlik, (rıza varsa) pazarlama iletişimi, site iyileştirme.

3. Paylaşım
Yalnızca hizmetin ifası için gerekli iş ortaklarıyla (ödeme: PayTR, kargo, iletişim altyapısı) ve yasal zorunluluk halinde yetkili mercilerle paylaşılır. Verilerinizi satmayız.

4. Güvenlik
SSL, erişim kontrolü ve ödeme süreçlerinin PCI-DSS uyumlu sağlayıcıda yürütülmesi gibi teknik/idari tedbirler uygulanır.

5. Çocuklar
Site, 18 yaş altı çocuklara yönelik değildir.

6. Değişiklikler
Politika güncellemeleri bu sayfada yayınlanır.

7. İletişim
${SELLER.email} · ${SELLER.phone}
${SELLER.address}

KVKK aydınlatma metni ve çerez politikası bu belgenin ayrılmaz parçasıdır.`,
  },
};
