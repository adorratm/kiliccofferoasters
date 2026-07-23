import { Module } from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/campaigns.service';
import { CampaignsController } from '@modules/campaigns/campaigns.controller';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
