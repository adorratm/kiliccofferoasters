import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sipariş bazlı stok düşüm bayrağı + mevcut aktif siparişleri işaretle.
 */
export class AddOrderStockDecremented1774000000000
  implements MigrationInterface
{
  name = 'AddOrderStockDecremented1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "stock_decremented" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "stock_decremented" = true
      WHERE "status" IN ('paid', 'processing', 'shipped', 'delivered')
        AND "stock_decremented" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "stock_decremented"
    `);
  }
}
