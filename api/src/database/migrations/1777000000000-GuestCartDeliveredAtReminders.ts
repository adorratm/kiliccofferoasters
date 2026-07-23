import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Misafir sepet e-postası, 2. abandoned reminder, deliveredAt.
 */
export class GuestCartDeliveredAtReminders1777000000000
  implements MigrationInterface
{
  name = 'GuestCartDeliveredAtReminders1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD COLUMN IF NOT EXISTS "guest_email" varchar(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD COLUMN IF NOT EXISTS "abandoned_reminder2_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "delivered_at" = "updated_at"
      WHERE "status" = 'delivered' AND "delivered_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivered_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "carts" DROP COLUMN IF EXISTS "abandoned_reminder2_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "carts" DROP COLUMN IF EXISTS "guest_email"
    `);
  }
}
