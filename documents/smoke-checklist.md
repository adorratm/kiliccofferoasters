# Smoke kontrol listesi

Canlı veya staging öncesi hızlı sağlık kontrolü. Her madde için beklenen sonuç kısa notla yazılmıştır.

Önkoşul: `yarn dev:api` + `yarn dev:frontend` + `yarn dev:admin` (veya Docker stack), seed çalışmış `.env`.

| Servis | URL |
|--------|-----|
| API / Swagger | http://localhost:4000/docs |
| Mağaza | http://localhost:3000 |
| Admin | http://localhost:3001 |

---

## 0. Boot

- [ ] API ayakta, `/docs` açılıyor
- [ ] Frontend anasayfa yükleniyor (hero + ürünler)
- [ ] Admin `/login` açılıyor
- [ ] Postgres + Redis erişilebilir (kuyruk / sync hataları logda yok)

---

## 1. Auth

- [ ] Müşteri Google OAuth (frontend) → sepet/session korunuyor
- [ ] Admin Google OAuth → allowlist dışı hesap `/login?error=...` ile dönüyor
- [ ] Admin allowlist hesap paneli açıyor
- [ ] `/sifremi-unuttum` → mail (SMTP yoksa konsol) + `/sifre-sifirla?token=` ile yeni şifre
- [ ] Google-only hesap: Hesabım → **Şifre belirle** (mevcut şifre istemeden)
- [ ] Yerel şifreli hesap: Hesabım → **Şifre değiştir** (mevcut şifre zorunlu)

---

## 2. Katalog & arama (mağaza)

- [ ] `/urunler` listeleniyor; filtre / sıralama / sayfa çalışıyor
- [ ] Header arama (`Ctrl+K`) ürün veya blog sonucu veriyor
- [ ] Anlamsız arama → “bulunamadı” + öneri ürünler (demo ürün basılmıyor)
- [ ] Ürün detayda varyant / stok seçimi görünüyor
- [ ] Aktif kampanya varsa satış fiyatı + üstü çizili eski fiyat görünüyor

---

## 3. Sepet & checkout

- [ ] Ürün sepete ekleniyor; yenilemede sepet kalıyor
- [ ] Misafir sepetinde e-posta kaydı → terk edilen sepet maili için kullanılır
- [ ] Yetersiz stokta checkout engelleniyor (anlamlı hata)
- [ ] Sipariş oluşturuluyor (`pending_payment`); sepet henüz silinmiyor
- [ ] PayTR / iyzico ödeme success → sipariş `paid`, sepet temizleniyor, stok düşüyor
- [ ] Ödeme başarısız / vazgeç → sepet duruyor, stok düşmüyor
- [ ] Giriş sonrası session sepeti kullanıcı sepetine birleşiyor
- [ ] Terk edilen sepet: 1. hatırlatma (`ABANDONED_CART_HOURS`) + 2. hatırlatma (`ABANDONED_CART_SECOND_HOURS`)

---

## 4. Sipariş & kargo (müşteri)

- [ ] Hesap siparişleri / sipariş detay açılıyor
- [ ] Sipariş detaydan iptal (kargo öncesi) veya iade/cayma talebi açılıyor
- [ ] Misafir: `/siparis-sorgula` + e-posta + sipariş no ile kayıt bulunuyor
- [ ] Admin’den kargo tracking girilince müşteri timeline’da görünüyor

---

## 5. Admin panel

- [ ] Dashboard bugünkü ciro / özet tutuluyor (boş fallback çökmesin)
- [ ] Global arama (`Ctrl+K`) → ürün / sipariş / mesaj deep-link
- [ ] Sipariş listesi: kaynak sütunu, `?q=` filtre, detay adres/ödeme okunaklı
- [ ] **İade Talepleri** (`/iadeler`): onay/red; kısmi iade tutarı; PayTR iade (keys varsa)
- [ ] Ürün kaydı: kategori atanabiliyor
- [ ] **Kampanyalar** (`/kampanyalar`): % indirim + ürün ID / tüm katalog
- [ ] Durum `cancelled` veya `refunded` → stok geri geliyor (`stock_decremented` false)
- [ ] Blog oluştur / yayınla → mağazada `/blog/[slug]` görünür
- [ ] Prod’da credentials yokken kargo oluştur → hata (`SHIPPING_ALLOW_MOCK` kapalı)

