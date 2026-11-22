import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';

describe('FilmsController', () => {
  it('delegates the film list request to the service', async () => {
    const service = {
      getFilms: jest.fn().mockResolvedValue({ total: 0, items: [] }),
    };
    const controller = new FilmsController(service as unknown as FilmsService);

    await expect(controller.getFilms()).resolves.toEqual({
      total: 0,
      items: [],
    });
    expect(service.getFilms).toHaveBeenCalledTimes(1);
  });

  it('passes the film id to the schedule service method', async () => {
    const response = { total: 1, items: [{ id: 'session-id' }] };
    const service = { getSchedule: jest.fn().mockResolvedValue(response) };
    const controller = new FilmsController(service as unknown as FilmsService);

    await expect(controller.getSchedule('film-id')).resolves.toBe(response);
    expect(service.getSchedule).toHaveBeenCalledWith('film-id');
  });
});
