import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogService } from '@modules/blog/blog.service';
import {
  BlogQueryDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
} from '@modules/blog/dto/blog.dto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@entities/user.entity';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Yayımlanmış blog yazıları (sayfalı)' })
  listPublic(@Query() query: BlogQueryDto) {
    return this.blogService.query({ ...query, includeDrafts: false });
  }

  @Public()
  @Get('slugs')
  @ApiOperation({ summary: 'Sitemap için yayımlanmış slug listesi' })
  listSlugs() {
    return this.blogService.listPublishedSlugs();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: tüm blog yazıları' })
  listAdmin(@Query() query: BlogQueryDto) {
    return this.blogService.query({ ...query, includeDrafts: true });
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: yazı detayı' })
  getAdmin(@Param('id') id: string) {
    return this.blogService.getById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: blog yazısı oluştur' })
  create(@Body() dto: CreateBlogPostDto) {
    return this.blogService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: blog yazısı güncelle' })
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: blog yazısı sil' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Yayımlanmış blog yazısı (slug)' })
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.getBySlug(slug, false);
  }
}