---

## 5b. Çerez & analitik

- [ ] Banner: yalnızca gerekli / özelleştir / tümünü kabul
- [ ] Analytics onayı sonrası GA4 veya GTM yüklenir
- [ ] Marketing onayı sonrası Meta Pixel yüklenir
- [ ] Ürün detay → ViewContent; sepete ekle → AddToCart; ödeme → BeginCheckout; başarı → Purchase (girişliyse tutar dolu)

---

## 6. Pazaryeri

Hesap credentials dolu ve `is_enabled` ise:

- [ ] Hesap sync (dry-run) → adaptör yanıtı / hata mesajı anlamlı
- [ ] Gerçek sync → `marketplace_orders` doluyor
- [ ] Yeni sipariş otomatik iç `Order` oluyor (`internal_order_id`)
- [ ] Aktarılmamış siparişte **İçe aktar** / **Bekleyenleri aktar** çalışıyor
- [ ] Pazaryeri iptal sync → iç sipariş `cancelled` + stok iade
- [ ] Pazaryeri siparişinde “kargo oluştur” gizleniyor / kullanılmıyor

Detay: [marketplace-adapters.md](marketplace-adapters.md)

---

## 7. Stok & düşük stok

- [ ] Ödeme sonrası stok düşüşü ürün/varyantta doğru
- [ ] İptal/iade sonrası stok iadesi (çift iade yok)
- [ ] Eşik altı stokta low-stock e-posta/kuyruk tetikleniyor (`LOW_STOCK_*` ayarlıysa)

Mevcut aktif siparişlerde bayrak yoksa bir kez:

```sql
UPDATE orders SET stock_decremented = true
WHERE status IN ('paid','processing','shipped','delivered');
```

---

## 8. SEO & yasal (mağaza)

- [ ] `/sitemap.xml` ve `/robots.txt` anlamlı
- [ ] Ürün / blog sayfasında title + OG
- [ ] Hesap / ödeme gibi özel sayfalar `noindex`
- [ ] Yasal sayfalar (`/kvkk` vb.) yayınlı belgeden geliyor

---

## 9. Hızlı regresyon (sık kırılanlar)

- [ ] Sepet kalem güncellemesinde diğer kalemler silinmiyor
- [ ] Admin kargo ayarı PATCH (provider kodu / UUID karışmasın)
- [ ] Cart fetch hata verince sessizce boş sepet gibi davranmıyor (logout hariç)
- [ ] iyzico sepet toplamı sipariş total ile uyumlu

---

## Sonuç kaydı

| Tarih | Ortam | Yapan | Not |
|-------|--------|-------|-----|
| | local / staging / prod | | |

Başarısız madde varsa issue/PR’a bağla; pazaryeri ve ödeme için ayrıntılı log + `conversationId` / `externalOrderId` ekle.

---

## Kod doğrulama notları (statik)

Son tarama: çoğu madde kodda mevcut. Canlı credential gerektirenler (OAuth, iyzico sandbox, pazaryeri API, Resend) SKIP.

Kalan riskler:

1. Admin sipariş **kaynak** chip’i yalnızca mevcut sayfada client-side filtreler (API `source` param yok)
2. Eski siparişlerde `stock_decremented` backfill SQL’si uygulanmamış olabilir
3. OAuth `next` yalnızca `sessionStorage` — yeni sekmede kaybolabilir

Düzeltildi (kod): header sepet badge hata → sessiz 0 yok; filtreli boş aramada demo öneri yok; `/siparis-sorgula` `noindex`.
