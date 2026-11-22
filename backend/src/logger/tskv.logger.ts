import { Injectable, LoggerService } from '@nestjs/common';

type TskvValue = string | number | boolean | null | undefined;

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

@Injectable()
export class TskvLogger implements LoggerService {
  formatMessage(level: LogLevel, message: unknown, context?: string): string {
    const fields: Record<string, TskvValue> = {
      level,
      message: this.toText(message),
      ...(context ? { context } : {}),
    };

    return Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) => `${this.escape(key)}=${this.escape(String(value))}`,
      )
      .join('\t');
  }

  log(message: unknown, context?: string): void {
    console.log(this.formatMessage('log', message, context));
  }

  error(message: unknown, trace?: string, context?: string): void {
    const text = trace ? `${this.toText(message)}\n${trace}` : message;
    console.error(this.formatMessage('error', text, context));
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

  private toText(value: unknown): string {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private escape(value: string): string {
    return value
      .replaceAll('\\', '\\\\')
      .replaceAll('\t', '\\t')
      .replaceAll('\n', '\\n');
  }
}
