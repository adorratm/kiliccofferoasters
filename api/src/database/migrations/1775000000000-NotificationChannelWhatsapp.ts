import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * notification_logs.channel enum'una whatsapp ekler.
 */
export class NotificationChannelWhatsapp1775000000000
  implements MigrationInterface
{
  name = 'NotificationChannelWhatsapp1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "notification_logs_channel_enum" ADD VALUE IF NOT EXISTS 'whatsapp';
      EXCEPTION
        WHEN undefined_object THEN
          -- enum adı farklıysa varchar kullanılıyor olabilir
          NULL;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PG enum değerleri güvenli şekilde geri alınamaz
  }
}
