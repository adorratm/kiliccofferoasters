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
  GuestOrderLookupDto,
  OrderQueryDto,
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
  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: sipariş durumu güncelle' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
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
