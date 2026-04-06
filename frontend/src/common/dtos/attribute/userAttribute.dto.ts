export interface UserAttributeDto {
  userId: string;
  attributeId: string;
  attributeVersion?: string;
  attributeType?: string;
}

export interface UserAttributesDto {
  userId: string;
  attributeId: string;
}

export interface UserAttributeEntity<V, A> {
  userId: string;
  attributeId?: string;
  version?: string;
  value?: V;
  actions?: A;
  createdAt?: string;
  type?: string;
  projectAttributeId?: string;
  projectTitle?: string;
  isPublished?: boolean;
  method?: string;
  batchEditId?: string | null;
  editVersionNumber?: number;
}

export interface UpdateFavoriteAttributeDto {
  attributeId: string;
  version: string;
}

export interface UpdateBookmarkAttributeDto {
  attributeId: string;
  version: string;
}

