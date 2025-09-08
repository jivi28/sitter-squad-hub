-- Rename tables to remove spaces for better TypeScript compatibility
ALTER TABLE "Parent profiles" RENAME TO "profiles";
ALTER TABLE "Sitter profiles" RENAME TO "sitters";