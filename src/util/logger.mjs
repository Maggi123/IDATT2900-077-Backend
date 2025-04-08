import { BaseLogger, LogLevel } from "@credo-ts/core";

// Based on @credo-ts/core ConsoleLogger
export class MyLogger extends BaseLogger {
  test(message, data) {
    if (!this.isEnabled(LogLevel.test)) return;
    console.log(
      `TEST: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  trace(message, data) {
    if (!this.isEnabled(LogLevel.trace)) return;
    console.log(
      `TRACE: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  debug(message, data) {
    if (!this.isEnabled(LogLevel.debug)) return;
    console.debug(
      `DEBUG: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  info(message, data) {
    if (!this.isEnabled(LogLevel.info)) return;
    console.info(
      `INFO: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  warn(message, data) {
    if (!this.isEnabled(LogLevel.warn)) return;
    console.warn(
      `WARN: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  error(message, data) {
    if (!this.isEnabled(LogLevel.error)) return;
    console.error(
      `ERROR: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  fatal(message, data) {
    if (!this.isEnabled(LogLevel.fatal)) return;
    console.error(
      `FATAL: ${message}`,
      data ? JSON.stringify(data, this.replaceError, 2) : "",
    );
  }

  replaceError(_, value) {
    if (value instanceof Error) {
      return Object.getOwnPropertyNames(value).reduce(
        (obj, propName) => {
          obj[propName] = value[propName];
          return obj;
        },
        { name: value.name },
      );
    }

    return value;
  }
}
