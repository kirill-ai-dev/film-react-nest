import { TskvLogger } from './tskv.logger';

describe('TskvLogger', () => {
  it('formats flat tab-separated key-value fields', () => {
    const logger = new TskvLogger();
    expect(logger.formatMessage('log', 'started', 'Bootstrap')).toBe(
      'level=log\tmessage=started\tcontext=Bootstrap',
    );
  });

  it('escapes tabs and newlines in values', () => {
    const logger = new TskvLogger();
    expect(logger.formatMessage('warn', 'line\nnext\tvalue')).toBe(
      'level=warn\tmessage=line\\nnext\\tvalue',
    );
  });

  it('writes errors to stderr in TSKV format', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    new TskvLogger().error('failed', 'trace');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('level=error\tmessage=failed\\ntrace'),
    );
    spy.mockRestore();
  });
});
