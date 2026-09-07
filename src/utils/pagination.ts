// src/utils/pagination.ts
//
// Normalise les réponses paginées de l'API vers une forme unique et fiable,
// quel que soit le format réellement renvoyé par le backend :
//
//   1. Pagination "à plat"   : { data, total, current_page, last_page, per_page, from, to }
//   2. Resource Collection   : { data, links, meta: { total, current_page, ... } }
//      (c'est la forme que renvoie Laravel quand un contrôleur fait
//       `MonResource::collection($paginator)` — ex. ProjectController@index)
//   3. Tableau simple        : T[] (endpoint non paginé)
//
// Utiliser ce helper évite de supposer à tort la forme #1 alors que le
// backend renvoie la forme #2 — ce qui fait silencieusement retomber
// `total`/`last_page` à `undefined` et afficher "0 projet" ou masquer la
// pagination, sans erreur visible.

export interface NormalizedPage<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
}

interface FlatPagination<T> {
  data: T[];
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number;
  from?: number;
  to?: number;
}

interface ResourceCollectionPagination<T> {
  data: T[];
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
    from?: number;
    to?: number;
  };
}

export function normalizePagination<T>(
  payload: T[] | FlatPagination<T> | ResourceCollectionPagination<T> | null | undefined
): NormalizedPage<T> {
  if (!payload) {
    return { data: [], total: 0, current_page: 1, last_page: 1, per_page: 0, from: 0, to: 0 };
  }

  if (Array.isArray(payload)) {
    return { data: payload, total: payload.length, current_page: 1, last_page: 1, per_page: payload.length, from: payload.length ? 1 : 0, to: payload.length };
  }

  const meta = (payload as ResourceCollectionPagination<T>).meta;
  const flat = payload as FlatPagination<T>;

  const total        = meta?.total        ?? flat.total        ?? payload.data?.length ?? 0;
  const current_page = meta?.current_page ?? flat.current_page ?? 1;
  const last_page     = meta?.last_page    ?? flat.last_page    ?? 1;
  const per_page      = meta?.per_page     ?? flat.per_page     ?? payload.data?.length ?? 0;
  const from          = meta?.from         ?? flat.from         ?? (payload.data?.length ? 1 : 0);
  const to            = meta?.to           ?? flat.to           ?? payload.data?.length ?? 0;

  return { data: payload.data ?? [], total, current_page, last_page, per_page, from, to };
}