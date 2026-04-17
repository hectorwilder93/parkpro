-- =====================================================
-- SISTEMA DE PARQUEADERO "PARKPRO"
-- Script de creación de base de datos PostgreSQL
-- Versión: 1.0
-- =====================================================

-- =====================================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- =====================================================
CREATE DATABASE parkpro_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_CO.UTF-8'
    LC_CTYPE = 'es_CO.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

\c parkpro_db;

-- =====================================================
-- 2. EXTENSIONES NECESARIAS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 3. TIPOS ENUMERADOS (DOMINIOS)
-- =====================================================

-- Roles de usuario
CREATE TYPE rol_usuario AS ENUM ('Administrador', 'Supervisor', 'Operador', 'Tecnico');

-- Turnos de operador
CREATE TYPE turno_operador AS ENUM ('Matutino', 'Vespertino', 'Nocturno', 'Rotativo');

-- Tipo de vehículo
CREATE TYPE tipo_vehiculo AS ENUM ('Automóvil', 'Motocicleta', 'Camioneta', 'Discapacitados');

-- Estado del ticket
CREATE TYPE estado_ticket AS ENUM ('ACTIVO', 'FINALIZADO', 'ANULADO');

-- Estado del espacio
CREATE TYPE estado_espacio AS ENUM ('DISPONIBLE', 'OCUPADO', 'RESERVADO', 'MANTENIMIENTO');

