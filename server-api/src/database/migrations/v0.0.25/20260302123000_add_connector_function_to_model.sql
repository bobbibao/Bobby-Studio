-- Add connectorFunction column to Model and populate Bobby AI connector
DO $$
BEGIN
  ALTER TABLE "Model" ADD COLUMN IF NOT EXISTS "connectorFunction" TEXT;
EXCEPTION
  WHEN duplicate_column THEN
    NULL;
END $$;

UPDATE public."Model"
SET "connectorFunction" = 'generateWithBobbyPythonModel'
WHERE id = 'python-vision-local';
