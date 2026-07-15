# Yerel kurulum

## Önkoşullar

- [Volta](https://volta.sh) ile Node.js ve Yarn (kök `package.json` pin’leri)
- Docker (PostgreSQL için önerilir)

## Adımlar

1. Bağımlılıklar

```bash
cd kiliccofferoasters
yarn install
cp .env.example .env
```

2. PostgreSQL

```bash
docker compose up -d postgres
```

3. Şema

Geliştirmede API ayağa kalkınca TypeORM `synchronize` entity’leri oluşturur.

Production tarzı migration:

```bash
yarn migration:run
```

4. Seed verisi

```bash
yarn workspace @kilic/api seed
```

Seed içeriği: admin allowlist (`emrekilic19983@gmail.com`), örnek ürünler, yasal belge taslakları, kargo provider kayıtları.

5. Servisleri başlat (ayrı terminaller)

```bash
yarn dev:api
yarn dev:frontend
yarn dev:admin
```

## Portlar

- API: 4000 — Swagger `/docs`
- Frontend: 3000
- Admin: 3001
- Postgres: 5432

## Alias kontrolü

Yeni dosyalarda `from '../...'` kullanmayın. IDE path mapping: her paketin kendi `tsconfig.json` dosyasında tanımlıdır.

## Smoke

Özellikleri hızlı doğrulamak için: [smoke-checklist.md](smoke-checklist.md).
