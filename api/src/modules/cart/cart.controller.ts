import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from '@modules/cart/cart.service';
import {
  AddCartItemDto,
  SetGuestEmailDto,
  UpdateCartItemDto,
} from '@modules/cart/dto/cart.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepeti getir' })
  getCart(
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getCart(user?.id, sessionId);
  }

  @Public()
  @Patch('guest-email')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Misafir sepet e-postası (terk edilen sepet)' })
  setGuestEmail(
    @Body() dto: SetGuestEmailDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.setGuestEmail(dto.email, user?.id, sessionId);
  }

  @Public()
  @Post('items')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepete ürün ekle' })
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.addItem(dto, user?.id, sessionId);
  }

  @Public()
  @Patch('items/:itemId')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepet kalemi güncelle' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.updateItem(itemId, dto, user?.id, sessionId);
  }

  @Public()
  @Delete('items/:itemId')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepetten kalem sil' })
  removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.removeItem(itemId, user?.id, sessionId);
  }
}
