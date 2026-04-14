-- Performance indexes for getImages query optimization
CREATE INDEX CONCURRENTLY "AttributeVersion_id_version_isActive_isPublished_idx" ON "AttributeVersion"("id", "version", "isActive", "isPublished");
CREATE INDEX CONCURRENTLY "Attribute_jobId_idx" ON "Attribute"("jobId");
CREATE INDEX CONCURRENTLY "Attribute_batchEditId_idx" ON "Attribute"("batchEditId");
CREATE INDEX CONCURRENTLY "Attribute_type_id_version_idx" ON "Attribute"("type", "id", "version");
CREATE INDEX CONCURRENTLY "Attribute_createdAt_id_idx" ON "Attribute"("createdAt" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY "Attribute_batchEditId_createdAt_id_idx" ON "Attribute"("batchEditId", "createdAt", "id");
CREATE INDEX CONCURRENTLY "Favorite_userId_attributeId_attributeVersion_idx" ON "Favorite"("userId", "attributeId", "attributeVersion");
CREATE INDEX CONCURRENTLY "Bookmark_userId_attributeId_attributeVersion_idx" ON "Bookmark"("userId", "attributeId", "attributeVersion");