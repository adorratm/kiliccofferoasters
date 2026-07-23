import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kısmi iade tutarı + flash kampanyalar tablosu.
 */
export class CampaignsAndRefundAmount1778000000000
  implements MigrationInterface
{
  name = 'CampaignsAndRefundAmount1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "return_requests"
      ADD COLUMN IF NOT EXISTS "refund_amount" numeric(12,2) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar(160) NOT NULL,
        "slug" varchar(160) NOT NULL UNIQUE,
        "discount_percent" numeric(5,2) NOT NULL,
        "product_ids" jsonb NOT NULL DEFAULT '[]',
        "starts_at" TIMESTAMPTZ NULL,
        "ends_at" TIMESTAMPTZ NULL,
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`);
    await queryRunner.query(`
      ALTER TABLE "return_requests" DROP COLUMN IF EXISTS "refund_amount"
    `);
  }
}
