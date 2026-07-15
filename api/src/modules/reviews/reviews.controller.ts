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
import { ReviewsService } from '@modules/reviews/reviews.service';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ModerateReviewDto,
} from '@modules/reviews/dto/reviews.dto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User, UserRole } from '@entities/user.entity';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:slug')
  @ApiOperation({ summary: 'Ürün yorumları (onaylı)' })
  listPublic(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.listPublicBySlug(
      slug,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yorum yaz (giriş gerekli, moderasyon bekler)' })
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user, dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  listAdmin(@Query() query: ListReviewsQueryDto) {
    return this.reviewsService.listAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/moderate')
  @ApiBearerAuth()
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
