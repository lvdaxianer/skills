/**
 * 定义控制平面使用的稳定常量。
 *
 * @author lvdaxianer@yeah.net
 */
export const SERVICE_NAME = 'product-control-plane';
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 43127;
export const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
export const HTTP_OK = 200;
export const HTTP_NOT_FOUND = 404;
export const HTTP_SERVICE_UNAVAILABLE = 503;
export const ERROR_ROUTE_NOT_FOUND = 'CONTROL_PLANE_ROUTE_NOT_FOUND';
export const ERROR_NOT_READY = 'CONTROL_PLANE_NOT_READY';
