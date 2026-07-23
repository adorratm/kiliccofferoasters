import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from '@modules/orders/orders.service';
import {
  CreateOrderDto,
  CreateReturnRequestDto,
  GuestOrderLookupDto,
  OrderQueryDto,
  ReviewReturnRequestDto,
  UpdateOrderStatusDto,
} from '@modules/orders/dto/orders.dto';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User, UserRole } from '@entities/user.entity';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepetten sipariş oluştur' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.ordersService.createFromCart(dto, user?.id, sessionId);
  }

  @Public()
  @Post('lookup')
  @ApiOperation({ summary: 'Misafir sipariş sorgulama (sipariş no + e-posta)' })
  lookup(@Body() dto: GuestOrderLookupDto) {
    return this.ordersService.lookupGuest(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı siparişleri' })
  myOrders(@CurrentUser() user: User) {
    return this.ordersService.listForUser(user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: sipariş listesi' })
  listAllShort(@Query() query: OrderQueryDto) {
    return this.ordersService.listAllAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: sipariş listesi' })
  listAll(@Query() query: OrderQueryDto) {
    return this.ordersService.listAllAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/return-requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: iade/iptal talepleri' })
  listReturnRequests(@Query('status') status?: string) {
    return this.ordersService.listReturnRequestsAdmin(status);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/return-requests/:requestId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: iade/iptal talebini onayla veya reddet' })
  reviewReturnRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewReturnRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.reviewReturnRequest(requestId, user.id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: sipariş durumu güncelle' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/return-requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'İptal veya iade talebi oluştur' })
  createReturnRequest(
    @Param('id') id: string,
    @Body() dto: CreateReturnRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.createReturnRequest(id, user.id, dto);
  }

  @Get(':id/return-requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sipariş iade/iptal talepleri' })
  listOrderReturnRequests(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.listReturnRequestsForOrder(
      id,
      user.id,
      user.role === UserRole.ADMIN,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sipariş detay' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const order = await this.ordersService.findById(id);
    if (user.role !== UserRole.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('Bu siparişe erişim yok');
    }
    return order;
  }
}
