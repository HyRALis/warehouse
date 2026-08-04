export interface CreateCategoryRequest {
  name: string;
  parentId?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  parentId?: string | null;
  vendorId?: string | null;
  createdAt: Date | string;
  children?: CategoryResponse[];
}
