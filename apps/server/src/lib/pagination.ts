// Shared offset/limit pagination helpers so every list endpoint parses and reports
// pagination the same way. Callers pass `?limit=25&offset=50`; response bodies get a
// `pagination` object alongside the array so clients can render "Load more" controls.

import type { Context } from "hono";

export type PaginationParams = { limit: number; offset: number };

export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export function parsePagination(c: Context, defaultLimit = 25, maxLimit = 100): PaginationParams {
  const limitRaw = Number(c.req.query("limit"));
  const offsetRaw = Number(c.req.query("offset"));

  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), maxLimit) : defaultLimit;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;

  return { limit, offset };
}

export function paginationMeta(total: number, { limit, offset }: PaginationParams): PaginationMeta {
  return { total, limit, offset, hasMore: offset + limit < total };
}
