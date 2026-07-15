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

---

## 2. Katalog & arama (mağaza)

- [ ] `/urunler` listeleniyor; filtre / sıralama / sayfa çalışıyor
- [ ] Header arama (`Ctrl+K`) ürün veya blog sonucu veriyor
- [ ] Anlamsız arama → “bulunamadı” + öneri ürünler (demo ürün basılmıyor)
- [ ] Ürün detayda varyant / stok seçimi görünüyor

---

## 3. Sepet & checkout

- [ ] Ürün sepete ekleniyor; yenilemede sepet kalıyor
- [ ] Yetersiz stokta checkout engelleniyor (anlamlı hata)
- [ ] Sipariş oluşturuluyor (`pending_payment`); sepet henüz silinmiyor
- [ ] iyzico sandbox ödeme success → sipariş `paid`, sepet temizleniyor, stok düşüyor
- [ ] Ödeme başarısız / vazgeç → sepet duruyor, stok düşmüyor
- [ ] Giriş sonrası session sepeti kullanıcı sepetine birleşiyor

---

## 4. Sipariş & kargo (müşteri)

- [ ] Hesap siparişleri / sipariş detay açılıyor
- [ ] Misafir: `/siparis-sorgula` + e-posta + sipariş no ile kayıt bulunuyor
- [ ] Admin’den kargo tracking girilince müşteri timeline’da görünüyor

---

## 5. Admin panel

- [ ] Dashboard bugünkü ciro / özet tutuluyor (boş fallback çökmesin)
- [ ] Global arama (`Ctrl+K`) → ürün / sipariş / mesaj deep-link
- [ ] Sipariş listesi: kaynak sütunu, `?q=` filtre, detay adres/ödeme okunaklı
- [ ] Ürün kaydı: kategori atanabiliyor
- [ ] Durum `cancelled` veya `refunded` → stok geri geliyor (`stock_decremented` false)
- [ ] Blog oluştur / yayınla → mağazada `/blog/[slug]` görünür

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
