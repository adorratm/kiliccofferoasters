# Pazaryeri adaptörleri

## Platformlar

| Kod | Platform | Stok | Sipariş | Ürün push |
|-----|----------|------|---------|-----------|
| `trendyol` | Trendyol | Gerçek HTTP | Gerçek HTTP | brandId + categoryId ile |
| `hepsiburada` | Hepsiburada | Gerçek HTTP | Gerçek HTTP | Panelden listing + SKU eşle |
| `n11` | N11 | Gerçek HTTP | Gerçek HTTP | categoryId + shipmentTemplate ile |

Credentials yoksa işlemler **mock** döner (simülasyon). Credentials varsa gerçek API çağrılır; hata olursa sync `error` durumuna düşer.

## Credential JSON

### Trendyol
```json
{
  "apiKey": "",
  "apiSecret": "",
  "sellerId": "",
  "storeFrontCode": "TR",
  "brandId": "123",
  "categoryId": "456",
  "cargoCompanyId": "10",
  "vatRate": "20"
}
```
- Stok: `externalListingId` = Trendyol **barcode**
- Stage: `TRENDYOL_API_BASE_URL=https://stageapigw.trendyol.com/integration`

### Hepsiburada
```json
{
  "merchantId": "",
  "username": "",
  "password": ""
}
```
(`apiKey` / `apiSecret` alias olarak username/password yerine kullanılabilir.)  
Listing SKU → `externalSku` veya `externalListingId`.

### N11
```json
{
  "appKey": "",
  "appSecret": "",
  "categoryId": "",
  "shipmentTemplate": "",
  "preparingDay": "3"
}
```
Stok: `stockCode` = `externalSku` / `externalListingId`.

## Sync

Admin “Senkronize” ve otomatik Bull job (`MARKETPLACE_SYNC_*`) aynı adaptörleri kullanır.

| Env | Açıklama |
|-----|----------|
| `MARKETPLACE_SYNC_ENABLED` | Otomatik sync (default true) |
| `MARKETPLACE_SYNC_INTERVAL_MINUTES` | Aralık (min 5) |
| `TRENDYOL_API_BASE_URL` | Trendyol gateway |
| `HEPSIBURADA_LISTING_BASE_URL` | Listing API |
| `HEPSIBURADA_OMS_BASE_URL` | Sipariş API |
| `N11_API_BASE_URL` | N11 API host |
| `N11_INTEGRATOR_NAME` | N11 integrator etiketi |

## Canlıya alma

1. Satıcı panellerinden API anahtarlarını alın  
2. Admin `/pazaryeri` → hesap + `is_enabled`  
3. Mevcut listings için barcode/SKU eşlemesi  
4. Dry-run sync → gerçek sync  
5. Siparişlerin `marketplace_orders` tablosuna düştüğünü kontrol edin  

## İç sipariş import

Sipariş sync sırasında (credentials ile veya mock):

1. `marketplace_orders` kaydı oluşturulur/güncellenir  
2. `MarketplaceOrderImportService` otomatik olarak iç `Order` + `OrderItem` + `Payment` oluşturur  
3. `internal_order_id` bağlanır; ürün eşlemesi listing `externalListingId` / SKU / barcode üzerinden yapılır  
4. Aktif siparişlerde yerel stok düşülür  

Sipariş numarası örneği: `KLC-TY-20260716-0001` (TY / HB / N11).
