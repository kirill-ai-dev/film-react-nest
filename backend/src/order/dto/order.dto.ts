/** Билет, который пользователь хочет заказать. */
export class OrderTicketDto {
  /** Идентификатор фильма. */
  film: string;

  /** Идентификатор сеанса. */
  session: string;

  /** Дата и время сеанса. */
  daytime?: string;

  /** Номер ряда. */
  row: number;

  /** Номер места. */
  seat: number;

  /** Цена от клиента необязательна: сервер использует цену сеанса из БД. */
  price?: number;
}

/** Данные заказа, которые прислал пользователь. */
export class OrderDto {
  /** Электронная почта покупателя. */
  email: string;

  /** Телефон покупателя. */
  phone: string;

  /** Билеты в заказе. */
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
