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
import { CampaignsService } from '@modules/campaigns/campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
} from '@modules/campaigns/dto/campaigns.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@entities/user.entity';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Aktif flash kampanyalar' })
  listActive() {
    return this.campaigns.listActiveNow();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  listAdmin() {
    return this.campaigns.listAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.campaigns.remove(id);
  }
}
