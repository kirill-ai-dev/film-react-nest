import { JsonLogger } from './json.logger';

describe('JsonLogger', () => {
  it('formats a log record as JSON with level and message', () => {
    const logger = new JsonLogger();
    expect(
      JSON.parse(logger.formatMessage('log', 'started', 'Bootstrap')),
    ).toEqual({
      level: 'log',
      message: 'started',
      context: 'Bootstrap',
    });
  });

  it('serializes errors with message and stack', () => {
    const logger = new JsonLogger();
    const error = new Error('failed');
    const record = JSON.parse(logger.formatMessage('error', error));
    expect(record.message).toMatchObject({ name: 'Error', message: 'failed' });
  });

  it('writes the formatted record to the matching console method', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    new JsonLogger().warn('warning');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"level":"warn"'));
    spy.mockRestore();
  });
});
