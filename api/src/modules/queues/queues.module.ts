import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import {
  QUEUE_ABANDONED_CART,
  QUEUE_LOW_STOCK,
  QUEUE_MARKETPLACE_SYNC,
  QUEUE_NOTIFICATIONS,
  QUEUE_SHIPPING_POLL,
} from '@modules/queues/queue.constants';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { NotificationsProcessor } from '@modules/notifications/notifications.processor';
import { ShippingPollProcessor } from '@modules/queues/shipping-poll.processor';
import { ShippingPollScheduler } from '@modules/queues/shipping-poll.scheduler';
import { ShippingModule } from '@modules/shipping/shipping.module';
import { User, UserRole } from '@entities/user.entity';

const BULL_BOARD_COOKIE = 'kilic_bull_board';

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return null;
}

function createBullBoardAuth(
  jwt: JwtService,
  config: ConfigService,
  em: EntityManager,
) {
  const boardPath = config.get<string>('bullBoard.path') || '/admin/queues';

  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const rawQuery = req.query.token;
    let queryToken: string | null = null;
    if (typeof rawQuery === 'string') {
      queryToken = rawQuery;
    } else if (Array.isArray(rawQuery) && typeof rawQuery[0] === 'string') {
      queryToken = rawQuery[0];
    }
    const cookieToken = readCookie(req, BULL_BOARD_COOKIE);
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : queryToken || cookieToken;

    if (!token) {
      res
        .status(401)
        .send(
          'Bull Board: admin JWT gerekli. Admin panelindeki "Bull Board\'u aç" linkini kullanın.',
        );
      return;
    }

    try {
      const payload = await jwt.verifyAsync<{ sub: string }>(token, {
        secret:
          config.get<string>('jwt.secret') || 'change-me-in-production',
      });
      const user = await em.findOne(User, {
        where: { id: payload.sub, isActive: true },
      });
      if (!user || user.role !== UserRole.ADMIN) {
        res.status(403).send('Sadece admin erişebilir');
        return;
      }

      // Bull Board static/API isteklerinde ?token= düşer; cookie ile taşı.
      if (queryToken || header?.startsWith('Bearer ')) {
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `${BULL_BOARD_COOKIE}=${encodeURIComponent(token)}; Path=${boardPath}; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`,
        );
      }
      next();
    } catch {
      res.status(401).send('Geçersiz token');
    }
  };
}

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') || 'change-me-in-production',
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NOTIFICATIONS },
      { name: QUEUE_SHIPPING_POLL },
      { name: QUEUE_ABANDONED_CART },
      { name: QUEUE_MARKETPLACE_SYNC },
      { name: QUEUE_LOW_STOCK },
    ),
    BullBoardModule.forRootAsync({
      imports: [ConfigModule, JwtModule],
      inject: [ConfigService, JwtService, getEntityManagerToken()],
      useFactory: (
        config: ConfigService,
        jwt: JwtService,
        em: EntityManager,
      ) => ({
        route: config.get<string>('bullBoard.path') || '/admin/queues',
        adapter: ExpressAdapter,
        middleware: createBullBoardAuth(jwt, config, em),
      }),
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NOTIFICATIONS,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_SHIPPING_POLL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_ABANDONED_CART,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_MARKETPLACE_SYNC,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_LOW_STOCK,
      adapter: BullMQAdapter,
    }),
    NotificationsModule,
    ShippingModule,
  ],
  providers: [
    NotificationsProcessor,
    ShippingPollProcessor,
    ShippingPollScheduler,
  ],
})
export class QueuesModule {}
