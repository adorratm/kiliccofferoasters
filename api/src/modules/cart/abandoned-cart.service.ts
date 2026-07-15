import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan } from 'typeorm';
import { Cart } from '@entities/cart.entity';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async processDueCarts(): Promise<number> {
    const hours = Number(this.config.get<number>('abandonedCart.hours') ?? 4);
    const cutoff = new Date(Date.now() - Math.max(1, hours) * 60 * 60 * 1000);

    const carts = await this.em.find(Cart, {
      where: {
        abandonedReminderAt: IsNull(),
        updatedAt: LessThan(cutoff),
      },
      relations: { user: true, items: true },
      take: 50,
    });

    let sent = 0;
    for (const cart of carts) {
      if (!cart.items?.length) continue;
      const email = cart.user?.email;
      if (!email) continue;

      const name = [cart.user?.firstName, cart.user?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      await this.notifications.enqueueAbandonedCart({
        cartId: cart.id,
        email,
        name: name || null,
        itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
      });

      cart.abandonedReminderAt = new Date();
      await this.em.save(cart);
      sent += 1;
    }

    if (sent) {
      this.logger.log(`Queued ${sent} abandoned cart reminders`);
    }
    return sent;
  }
}
