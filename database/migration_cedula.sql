-- =====================================================
-- MIGRACIÓN: Agregar campo cedula a usuarios y mejoras
-- =====================================================

-- Agregar columna cedula a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula VARCHAR(20) UNIQUE;

-- Actualizar espacios_empleados para usar cedula en lugar de empleado_id
-- Primero verificar si la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'espacios_empleados') THEN
        -- Crear tabla espacios_empleados con cedula
        CREATE TABLE espacios_empleados (
            id SERIAL PRIMARY KEY,
            espacio_id VARCHAR(10) NOT NULL,
            cedula VARCHAR(20) NOT NULL,
            porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 100.00,
            activo BOOLEAN DEFAULT true,
            fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
            fecha_fin DATE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_espacios_empleados_espacio FOREIGN KEY (espacio_id) 
                REFERENCES espacios(id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_espacios_empleados_cedula FOREIGN KEY (cedula) 
                REFERENCES usuarios(cedula) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT chk_espacios_empleados_fecha CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
        );
        
        CREATE INDEX idx_espacios_empleados_espacio ON espacios_empleados(espacio_id);
        CREATE INDEX idx_espacios_empleados_cedula ON espacios_empleados(cedula);
    ELSE
        -- Agregar columna cedula a tabla existente y remover empleado_id si existe
        ALTER TABLE espacios_empleados ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);
        
        -- Migrar datos de empleado_id a cedula (primero actualizar cedula en usuarios)
        UPDATE espacios_empleados ee 
        SET cedula = u.cedula 
        FROM usuarios u 
        WHERE ee.empleado_id = u.id AND u.cedula IS NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;
