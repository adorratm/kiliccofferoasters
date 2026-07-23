import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Şifre sıfırlama alanları + iade/iptal talep tablosu.
 */
export class PasswordResetAndReturnRequests1776000000000
  implements MigrationInterface
{
  name = 'PasswordResetAndReturnRequests1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "password_reset_token_hash" varchar(128) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "return_requests_type_enum" AS ENUM ('cancel', 'return');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "return_requests_status_enum" AS ENUM (
          'requested', 'approved', 'rejected', 'completed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "return_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "type" "return_requests_type_enum" NOT NULL,
        "status" "return_requests_status_enum" NOT NULL DEFAULT 'requested',
        "reason" text NOT NULL,
        "admin_note" text NULL,
        "reviewed_at" TIMESTAMPTZ NULL,
        "reviewed_by_id" uuid NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_return_requests_order_id"
      ON "return_requests" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_return_requests_status"
      ON "return_requests" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "return_requests"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "return_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "return_requests_type_enum"`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "password_reset_expires_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "password_reset_token_hash"
    `);
  }
}
