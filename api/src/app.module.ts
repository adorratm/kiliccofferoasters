import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import * as pg from 'pg';
import configuration from '@config/configuration';
import { ALL_ENTITIES } from '@database/entities';
import { JwtAuthGuard, RolesGuard } from '@common/guards/auth.guards';
import { AuthModule } from '@modules/auth/auth.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CartModule } from '@modules/cart/cart.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { ShippingModule } from '@modules/shipping/shipping.module';
import { MarketplaceModule } from '@modules/marketplace/marketplace.module';
import { LegalModule } from '@modules/legal/legal.module';
import { ContactModule } from '@modules/contact/contact.module';
import { HealthModule } from '@modules/health/health.module';
import { StorageModule } from '@modules/storage/storage.module';
import { CmsModule } from '@modules/cms/cms.module';
import { MediaModule } from '@modules/media/media.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { QueuesModule } from '@modules/queues/queues.module';
import { TrackingModule } from '@modules/tracking/tracking.module';
import { AddressesModule } from '@modules/addresses/addresses.module';
import { SearchModule } from '@modules/search/search.module';
import { BlogModule } from '@modules/blog/blog.module';
import { AdminModule } from '@modules/admin/admin.module';
import { CouponsModule } from '@modules/coupons/coupons.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { WishlistModule } from '@modules/wishlist/wishlist.module';

@Module({
  imports: [
    HealthModule,
    AdminModule,
    CouponsModule,
    CampaignsModule,
    ReviewsModule,
    WishlistModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        driver: pg,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: ALL_ENTITIES,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.TYPEORM_LOGGING === 'true',
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url') || 'redis://localhost:6379',
        },
      }),
    }),
    AuthModule,
    CatalogModule,
    CartModule,
    AddressesModule,
    SearchModule,
    TrackingModule,
    NotificationsModule,
    ShippingModule,
    OrdersModule,
    PaymentsModule,
    MarketplaceModule,
    LegalModule,
    BlogModule,
    ContactModule,
    StorageModule,
    CmsModule,
    MediaModule,
    QueuesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
