export function getBackendIp() {
  return process.env.BACKEND_IP ?? "127.0.0.1";
}

export function getBackendPort() {
  return 3000;
}
