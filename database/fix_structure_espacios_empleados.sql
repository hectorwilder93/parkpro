-- =====================================================
-- VERIFICACIÓN Y CORRECCIÓN DE ESTRUCTURA
-- Tabla espacios_empleados
-- =====================================================

-- 1. Verificar si existe la columna cedula en la tabla espacios_empleados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'espacios_empleados' AND column_name = 'cedula'
    ) THEN
        ALTER TABLE espacios_empleados ADD COLUMN cedula VARCHAR(20);
        RAISE NOTICE 'Columna cedula agregada a espacios_empleados';
    ELSE
        RAISE NOTICE 'Columna cedula ya existe en espacios_empleados';
    END IF;
END $$;

-- 2. Hacer que la columna cedula sea nullable para permitir asignaciones sin ella
ALTER TABLE espacios_empleados ALTER COLUMN cedula DROP NOT NULL;

-- 3. Verificar que empleado_id sea nullable (para permitir asignaciones sin empleado_id)
ALTER TABLE espacios_empleados ALTER COLUMN empleado_id DROP NOT NULL;

-- 4. Agregar constraint único para evitar duplicados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'espacios_empleados_espacio_cedula_key'
    ) THEN
        ALTER TABLE espacios_empleados 
        ADD CONSTRAINT espacios_empleados_espacio_cedula_key 
        UNIQUE (espacio_id, cedula);
    END IF;
END $$;

-- 5. Asegurar que la foreign key a espacios tenga ON DELETE CASCADE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_espacios_empleados_espacio'
    ) THEN
        ALTER TABLE espacios_empleados DROP CONSTRAINT fk_espacios_empleados_espacio;
    END IF;
    
    ALTER TABLE espacios_empleados 
    ADD CONSTRAINT fk_espacios_empleados_espacio 
    FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key a espacios recreada';
END $$;

-- 6. Asegurar que la foreign key a usuarios tenga ON DELETE SET NULL (para no perder asignaciones)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_espacios_empleados_empleado'
    ) THEN
        ALTER TABLE espacios_empleados DROP CONSTRAINT fk_espacios_empleados_empleado;
    END IF;
    
    ALTER TABLE espacios_empleados 
    ADD CONSTRAINT fk_espacios_empleados_empleado 
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key a usuarios recreada';
END $$;

-- 7. Verificar la estructura final
SELECT 'Estructura espacios_empleados:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'espacios_empleados'
ORDER BY ordinal_position;

-- 8. Verificar foreign keys
SELECT 'Foreign Keys:' AS info;
SELECT 
    tc.constraint_name, 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'espacios_empleados' AND tc.constraint_type = 'FOREIGN KEY';

-- 9. Verificar si hay usuarios con cedula
SELECT 'Usuarios con cedula:' AS info, COUNT(*) AS total FROM usuarios WHERE cedula IS NOT NULL;

-- 10. Verificar asignaciones actuales
SELECT 'Asignaciones totales:' AS info, COUNT(*) AS total FROM espacios_empleados;
SELECT 'Asignaciones activas:' AS info, COUNT(*) AS total FROM espacios_empleados WHERE activo = true;

SELECT '=== VERIFICACIÓN COMPLETADA ===' AS info;
