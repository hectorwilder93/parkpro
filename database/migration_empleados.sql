-- =====================================================
-- MIGRACIÓN: Agregar campos de empleados a espacios
-- y crear tabla espacios_empleados
-- =====================================================

-- Agregar columnas a la tabla espacios
ALTER TABLE espacios ADD COLUMN IF NOT EXISTS empleado_asignado_id INTEGER;
ALTER TABLE espacios ADD COLUMN IF NOT EXISTS es_para_empleado BOOLEAN DEFAULT false;

-- Agregar constraint de foreign key
ALTER TABLE espacios 
ADD CONSTRAINT fk_espacios_empleado 
FOREIGN KEY (empleado_asignado_id) 
REFERENCES usuarios(id) ON UPDATE SET NULL ON DELETE SET NULL;

-- Crear tabla espacios_empleados
CREATE TABLE IF NOT EXISTS espacios_empleados (
    id SERIAL PRIMARY KEY,
    espacio_id VARCHAR(10) NOT NULL,
    empleado_id INTEGER NOT NULL,
    porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    activo BOOLEAN DEFAULT true,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_espacios_empleados_espacio FOREIGN KEY (espacio_id) 
        REFERENCES espacios(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_espacios_empleados_empleado FOREIGN KEY (empleado_id) 
        REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_espacios_empleados_fecha CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_espacios_empleado ON espacios(empleado_asignado_id) WHERE empleado_asignado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_espacios_empleados_espacio ON espacios_empleados(espacio_id);
CREATE INDEX IF NOT EXISTS idx_espacios_empleados_empleado ON espacios_empleados(empleado_id);
CREATE INDEX IF NOT EXISTS idx_espacios_empleados_activo ON espacios_empleados(activo, fecha_inicio, fecha_fin) WHERE activo = true;
