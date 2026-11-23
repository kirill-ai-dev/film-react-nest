import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  it('delegates the order payload to the service', async () => {
    const order = {
      email: 'test@example.com',
      phone: '+70000000000',
      tickets: [],
    };
    const response = { total: 0, items: [] };
    const service = { createOrder: jest.fn().mockResolvedValue(response) };
    const controller = new OrderController(service as unknown as OrderService);

    await expect(controller.createOrder(order)).resolves.toBe(response);
    expect(service.createOrder).toHaveBeenCalledWith(order);
  });
});
