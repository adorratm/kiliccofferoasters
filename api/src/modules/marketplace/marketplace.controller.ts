import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from '@modules/marketplace/marketplace.service';
import { MarketplaceSyncService } from '@modules/marketplace/marketplace-sync.service';
import {
  CreateMarketplaceAccountDto,
  UpdateMarketplaceAccountDto,
  SyncMarketplaceDto,
  PushMarketplaceProductDto,
} from '@modules/marketplace/dto/marketplace.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@entities/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_MARKETPLACE_SYNC } from '@modules/queues/queue.constants';

@ApiTags('marketplace')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly syncService: MarketplaceSyncService,
    @InjectQueue(QUEUE_MARKETPLACE_SYNC) private readonly syncQueue: Queue,
  ) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Admin: pazar yeri hesapları' })
  list() {
    return this.marketplaceService.listAccounts();
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Admin: pazar yeri hesabı oluştur' })
  create(@Body() dto: CreateMarketplaceAccountDto) {
    return this.marketplaceService.createAccount(dto);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Admin: pazar yeri hesabı güncelle' })
  update(@Param('id') id: string, @Body() dto: UpdateMarketplaceAccountDto) {
    return this.marketplaceService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Admin: pazar yeri hesabı sil' })
  remove(@Param('id') id: string) {
    return this.marketplaceService.removeAccount(id);
  }

  @Post('accounts/:id/sync')
  @ApiOperation({ summary: 'Admin: stok/sipariş senkronizasyonu' })
  sync(@Param('id') id: string, @Body() dto: SyncMarketplaceDto) {
    return this.marketplaceService.syncAccount(id, dto);
  }

  @Post('sync-all')
  @ApiOperation({
    summary: 'Admin: tüm aktif hesapları senkronize et (anında veya kuyruk)',
  })
  async syncAll(@Body() dto: SyncMarketplaceDto) {
    if (dto.enqueue) {
      const job = await this.syncQueue.add(
        'sync-enabled-accounts',
        { reason: 'manual', mode: dto.mode || 'all' },
        {
          removeOnComplete: 20,
          removeOnFail: 50,
        },
      );
      return { enqueued: true, jobId: job.id, mode: dto.mode || 'all' };
    }
    return this.syncService.syncAllEnabled({
      mode: dto.mode || 'all',
      dryRun: dto.dryRun === true,
    });
  }

  @Post('accounts/:id/push-product')
  @ApiOperation({ summary: 'Admin: ürünü pazara gönder' })
  pushProduct(
    @Param('id') id: string,
    @Body() dto: PushMarketplaceProductDto,
  ) {
    return this.marketplaceService.pushProduct(id, dto);
  }

  @Get('accounts/:id/listings')
  @ApiOperation({ summary: 'Admin: hesap listingleri' })
  listListings(@Param('id') id: string) {
    return this.marketplaceService.listListings(id);
  }

  @Get('accounts/:id/orders')
  @ApiOperation({ summary: 'Admin: pazaryeri siparişleri' })
  listOrders(@Param('id') id: string) {
    return this.marketplaceService.listOrders(id);
  }
}
