import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '@modules/admin/admin.service';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@entities/user.entity';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard istatistikleri' })
  stats(@Query('lowStock') lowStock?: string) {
    const threshold = lowStock ? Number(lowStock) : 10;
    return this.adminService.getStats(
      Number.isFinite(threshold) ? threshold : 10,
    );
  }
}