-- Métodos de pago
CREATE TYPE metodo_pago AS ENUM ('EFECTIVO', 'DATAFONO', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA');

-- Estado del pago
CREATE TYPE estado_pago AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO');

-- Tipo de reporte
CREATE TYPE tipo_reporte AS ENUM ('CIERRE_TURNO', 'DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL');

-- =====================================================
-- 4. TABLAS PRINCIPALES
-- =====================================================

-- -----------------------------------------------------
-- Tabla: usuarios
-- -----------------------------------------------------
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'Operador',
    turno turno_operador,
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- -----------------------------------------------------
-- Tabla: vehiculos
-- -----------------------------------------------------
CREATE TABLE vehiculos (
    placa VARCHAR(10) PRIMARY KEY,
    tipo tipo_vehiculo NOT NULL,
    marca VARCHAR(50),
    color VARCHAR(30),
    es_empleado BOOLEAN DEFAULT false,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT placa_formato CHECK (placa ~* '^[A-Z0-9]{3,10}$')
);

-- -----------------------------------------------------
-- Tabla: espacios
-- -----------------------------------------------------
CREATE TABLE espacios (
    id VARCHAR(10) PRIMARY KEY,
    numero INTEGER NOT NULL,
    piso INTEGER NOT NULL,
    seccion VARCHAR(10) NOT NULL,
    tipo_permitido tipo_vehiculo NOT NULL,
    estado estado_espacio DEFAULT 'DISPONIBLE',
    coordenada_x INTEGER,
    coordenada_y INTEGER,
    empleado_asignado_id INTEGER,
    es_para_empleado BOOLEAN DEFAULT false,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT espacio_formato CHECK (id ~* '^[A-Z][0-9]{1,3}$'),
    CONSTRAINT fk_espacios_empleado FOREIGN KEY (empleado_asignado_id) 
        REFERENCES usuarios(id) ON UPDATE SET NULL ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: espacios_empleados (asignaciones de espacios a empleados)
-- -----------------------------------------------------
CREATE TABLE espacios_empleados (
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

-- -----------------------------------------------------
-- Tabla: tarifas
-- -----------------------------------------------------
CREATE TABLE tarifas (
    id SERIAL PRIMARY KEY,
    tipo_vehiculo tipo_vehiculo NOT NULL,
    valor_hora DECIMAL(10,2) NOT NULL,
    valor_minuto DECIMAL(10,2),
    valor_maximo_dia DECIMAL(10,2),
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE,
    activa BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo_vehiculo, vigencia_desde)
);

-- -----------------------------------------------------
-- Tabla: tickets
-- -----------------------------------------------------
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    placa VARCHAR(10) NOT NULL,
    tipo_vehiculo tipo_vehiculo NOT NULL,
    horario_ingreso TIMESTAMP NOT NULL,
    horario_salida TIMESTAMP,
    espacio_id VARCHAR(10),
    estado estado_ticket DEFAULT 'ACTIVO',
    usuario_id_entrada INTEGER NOT NULL,
    usuario_id_salida INTEGER,
    tarifa_aplicada_id INTEGER,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_tickets_vehiculo FOREIGN KEY (placa) 
        REFERENCES vehiculos(placa) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_espacio FOREIGN KEY (espacio_id) 
        REFERENCES espacios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_usuario_entrada FOREIGN KEY (usuario_id_entrada) 
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_usuario_salida FOREIGN KEY (usuario_id_salida) 
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_tarifa FOREIGN KEY (tarifa_aplicada_id) 
        REFERENCES tarifas(id) ON DELETE RESTRICT,
    CONSTRAINT chk_horario_salida CHECK (horario_salida IS NULL OR horario_salida >= horario_ingreso)
);

-- -----------------------------------------------------
-- Tabla: descuentos_nomina
-- -----------------------------------------------------
CREATE TABLE descuentos_nomina (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL,
    placa VARCHAR(10) NOT NULL,
    porcentaje_descuento DECIMAL(5,2) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_descuentos_vehiculo FOREIGN KEY (placa) 
        REFERENCES vehiculos(placa) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_porcentaje CHECK (porcentaje_descuento >= 0 AND porcentaje_descuento <= 100)
);

-- -----------------------------------------------------
-- Tabla: pagos
-- -----------------------------------------------------
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    metodo metodo_pago NOT NULL,
    estado estado_pago DEFAULT 'COMPLETADO',
    transaccion_id VARCHAR(100),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_procesa INTEGER NOT NULL,
    
    CONSTRAINT fk_pagos_ticket FOREIGN KEY (ticket_id) 
        REFERENCES tickets(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_usuario FOREIGN KEY (usuario_id_procesa) 
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

-- -----------------------------------------------------
-- Tabla: pagos_efectivo
-- -----------------------------------------------------
CREATE TABLE pagos_efectivo (
    id INTEGER PRIMARY KEY,
    monto_recibido DECIMAL(10,2) NOT NULL,
    vuelto DECIMAL(10,2) NOT NULL,
    
    CONSTRAINT fk_pago_efectivo FOREIGN KEY (id) 
        REFERENCES pagos(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: pagos_digital
-- -----------------------------------------------------
CREATE TABLE pagos_digital (
    id INTEGER PRIMARY KEY,
    plataforma VARCHAR(20) NOT NULL,
    qr_code TEXT,
    url_pago TEXT,
    telefono_asociado VARCHAR(15),
    
    CONSTRAINT fk_pago_digital FOREIGN KEY (id) 
        REFERENCES pagos(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: pagos_datafono
-- -----------------------------------------------------
CREATE TABLE pagos_datafono (
    id INTEGER PRIMARY KEY,
    terminal_id VARCHAR(20) NOT NULL,
    tarjeta_hash VARCHAR(255),
    autorizacion_codigo VARCHAR(20),
    
    CONSTRAINT fk_pago_datafono FOREIGN KEY (id) 
        REFERENCES pagos(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Tabla: facturas
-- -----------------------------------------------------
CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL UNIQUE,
    cufe VARCHAR(100) UNIQUE NOT NULL,
    nit_cliente VARCHAR(20) NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    email_cliente VARCHAR(100),
    subtotal DECIMAL(10,2) NOT NULL,
    iva DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xml_dian TEXT,
    estado_dian VARCHAR(20) DEFAULT 'ENVIADA',
    
    CONSTRAINT fk_facturas_ticket FOREIGN KEY (ticket_id) 
        REFERENCES tickets(id) ON DELETE RESTRICT,
    CONSTRAINT chk_factura_totales CHECK (subtotal + iva = total)
);

-- -----------------------------------------------------
-- Tabla: cierres_turno
-- -----------------------------------------------------
CREATE TABLE cierres_turno (
    id SERIAL PRIMARY KEY,
    operador_id INTEGER NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    total_efectivo DECIMAL(10,2) DEFAULT 0,
    total_datafono DECIMAL(10,2) DEFAULT 0,
    total_nequi DECIMAL(10,2) DEFAULT 0,
    total_daviplata DECIMAL(10,2) DEFAULT 0,
    total_bancolombia DECIMAL(10,2) DEFAULT 0,
    efectivo_declarado DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    observaciones TEXT,
    supervisor_valida INTEGER,
    fecha_validacion TIMESTAMP,
    
    CONSTRAINT fk_cierre_operador FOREIGN KEY (operador_id) 
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cierre_supervisor FOREIGN KEY (supervisor_valida) 
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_fechas CHECK (fecha_fin >= fecha_inicio)
);

-- -----------------------------------------------------
-- Tabla: reportes
-- -----------------------------------------------------
CREATE TABLE reportes (
    id SERIAL PRIMARY KEY,
    tipo tipo_reporte NOT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id_genera INTEGER NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    contenido_json JSONB NOT NULL,
    archivo_url TEXT,
    fecha_desde DATE,
    fecha_hasta DATE,
    
    CONSTRAINT fk_reportes_usuario FOREIGN KEY (usuario_id_genera) 
        REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- -----------------------------------------------------
-- Tabla: logs_auditoria
-- -----------------------------------------------------
CREATE TABLE logs_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    ip_address INET,
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    datos_previos JSONB,
    datos_nuevos JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_logs_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: alarmas_seguridad
-- -----------------------------------------------------
CREATE TABLE alarmas_seguridad (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    severidad VARCHAR(20) NOT NULL,
    mensaje TEXT NOT NULL,
    detalles JSONB,
    fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    usuario_id_resuelve INTEGER,
    estado VARCHAR(20) DEFAULT 'ACTIVA',
    
    CONSTRAINT fk_alarmas_usuario FOREIGN KEY (usuario_id_resuelve) 
        REFERENCES usuarios(id) ON DELETE SET NULL
);

-- -----------------------------------------------------
-- Tabla: configuracion (configuracion del sistema)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave VARCHAR(50) PRIMARY KEY DEFAULT 'sistema',
    valor JSONB,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuracion por defecto
INSERT INTO configuracion (clave, valor) 
VALUES ('sistema', '{"autoTariff": 4000, "motoTariff": 2000, "vanTariff": 6000, "discTariff": 3000, "maxDay": 40000, "openingTime": "06:00", "closingTime": "22:00", "companyName": "ParkPro SAS", "nit": "900.123.456-7", "address": "Calle 123 # 45-67", "phone": "300 123 4567", "email": "contacto@parkpro.com"}')
ON CONFLICT (clave) DO NOTHING;

-- =====================================================
-- 5. INDICES PARA OPTIMIZACION DE CONSULTAS
-- =====================================================

CREATE INDEX idx_tickets_placa ON tickets(placa);
CREATE INDEX idx_tickets_codigo_barras ON tickets(codigo_barras);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_horario_ingreso ON tickets(horario_ingreso);
CREATE INDEX idx_tickets_horario_salida ON tickets(horario_salida) WHERE horario_salida IS NOT NULL;

CREATE INDEX idx_vehiculos_es_empleado ON vehiculos(es_empleado) WHERE es_empleado = true;

CREATE INDEX idx_espacios_estado ON espacios(estado);
CREATE INDEX idx_espacios_tipo ON espacios(tipo_permitido);
CREATE INDEX idx_espacios_empleado ON espacios(empleado_asignado_id) WHERE empleado_asignado_id IS NOT NULL;

CREATE INDEX idx_espacios_empleados_espacio ON espacios_empleados(espacio_id);
CREATE INDEX idx_espacios_empleados_empleado ON espacios_empleados(empleado_id);
CREATE INDEX idx_espacios_empleados_activo ON espacios_empleados(activo, fecha_inicio, fecha_fin) WHERE activo = true;

CREATE INDEX idx_pagos_ticket_id ON pagos(ticket_id);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX idx_pagos_metodo ON pagos(metodo);

CREATE INDEX idx_facturas_cufe ON facturas(cufe);
CREATE INDEX idx_facturas_nit ON facturas(nit_cliente);

CREATE INDEX idx_cierres_turno_operador ON cierres_turno(operador_id, fecha_fin);

CREATE INDEX idx_logs_auditoria_timestamp ON logs_auditoria(timestamp DESC);
CREATE INDEX idx_logs_auditoria_usuario ON logs_auditoria(usuario_id);

CREATE INDEX idx_alarmas_estado ON alarmas_seguridad(estado, severidad);

CREATE INDEX idx_vehiculos_placa_trgm ON vehiculos USING gin (placa gin_trgm_ops);

-- =====================================================
-- 6. VISTAS UTILES
-- =====================================================

CREATE VIEW espacios_ocupados_actualmente AS
SELECT 
    e.id AS espacio_id,
    e.piso,
    e.seccion,
    t.placa,
    t.tipo_vehiculo,
    t.horario_ingreso,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.horario_ingreso))/3600 AS horas_estadia
FROM espacios e
JOIN tickets t ON e.id = t.espacio_id
WHERE e.estado = 'OCUPADO' AND t.estado = 'ACTIVO';

CREATE VIEW ingresos_diarios AS
SELECT 
    DATE(p.fecha_pago) AS fecha,
    p.metodo,
    COUNT(*) AS cantidad_transacciones,
    SUM(p.monto) AS total_ingresos
FROM pagos p
WHERE p.estado = 'COMPLETADO'
GROUP BY DATE(p.fecha_pago), p.metodo
ORDER BY fecha DESC, p.metodo;

CREATE VIEW tickets_activos_con_tiempo AS
SELECT 
    t.*,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.horario_ingreso))/60 AS minutos_estadia,
    tar.valor_hora,
    CASE 
        WHEN tar.valor_hora IS NOT NULL 
        THEN CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.horario_ingreso))/3600) * tar.valor_hora
        ELSE NULL
    END AS tarifa_estimada
FROM tickets t
LEFT JOIN tarifas tar ON t.tipo_vehiculo = tar.tipo_vehiculo AND tar.activa = true
WHERE t.estado = 'ACTIVO';

-- =====================================================
-- 7. FUNCIONES Y TRIGGERS
-- =====================================================

-- Funcion: actualizar_fecha_modificacion
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER trigger_actualizar_espacios
    BEFORE UPDATE ON espacios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Funcion: generar_codigo_barras
CREATE OR REPLACE FUNCTION generar_codigo_barras()
RETURNS TRIGGER AS $$
DECLARE
    fecha_prefix VARCHAR(8);
    random_sufix VARCHAR(10);
BEGIN
    fecha_prefix := TO_CHAR(NEW.horario_ingreso, 'YYMMDD');
    random_sufix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    NEW.codigo_barras := fecha_prefix || NEW.placa || random_sufix;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_codigo_barras
    BEFORE INSERT ON tickets
    FOR EACH ROW
    WHEN (NEW.codigo_barras IS NULL)
    EXECUTE FUNCTION generar_codigo_barras();

-- Funcion: validar_espacio_antes_ocupar
CREATE OR REPLACE FUNCTION validar_espacio_antes_ocupar()
RETURNS TRIGGER AS $$
DECLARE
    tipo_vehiculo_espacio tipo_vehiculo;
    estado_actual estado_espacio;
BEGIN
    SELECT e.estado, e.tipo_permitido INTO estado_actual, tipo_vehiculo_espacio
    FROM espacios e WHERE e.id = NEW.espacio_id;
    
    IF estado_actual != 'DISPONIBLE' THEN
        RAISE EXCEPTION 'El espacio % no esta disponible. Estado actual: %', NEW.espacio_id, estado_actual;
    END IF;
    
    IF tipo_vehiculo_espacio != NEW.tipo_vehiculo THEN
        RAISE EXCEPTION 'El espacio % es para vehículos tipo %, no para %', 
            NEW.espacio_id, tipo_vehiculo_espacio, NEW.tipo_vehiculo;
    END IF;
    
    UPDATE espacios SET estado = 'OCUPADO' WHERE id = NEW.espacio_id;
    
    INSERT INTO logs_auditoria (usuario_id, accion, detalle, tabla_afectada, registro_id)
    VALUES (NEW.usuario_id_entrada, 'OCUPAR_ESPACIO', 
            CONCAT('Espacio ', NEW.espacio_id, ' ocupado por vehículo ', NEW.placa),
            'espacios', NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_espacio_antes_insert
    BEFORE INSERT ON tickets
    FOR EACH ROW
    WHEN (NEW.estado = 'ACTIVO' AND NEW.espacio_id IS NOT NULL)
    EXECUTE FUNCTION validar_espacio_antes_ocupar();

-- Funcion: liberar_espacio_al_salir
CREATE OR REPLACE FUNCTION liberar_espacio_al_salir()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'FINALIZADO' AND OLD.estado = 'ACTIVO' THEN
        UPDATE espacios 
        SET estado = 'DISPONIBLE' 
        WHERE id = OLD.espacio_id;
        
        INSERT INTO logs_auditoria (usuario_id, accion, detalle, tabla_afectada, registro_id)
        VALUES (NEW.usuario_id_salida, 'LIBERAR_ESPACIO', 
                CONCAT('Espacio ', OLD.espacio_id, ' liberado por vehi�culo ', NEW.placa),
                'espacios', OLD.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_liberar_espacio_al_salir
    AFTER UPDATE OF estado ON tickets
    FOR EACH ROW
    WHEN (NEW.estado = 'FINALIZADO')
    EXECUTE FUNCTION liberar_espacio_al_salir();

-- Funcion: calcular_totales_cierre_turno
CREATE OR REPLACE FUNCTION calcular_totales_cierre_turno(
    p_operador_id INTEGER,
    p_fecha_inicio TIMESTAMP,
    p_fecha_fin TIMESTAMP
)
RETURNS TABLE(
    total_efectivo DECIMAL,
    total_datafono DECIMAL,
    total_nequi DECIMAL,
    total_daviplata DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN p.metodo = 'EFECTIVO' THEN p.monto ELSE 0 END), 0) AS total_efectivo,
        COALESCE(SUM(CASE WHEN p.metodo = 'DATAFONO' THEN p.monto ELSE 0 END), 0) AS total_datafono,
        COALESCE(SUM(CASE WHEN p.metodo = 'NEQUI' THEN p.monto ELSE 0 END), 0) AS total_nequi,
        COALESCE(SUM(CASE WHEN p.metodo = 'DAVIPLATA' THEN p.monto ELSE 0 END), 0) AS total_daviplata
    FROM pagos p
    JOIN tickets t ON p.ticket_id = t.id
    WHERE t.usuario_id_salida = p_operador_id
        AND p.fecha_pago BETWEEN p_fecha_inicio AND p_fecha_fin
        AND p.estado = 'COMPLETADO';
END;
$$ LANGUAGE plpgsql;

-- Funcion: trigger_log_auditoria
CREATE OR REPLACE FUNCTION log_auditoria_general()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO logs_auditoria (usuario_id, accion, detalle, tabla_afectada, registro_id, datos_nuevos)
        VALUES (NULL, 'INSERT', CONCAT('Nuevo registro en ', TG_TABLE_NAME), TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO logs_auditoria (usuario_id, accion, detalle, tabla_afectada, registro_id, datos_previos, datos_nuevos)
        VALUES (NULL, 'UPDATE', CONCAT('Actualizacion en ', TG_TABLE_NAME), TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO logs_auditoria (usuario_id, accion, detalle, tabla_afectada, registro_id, datos_previos)
        VALUES (NULL, 'DELETE', CONCAT('Eliminacion en ', TG_TABLE_NAME), TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_usuarios AFTER INSERT OR UPDATE OR DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION log_auditoria_general();
CREATE TRIGGER trigger_log_tickets AFTER INSERT OR UPDATE OR DELETE ON tickets FOR EACH ROW EXECUTE FUNCTION log_auditoria_general();
CREATE TRIGGER trigger_log_pagos AFTER INSERT OR UPDATE OR DELETE ON pagos FOR EACH ROW EXECUTE FUNCTION log_auditoria_general();
CREATE TRIGGER trigger_log_facturas AFTER INSERT OR UPDATE OR DELETE ON facturas FOR EACH ROW EXECUTE FUNCTION log_auditoria_general();

-- =====================================================
-- 8. DATOS INICIALES (SEMILLA)
-- =====================================================

-- Insertar usuario administrador por defecto
-- Password: Admin123! (hash bcrypt)
INSERT INTO usuarios (nombre, username, password_hash, email, rol) VALUES 
('Administrador Sistema', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx3W.D4C9.P6aqz9vTJbNm', 'admin@parkpro.com', 'Administrador');

-- Insertar tarifas por defecto
INSERT INTO tarifas (tipo_vehiculo, valor_hora, valor_minuto, valor_maximo_dia, vigencia_desde, activa) VALUES
('Automovil', 4000, 67, 40000, CURRENT_DATE, true),
('Motocicleta', 2000, 34, 20000, CURRENT_DATE, true),
('Camioneta', 6000, 100, 60000, CURRENT_DATE, true),
('Discapacitados', 3000, 50, 30000, CURRENT_DATE, true);

-- Insertar espacios de ejemplo (parqueadero de 4 pisos, 50 espacios por piso)
DO $$
DECLARE
    piso INTEGER;
    seccion CHAR(1);
    numero INTEGER;
    tipo tipo_vehiculo;
BEGIN
    FOR piso IN 1..4 LOOP
        FOR seccion IN SELECT unnest(ARRAY['A', 'B', 'C', 'D', 'E']) LOOP
            FOR numero IN 1..10 LOOP
                IF piso = 1 AND seccion = 'A' THEN
                    tipo := 'Discapacitados';
                ELSIF piso = 4 THEN
                    tipo := 'Motocicleta';
                ELSIF numero IN (1,2) THEN
                    tipo := 'Camioneta';
                ELSE
                    tipo := 'Automovil';
                END IF;
                
                INSERT INTO espacios (id, numero, piso, seccion, tipo_permitido, coordenada_x, coordenada_y)
                VALUES (
                    seccion || LPAD(numero::TEXT, 2, '0'),
                    numero,
                    piso,
                    seccion,
                    tipo,
                    numero * 10,
                    piso * 20
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 9. PERMISOS Y SEGURIDAD
-- =====================================================

CREATE ROLE parkpro_admin;
CREATE ROLE parkpro_supervisor;
CREATE ROLE parkpro_operador;
CREATE ROLE parkpro_tecnico;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO parkpro_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO parkpro_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO parkpro_admin;

GRANT SELECT, INSERT, UPDATE ON usuarios TO parkpro_supervisor;
GRANT SELECT, INSERT, UPDATE ON tickets TO parkpro_supervisor;
GRANT SELECT, INSERT, UPDATE ON pagos TO parkpro_supervisor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO parkpro_supervisor;

GRANT SELECT, INSERT, UPDATE ON tickets TO parkpro_operador;
GRANT SELECT, INSERT ON pagos TO parkpro_operador;
GRANT SELECT ON espacios TO parkpro_operador;
GRANT SELECT ON tarifas TO parkpro_operador;
GRANT SELECT ON vehiculos TO parkpro_operador;
GRANT SELECT, INSERT ON cierres_turno TO parkpro_operador;

GRANT SELECT, INSERT, UPDATE ON logs_auditoria TO parkpro_tecnico;
GRANT SELECT, UPDATE ON alarmas_seguridad TO parkpro_tecnico;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO parkpro_tecnico;

-- =====================================================
-- 10. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE usuarios IS 'Usuarios del sistema con sus roles y credenciales';
COMMENT ON TABLE vehiculos IS 'Registro de vehi�culos que han utilizado el parqueadero';
COMMENT ON TABLE tickets IS 'Registro de entradas y salidas de vehiculos';
COMMENT ON TABLE pagos IS 'Transacciones de pago realizadas';
COMMENT ON TABLE facturas IS 'Facturas electronicas generadas segun DIAN';
COMMENT ON TABLE logs_auditoria IS 'Registro de auditori�a para trazabilidad de acciones';
COMMENT ON TABLE alarmas_seguridad IS 'Alarmas y eventos de seguridad del sistema';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
