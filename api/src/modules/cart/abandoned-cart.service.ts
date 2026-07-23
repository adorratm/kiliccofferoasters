import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan, Not } from 'typeorm';
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
    const first = await this.sendFirstReminders();
    const second = await this.sendSecondReminders();
    const sent = first + second;
    if (sent) {
      this.logger.log(
        `Queued abandoned cart reminders: first=${first} second=${second}`,
      );
    }
    return sent;
  }

  private resolveEmail(cart: Cart): string | null {
    return cart.user?.email || cart.guestEmail || null;
  }

  private resolveName(cart: Cart): string | null {
    const name = [cart.user?.firstName, cart.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || null;
  }

  private async sendFirstReminders(): Promise<number> {
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
      const email = this.resolveEmail(cart);
      if (!email) continue;

      await this.notifications.enqueueAbandonedCart({
        cartId: cart.id,
        email,
        name: this.resolveName(cart),
        itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
        reminder: 1,
      });

      cart.abandonedReminderAt = new Date();
      await this.em.save(cart);
      sent += 1;
    }
    return sent;
  }

  private async sendSecondReminders(): Promise<number> {
    const secondHours = Number(
      this.config.get<number>('abandonedCart.secondHours') ?? 24,
    );
    const cutoff = new Date(
      Date.now() - Math.max(1, secondHours) * 60 * 60 * 1000,
    );

    const carts = await this.em.find(Cart, {
      where: {
        abandonedReminderAt: Not(IsNull()),
        abandonedReminder2At: IsNull(),
      },
      relations: { user: true, items: true },
      take: 50,
    });

    let sent = 0;
    for (const cart of carts) {
      if (!cart.items?.length) continue;
      if (
        !cart.abandonedReminderAt ||
        cart.abandonedReminderAt.getTime() > cutoff.getTime()
      ) {
        continue;
      }

      const email = this.resolveEmail(cart);
      if (!email) continue;

      await this.notifications.enqueueAbandonedCart({
        cartId: cart.id,
        email,
        name: this.resolveName(cart),
        itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
        reminder: 2,
      });

      cart.abandonedReminder2At = new Date();
      await this.em.save(cart);
      sent += 1;
    }
    return sent;
  }
}
