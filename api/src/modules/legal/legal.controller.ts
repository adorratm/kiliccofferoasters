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
import { LegalService } from '@modules/legal/legal.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  CreateCookieConsentDto,
} from '@modules/legal/dto/legal.dto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@entities/user.entity';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Public()
  @Post('cookie-consent')
  @ApiOperation({ summary: 'Çerez onayı kaydı' })
  cookieConsent(@Body() dto: CreateCookieConsentDto) {
    return this.legalService.createCookieConsent(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: tüm yasal belgeler' })
  listAdmin() {
    return this.legalService.listAllAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Get('documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: tüm yasal belgeler (alias)' })
  listDocumentsAlias() {
    return this.legalService.listAllAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Post('documents/sync-defaults')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: varsayılan yasal metinleri DB’ye senkronize et',
  })
  syncDefaults(@Body() body?: { force?: boolean }) {
    return this.legalService.syncDefaults(Boolean(body?.force));
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/documents/sync-defaults')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: varsayılan yasal metinleri senkronize et (alias)',
  })
  syncDefaultsAlias(@Body() body?: { force?: boolean }) {
    return this.legalService.syncDefaults(Boolean(body?.force));
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yasal belge oluştur' })
  create(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Post('documents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yasal belge oluştur (alias)' })
  createAlias(@Body() dto: CreateLegalDocumentDto) {
    return this.legalService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/documents/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yasal belge güncelle' })
  update(@Param('id') id: string, @Body() dto: UpdateLegalDocumentDto) {
    return this.legalService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('documents/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yasal belge güncelle (alias)' })
  updateAlias(@Param('id') id: string, @Body() dto: UpdateLegalDocumentDto) {
    return this.legalService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete('admin/documents/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yasal belge sil' })
  remove(@Param('id') id: string) {
    return this.legalService.remove(id);
  }

  @Public()
  @Get('documents/:slug')
  @ApiOperation({ summary: 'Yayımlanmış yasal belge (slug)' })
  getBySlug(@Param('slug') slug: string) {
    return this.legalService.getLatestPublished(slug);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Yayımlanmış yasal belge (kısa yol)' })
  getBySlugShort(@Param('slug') slug: string) {
    return this.legalService.getLatestPublished(slug);
  }
}
