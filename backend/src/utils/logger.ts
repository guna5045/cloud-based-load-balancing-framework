type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(formatMessage('INFO', message), ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(formatMessage('WARN', message), ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(formatMessage('ERROR', message), ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', message), ...args);
    }
  },
};
