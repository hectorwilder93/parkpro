-- =====================================================
-- CORRECCIÓN: Agregar columna empleado_id a espacios_empleados
-- =====================================================

-- 1. Verificar si existe la columna empleado_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'espacios_empleados' AND column_name = 'empleado_id'
    ) THEN
        -- Agregar la columna si no existe
        ALTER TABLE espacios_empleados ADD COLUMN empleado_id INTEGER;
        RAISE NOTICE 'Columna empleado_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna empleado_id ya existe';
    END IF;
END $$;

-- 2. Agregar la foreign key si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_espacios_empleados_empleado'
    ) THEN
        ALTER TABLE espacios_empleados 
        ADD CONSTRAINT fk_espacios_empleados_empleado 
        FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key empleado agregada';
    ELSE
        RAISE NOTICE 'Foreign key empleado ya existe';
    END IF;
END $$;

-- 3. Verificar estructura final
SELECT 'Estructura actual de espacios_empleados:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'espacios_empleados'
ORDER BY ordinal_position;

-- 4. Verificar foreign keys
SELECT 'Foreign keys:' AS info;
SELECT 
    tc.constraint_name, 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'espacios_empleados' AND tc.constraint_type = 'FOREIGN KEY';

SELECT '=== CORRECCIÓN COMPLETADA ===' AS info;
