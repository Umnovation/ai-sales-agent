export interface ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export interface PaginatedResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly per_page: number;
  readonly has_more: boolean;
}
