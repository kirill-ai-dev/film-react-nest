import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FilmsRepository } from '../repository/films.repository';
import {
  OrderDto,
  OrderResponseDto,
  OrderResultTicketDto,
  OrderTicketDto,
} from './dto/order.dto';

/** Проверяет заказ и бронирует места целиком, без частичного сохранения. */
@Injectable()
export class OrderService {
  constructor(private readonly filmsRepository: FilmsRepository) {}

  /**
   * Занимает места выбранных сеансов и возвращает подтверждённые билеты.
   * @param order Контакты покупателя и список выбранных мест.
   */
  async createOrder(order: OrderDto): Promise<OrderResponseDto> {
    this.validateOrder(order);
    if (order.tickets.length === 0) return { total: 0, items: [] };

    // Вложенные Map не смешивают одинаковые номера мест разных фильмов и сеансов.
    const groups = new Map<string, Map<string, OrderTicketDto[]>>();
    for (const ticket of order.tickets) {
      if (!groups.has(ticket.film)) groups.set(ticket.film, new Map());
      const sessions = groups.get(ticket.film);
      if (!sessions.has(ticket.session)) sessions.set(ticket.session, []);
      const tickets = sessions.get(ticket.session);
      if (
        tickets.some(
          (item) => item.row === ticket.row && item.seat === ticket.seat,
        )
      ) {
        throw new BadRequestException({
          error: 'Одно место указано в заказе несколько раз',
        });
      }
      tickets.push(ticket);
    }

    return this.filmsRepository.withTransaction(async (repository) => {
      const results = new Map<OrderTicketDto, OrderResultTicketDto>();
      // Запросы внутри транзакции выполняются последовательно.
      for (const [filmId, sessions] of groups) {
        const film = await repository.findById(filmId);
        if (!film) throw new NotFoundException({ error: 'Фильм не найден' });

        for (const [sessionId, tickets] of sessions) {
          const session = film.schedule.find((item) => item.id === sessionId);
          if (!session)
            throw new NotFoundException({ error: 'Сеанс не найден' });
          const places = tickets.map((ticket) => {
            if (ticket.row > session.rows || ticket.seat > session.seats) {
              throw new BadRequestException({
                error: 'Ряд или место отсутствуют в зале',
              });
            }
            return `${ticket.row}:${ticket.seat}`;
          });
          const reserved = await repository.reserveSeats(
            filmId,
            sessionId,
            places,
          );
          if (!reserved) {
            throw new BadRequestException({
              error: 'Одно или несколько мест уже заняты',
            });
          }
          for (const ticket of tickets) {
            results.set(
              ticket,
              Object.assign(new OrderResultTicketDto(), {
                id: randomUUID(),
                film: filmId,
                session: sessionId,
                row: ticket.row,
                seat: ticket.seat,
                // Цена и время берутся из базы, а не из запроса покупателя.
                price: session.price,
                daytime: session.daytime,
              }),
            );
          }
        }
      }
      const items = order.tickets.map((ticket) => results.get(ticket));
      return { total: items.length, items };
    });
  }

  /** Отсекает неверные данные до обращения к базе; номера начинаются с единицы. */
  private validateOrder(order: OrderDto): void {
    if (
      !order ||
      typeof order.email !== 'string' ||
      !order.email.trim() ||
      typeof order.phone !== 'string' ||
      !order.phone.trim() ||
      !Array.isArray(order.tickets)
    ) {
      throw new BadRequestException({
        error: 'Нужны контакты покупателя и массив билетов',
      });
    }
    for (const ticket of order.tickets) {
      if (
        !ticket ||
        typeof ticket.film !== 'string' ||
        !ticket.film.trim() ||
        typeof ticket.session !== 'string' ||
        !ticket.session.trim() ||
        !Number.isSafeInteger(ticket.row) ||
        ticket.row < 1 ||
        !Number.isSafeInteger(ticket.seat) ||
        ticket.seat < 1
      ) {
        throw new BadRequestException({
          error: 'Неверные идентификаторы, ряд или место',
        });
      }
    }
  }
}
