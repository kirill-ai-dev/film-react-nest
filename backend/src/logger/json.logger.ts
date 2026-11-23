import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

@Injectable()
export class JsonLogger implements LoggerService {
  formatMessage(level: LogLevel, message: unknown, context?: string): string {
    return JSON.stringify({
      level,
      message: this.serialize(message),
      ...(context ? { context } : {}),
    });
  }

  log(message: unknown, context?: string): void {
    console.log(this.formatMessage('log', message, context));
  }

  error(message: unknown, trace?: string, context?: string): void {
    console.error(
      this.formatMessage(
        'error',
        { message, ...(trace ? { trace } : {}) },
        context,
      ),
    );
  }

  warn(message: unknown, context?: string): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: unknown, context?: string): void {
    console.debug(this.formatMessage('debug', message, context));
  }

  verbose(message: unknown, context?: string): void {
    console.info(this.formatMessage('verbose', message, context));
  }

  fatal(message: unknown, context?: string): void {
    console.error(this.formatMessage('fatal', message, context));
  }

  private serialize(value: unknown): unknown {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  }
}
