-- =====================================================
-- CORRECCIÓN: Arreglar estructura de espacios_empleados
-- =====================================================

-- 1. Asegurar que la columna cedula exista en usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);

-- 2. Hacer la columna cedula única si no lo es
DO $$
BEGIN
    -- Verificar si existe el constraint único para cedula
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_cedula_key'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_cedula_key UNIQUE (cedula);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error al agregar constraint único: %', SQLERRM;
END $$;

-- 3. Agregar columna cedula a espacios_empleados si no existe
ALTER TABLE espacios_empleados ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);

-- 4. Eliminar FK conflictivas si existen
ALTER TABLE espacios_empleados DROP CONSTRAINT IF EXISTS fk_espacios_empleados_empleado;
ALTER TABLE espacios_empleados DROP CONSTRAINT IF EXISTS fk_espacios_empleados_cedula;

-- 5. Agregar FK corregida a espacios
ALTER TABLE espacios_empleados 
ADD CONSTRAINT fk_espacios_empleados_espacio 
FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 6. Asegurar que la FK a usuarios use empleado_id (más estable)
ALTER TABLE espacios_empleados 
ADD CONSTRAINT fk_espacios_empleados_empleado 
FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 7. Verificar que la cedula se sincronice con el usuario
UPDATE espacios_empleados ee
SET cedula = u.cedula
FROM usuarios u
WHERE ee.empleado_id = u.id AND (ee.cedula IS NULL OR ee.cedula != u.cedula);

-- 8. Crear índice para cedula
CREATE INDEX IF NOT EXISTS idx_espacios_empleados_cedula ON espacios_empleados(cedula);

-- 9. Verificar la estructura final
SELECT 
    'Tabla espacios_empleados:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'espacios_empleados'
ORDER BY ordinal_position;

SELECT 
    'Foreign Keys de espacios_empleados:' AS info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'espacios_empleados' AND tc.constraint_type = 'FOREIGN KEY';

SELECT 
    'Total asignaciones:' AS info,
    COUNT(*) AS total
FROM espacios_empleados;

SELECT 
    'Asignaciones activas:' AS info,
    COUNT(*) AS activas
FROM espacios_empleados
WHERE activo = true;
