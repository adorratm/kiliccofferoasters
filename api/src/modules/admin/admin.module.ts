import { Module } from '@nestjs/common';
import { AdminController } from '@modules/admin/admin.controller';
import { AdminService } from '@modules/admin/admin.service';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
