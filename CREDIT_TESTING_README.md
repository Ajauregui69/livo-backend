# 🏠 HAVI - Credit Score Testing Guide

Este documento contiene las credenciales y guía para probar el sistema de calificación crediticia de leads en HAVI.

## 📋 Usuarios de Prueba

### 🌟 Lead Premium - Score Alto (745)
**Perfil**: Cliente ideal con excelente historial crediticio
- **Email**: `carlos.mendoza@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 1234-5678
- **Score Crediticio**: 745
- **Ingreso Estimado**: $85,000 MXN/mes
- **Presupuesto Máximo**: ~$4,080,000 MXN
- **Nivel de Riesgo**: Bajo
- **Características**: Puede acceder a propiedades premium, mejores tasas de interés

### 💎 Lead Bueno - Score Medio Alto (680)
**Perfil**: Buen prospecto con historial sólido
- **Email**: `maria.gonzalez@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 2345-6789
- **Score Crediticio**: 680
- **Ingreso Estimado**: $65,000 MXN/mes
- **Presupuesto Máximo**: ~$2,340,000 MXN
- **Nivel de Riesgo**: Bajo
- **Características**: Acceso a la mayoría de propiedades, condiciones favorables

### 🏡 Lead Promedio - Score Medio (620)
**Perfil**: Cliente estándar con historial regular
- **Email**: `jose.ramirez@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 3456-7890
- **Score Crediticio**: 620
- **Ingreso Estimado**: $45,000 MXN/mes
- **Presupuesto Máximo**: ~$1,080,000 MXN
- **Nivel de Riesgo**: Medio
- **Características**: Acceso a propiedades de rango medio, condiciones estándar

### 🌱 Lead Emergente - Score Medio Bajo (580)
**Perfil**: Joven profesionista con potencial
- **Email**: `ana.lopez@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 4567-8901
- **Score Crediticio**: 580
- **Ingreso Estimado**: $35,000 MXN/mes
- **Presupuesto Máximo**: ~$630,000 MXN
- **Nivel de Riesgo**: Medio
- **Características**: Opciones limitadas pero con potencial de crecimiento

### ⚠️ Lead de Recuperación - Score Bajo (520)
**Perfil**: Cliente en proceso de recuperación crediticia
- **Email**: `roberto.hernandez@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 5678-9012
- **Score Crediticio**: 520
- **Ingreso Estimado**: $28,000 MXN/mes
- **Presupuesto Máximo**: ~$336,000 MXN
- **Nivel de Riesgo**: Alto
- **Características**: Acceso limitado, requiere condiciones especiales

### 🏠 Lead Primera Vivienda - Score Bajo (485)
**Perfil**: Primer comprador, sin historial extenso
- **Email**: `sofia.morales@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 6789-0123
- **Score Crediticio**: 485
- **Ingreso Estimado**: $32,000 MXN/mes
- **Presupuesto Máximo**: ~$384,000 MXN
- **Nivel de Riesgo**: Alto
- **Características**: Candidato para programas de primera vivienda

### 💼 Lead Premium 2 - Score Muy Alto (720)
**Perfil**: Empresario exitoso
- **Email**: `eduardo.castillo@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 7890-1234
- **Score Crediticio**: 720
- **Ingreso Estimado**: $120,000 MXN/mes
- **Presupuesto Máximo**: ~$5,760,000 MXN
- **Nivel de Riesgo**: Bajo
- **Características**: Acceso a propiedades de lujo, condiciones preferenciales

### 👩‍💼 Lead Joven Profesionista - Score Medio (650)
**Perfil**: Profesionista con ingreso creciente
- **Email**: `paola.ruiz@test.com`
- **Password**: `password123`
- **Teléfono**: +52 55 8901-2345
- **Score Crediticio**: 650
- **Ingreso Estimado**: $55,000 MXN/mes
- **Presupuesto Máximo**: ~$1,584,000 MXN
- **Nivel de Riesgo**: Medio
- **Características**: Buen potencial, ingreso en crecimiento

---

## 🧪 Cómo Probar el Sistema

### 1. **Ejecutar Migraciones y Seeders**
```bash
# En el directorio livo-backend
cd D:\Projects\livo-backend

