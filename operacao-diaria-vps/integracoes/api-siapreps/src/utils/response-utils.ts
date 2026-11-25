export function paginatedResponse<T>(data: T[], total: number, limit: number, offset: number) {
  return {
    data,
    page: {
      limit,
      offset,
      total,
    },
  };
}