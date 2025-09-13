-- Script para corregir el rol del administrador de agencia
-- Cambiar el rol de 'agent' a 'agency_admin' para usuarios que son administradores de agencias

UPDATE users 
SET role = 'agency_admin' 
WHERE id IN (
    SELECT admin_user_id 
    FROM agencies 
    WHERE admin_user_id IS NOT NULL
);

-- Verificar los cambios
SELECT 
    u.id,
    u.first_name,
    u.email,
    u.role,
    a.name as agency_name
FROM users u
LEFT JOIN agencies a ON a.admin_user_id = u.id
WHERE u.role = 'agency_admin';