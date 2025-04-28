/** @module util/network */

/**
 * Get the configured IPv4 address of the server.
 *
 * @returns {string} the IPv4 address.
 */
export function getBackendIp() {
  return process.env.BACKEND_IP ?? "127.0.0.1";
}

/**
 * Get the server port, which is port 3000.
 *
 * @returns {number} the port.
 */
export function getBackendPort() {
  return 3000;
}