# Ejecutar migraciones
node ace migration:run

# Ejecutar seeder de leads
node ace db:seed --files=database/seeders/leads_seeder.ts
```

### 2. **Login como Comprador**
- Usar cualquiera de los emails y password `password123`
- Verificar que el usuario tenga rol `comprador`

### 3. **Probar Endpoints API**

#### Obtener Status Crediticio
```http
GET /api/credit-status
Authorization: Bearer {token}
```

#### Obtener Propiedades Calificadas
```http
GET /api/qualified-properties?page=1&limit=20
Authorization: Bearer {token}
```

#### Analizar Propiedad Específica
```http
GET /api/qualified-properties/{propertyId}
Authorization: Bearer {token}
```

### 4. **Comportamiento Esperado por Score**

| Score Range | Comportamiento |
|-------------|----------------|
| 700-760 | Acceso a todas las propiedades hasta $5M+, mensajes "Excelente opción" |
| 650-699 | Acceso a propiedades hasta $2.5M, mensajes positivos |
| 600-649 | Acceso a propiedades hasta $1.5M, mensajes neutrales |
| 550-599 | Acceso limitado hasta $800K, advertencias sobre presupuesto |
| 456-549 | Acceso muy limitado, sugerencias de mejora crediticia |

### 5. **Filtros Automáticos**
- Las propiedades se filtran automáticamente por `maxBudget`
- Usuarios de alto riesgo ven propiedades hasta 80% de su presupuesto máximo
- Se calculan pagos mensuales estimados basados en el score
- Se muestran recomendaciones personalizadas

---

## 🎯 Casos de Uso para Probar

### Caso 1: Usuario Premium
1. Login como `carlos.mendoza@test.com`
2. Debe ver todas las propiedades hasta $4M+
3. Mensajes de "Excelente opción" en propiedades dentro de presupuesto
4. Tasas de interés estimadas del 8%

### Caso 2: Usuario de Riesgo Alto
1. Login como `sofia.morales@test.com`
2. Solo debe ver propiedades hasta $300K aprox (80% de $384K)
3. Mensajes de advertencia sobre presupuesto
4. Tasas de interés estimadas del 12%

### Caso 3: Usuario sin Score
1. Crear usuario nuevo con rol `comprador`
2. Debe recibir mensaje `requiresCreditCheck: true`
3. No debe ver propiedades calificadas

---

## 🔧 Personalización

### Modificar Algoritmos de Cálculo
Los algoritmos están en:
- `app/models/credit_score.ts` - Cálculo de presupuesto máximo
- `app/controllers/qualified_properties_controller.ts` - Lógica de filtrado y recomendaciones

### Agregar Nuevos Criterios
Para agregar nuevos factores de calificación, modificar:
1. Migración para nuevos campos
2. Modelo `CreditScore` para nuevas propiedades
3. Controller para nueva lógica de filtrado

---

## 📊 Monitoreo

### Logs Importantes
- Errores de autenticación crediticia
- Propiedades filtradas por usuario
- Cálculos de affordabilidad

### Métricas Sugeridas
- Distribución de scores de usuarios
- Tasas de conversión por rango de score
- Propiedades más vistas por segmento crediticio

---

## 🚨 Notas Importantes

1. **Los scores son simulados** - No hay conexión real con Buró de Crédito
2. **Datos de prueba** - No usar en producción
3. **Passwords simples** - Solo para testing, cambiar en producción
4. **Expiración** - Los scores expiran en 6 meses (configurable)

---

¡Listo para probar el sistema de calificación crediticia! 🎉