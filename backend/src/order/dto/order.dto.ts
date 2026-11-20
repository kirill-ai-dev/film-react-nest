import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Билет, который пользователь хочет заказать. */
export class OrderTicketDto {
  /** Идентификатор фильма. */
  @IsUUID()
  film: string;

  /** Идентификатор сеанса. */
  @IsUUID()
  session: string;

  /** Дата и время сеанса. */
  @IsOptional()
  @IsISO8601()
  daytime?: string;

  /** Номер ряда. */
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  row: number;

  /** Номер места. */
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  seat: number;

  /** Цена от клиента необязательна: сервер использует цену сеанса из БД. */
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  price?: number;
}

/** Данные заказа, которые прислал пользователь. */
export class OrderDto {
  /** Электронная почта покупателя. */
  @IsEmail()
  email: string;

  /** Телефон покупателя. */
  @IsString()
  @IsNotEmpty()
  phone: string;

  /** Билеты в заказе. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderTicketDto)
  tickets: OrderTicketDto[];
}

/** Билет после создания заказа. */
export class OrderResultTicketDto extends OrderTicketDto {
  /** Идентификатор созданного билета. */
  id: string;

  /** Подтверждённая цена сеанса из БД. */
  price: number;

  /** Дата и время сеанса из БД. */
  daytime: string;
}

/** Результат оформления заказа. */
export class OrderResponseDto {
  /** Количество оформленных билетов. */
  total: number;

  /** Оформленные билеты. */
  items: OrderResultTicketDto[];
}
