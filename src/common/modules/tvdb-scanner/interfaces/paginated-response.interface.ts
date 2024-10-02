import { TVDBResponse } from './tvdb-response.interface';

export interface PaginatedResponse<T> extends TVDBResponse<T> {
  links: Links;
}

export interface Links {
  prev?: string | null;
  self?: string | null;
  next?: string;
  total_items?: number;
  page_size?: number;
}
