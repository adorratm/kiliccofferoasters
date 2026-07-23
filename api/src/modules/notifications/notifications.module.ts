import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NOTIFICATIONS } from '@modules/queues/queue.constants';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationsController } from '@modules/notifications/notifications.controller';
import { EmailProvider } from '@modules/notifications/providers/email.provider';
import {
  ConsoleWhatsAppProvider,
  MetaWhatsAppProvider,
  WhatsAppProviderRouter,
} from '@modules/notifications/providers/whatsapp.provider';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NOTIFICATIONS })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailProvider,
    ConsoleWhatsAppProvider,
    MetaWhatsAppProvider,
    WhatsAppProviderRouter,
  ],
  exports: [NotificationsService, BullModule],
})
export class NotificationsModule {}
