import { BaseLogger, LogLevel } from "@credo-ts/core";

/** @module util/logger */

/**
 * @class
 * @classDesc A logger that prints to console.
 *            Based on @credo-ts/core ConsoleLogger.
 * @augments {BaseLogger}
 */
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

  /*
   Copyright 2020-present Hyperledger Contributors.
   Copyright 2021 Queen’s Printer for Ontario. Mostafa Youssef (https://github.com/MosCD3), Amit Padmani (https://github.com/nbAmit), Prasad Katkar (https://github.com/NB-PrasadKatkar), Mike Richardson (https://github.com/NB-MikeRichardson)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
   */
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
