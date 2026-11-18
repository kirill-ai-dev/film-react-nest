import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OrderDto, OrderResponseDto } from './dto/order.dto';
import { OrderService } from './order.service';

/** Принимает заказы по адресу из задания и по адресу API фронтенда. */
@Controller(['order', 'api/afisha/order'])
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /** Бронирует выбранные места и возвращает подтверждённые билеты. */
  @Post()
  @HttpCode(HttpStatus.OK)
  createOrder(@Body() order: OrderDto): Promise<OrderResponseDto> {
    return this.orderService.createOrder(order);
  }
}
