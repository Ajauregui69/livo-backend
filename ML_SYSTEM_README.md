# Sistema de Machine Learning para Análisis Crediticio

Sistema de análisis de documentos con **Human-in-the-Loop Machine Learning** para evaluación crediticia.

## 🎯 Descripción General

Este sistema permite:
1. ✅ Usuarios suben documentos (estados de cuenta, nóminas, identificaciones)
2. 🤖 El sistema intenta extraer datos automáticamente usando pattern matching
3. 👤 Si la confianza es baja, un humano revisa y corrige
4. 📈 El sistema aprende de las correcciones humanas
5. 💰 Se genera un score crediticio y oferta de préstamo

## 📊 Arquitectura

```
Usuario → Sube documento → S3
              ↓
    DocumentExtractionService
    (Pattern Matching + Regex)
              ↓
    ¿Confianza > 70%? ─NO→ DocumentReview (Humano)
              ↓                    ↓
            SI                 Corrige
              ↓                    ↓
         DocumentField ←────────────┘
              ↓
    CreditScoringService
              ↓
    CreditAnalysis (Score + Oferta)
```

## 🗄️ Modelos de Base de Datos

### `document_uploads`
Documentos subidos por usuarios
- `document_type`: bank_statement, payroll, id_document, etc.
- `status`: uploaded, processing, processed, failed
- `extracted_data`: Datos extraídos automáticamente

### `document_reviews`
Revisiones humanas pendientes
- `status`: pending, in_review, completed, skipped
- `confidence_score`: 0-100
- `auto_extracted_data`: Lo que extrajo el sistema
- `reviewed_data`: Datos corregidos por humano
- `field_corrections`: Qué campos se corrigieron

### `document_fields`
Campos individuales extraídos
- `field_name`: monthly_income, bank_balance, full_name, etc.
- `extracted_value`: Valor automático
- `reviewed_value`: Valor corregido
- `confidence`: 0-100
- `was_corrected`: Si fue corregido por humano

### `extraction_rules`
Reglas de extracción (patrón matching)
- `pattern`: Regex o patrón
- `document_type`: Tipo de documento
- `field_name`: Campo que extrae
- `success_count` / `failure_count`: Para medir efectividad

### `credit_analyses`
Análisis crediticio final
- `internal_score`: 0-1000
- `risk_level`: low, medium, high
- `max_loan_amount`: Monto máximo de préstamo
- `suggested_down_payment`: Enganche sugerido

## 🔧 Servicios Principales

### DocumentExtractionService
`app/services/document_extraction_service.ts`

```typescript
// Procesa un documento automáticamente
await documentExtractionService.processDocument(document)

// Re-procesa después de corrección humana
await documentExtractionService.reprocessDocument(document)
```

**Funcionalidad:**
- Aplica reglas de extracción (regex patterns)
- Calcula confianza de cada campo (0-100%)
- Si confianza general < 70%, marca para revisión humana
- Guarda campos extraídos en `document_fields`

### CreditScoringService
`app/services/credit_scoring_service.ts`

```typescript
// Calcula score crediticio
const analysis = await creditScoringService.createCreditAnalysis(userId)
```

**Factores de Scoring:**
- 📊 Ingresos (40%)
- 💼 Estabilidad Laboral (25%)
- 🏦 Historial Bancario (20%)
- 💳 Nivel de Endeudamiento (15%)

**Score Final:** 0-1000
- 800+: Excelente
- 700-799: Muy Bueno
- 600-699: Bueno
- 500-599: Regular
- <500: Bajo

## 📡 API Endpoints

### Documentos (Usuario)
```
POST   /api/ai/documents/upload          # Subir documento
GET    /api/ai/documents                 # Listar documentos
DELETE /api/ai/documents/:id             # Eliminar documento
POST   /api/ai/documents/:id/reprocess   # Reprocesar
```

### Análisis Crediticio (Usuario)
```
POST   /api/ai/analysis/request          # Solicitar análisis
GET    /api/ai/analysis                  # Ver análisis actual
```

### Revisión de Documentos (Admin/Agency Admin)
```
GET    /api/ai/reviews                   # Listar pendientes
GET    /api/ai/reviews/stats             # Estadísticas
GET    /api/ai/reviews/:id               # Ver detalle
POST   /api/ai/reviews/:id/assign        # Asignarme revisión
PUT    /api/ai/reviews/:id               # Guardar correcciones
```

## 🎮 Flujo de Usuario (Comprador)

1. **Registro y Login**
   ```
   POST /api/auth/register
   ```

2. **Subir Documentos Requeridos**
   ```
   POST /api/ai/documents/upload
   {
     "documentType": "bank_statement",
     "file": <archivo PDF/imagen>
   }
   ```

   Documentos requeridos:
   - ✅ Estado de cuenta bancario
   - ✅ Recibo de nómina
   - ✅ Identificación oficial

3. **Ver Estado de Documentos**
   ```
   GET /api/ai/documents/summary
   ```

4. **Solicitar Análisis Crediticio**
   ```
   POST /api/ai/analysis/request
   ```

   El sistema automáticamente:
   - Calcula score crediticio
   - Determina capacidad de préstamo
   - Genera recomendaciones

5. **Ver Resultado**
   ```
   GET /api/ai/analysis
   ```

   Respuesta:
   ```json
   {
     "internalScore": 750,
     "riskLevel": "low",
     "maxLoanAmount": 1440000,
     "suggestedDownPayment": 216000,
     "recommendations": [
       "¡Excelente perfil crediticio!",
       "Calificas para las mejores tasas"
     ]
   }
   ```

## 👥 Flujo de Revisión Humana (Admin)

1. **Login como Admin**
   ```
   POST /api/auth/login
   ```

2. **Ver Estadísticas**
   ```
   GET /api/ai/reviews/stats
   ```

3. **Ver Documentos Pendientes**
   ```
   GET /api/ai/reviews?status=pending
   ```

4. **Asignarse un Documento**
   ```
   POST /api/ai/reviews/:reviewId/assign
   ```

5. **Ver Documento con Detalles**
   ```
   GET /api/ai/reviews/:reviewId
   ```

   Retorna:
   - URL firmada del documento original
   - Campos extraídos automáticamente
   - Nivel de confianza por campo
   - Datos del usuario

6. **Corregir y Guardar**
   ```
   PUT /api/ai/reviews/:reviewId
   {
     "reviewedData": {
       "monthly_income": "25000",
       "bank_balance": "50000",
       "full_name": "Juan Pérez García"
     },
     "fieldCorrections": {
       "monthly_income": "25000"  // Corregido de valor automático
     },
     "status": "completed"
   }
   ```

## 🎨 Frontend de Revisión

Proyecto separado: `havi.app-credit-machine-learning`

```bash
cd ../havi.app-credit-machine-learning
npm install
npm run dev
```

Dashboard incluye:
- 📊 Estadísticas de documentos pendientes/procesados
- 📄 Visualizador de documentos (PDF/imágenes)
- ✏️ Editor inline de campos extraídos
- 🎯 Sistema de confianza visual (colores)
- ✅ Aprobación con un click

## 🧪 Cómo Probar el Sistema

### 1. Crear Reglas de Extracción

Ejecuta en el backend:
```bash
node ace tinker
```

```javascript
// Crear regla para extraer ingreso mensual de nómina
await ExtractionRule.create({
  name: 'Extract monthly income from payroll',
  documentType: 'payroll',
  fieldName: 'monthly_income',
  pattern: '(?:sueldo|salario|ingreso).*?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
  patternType: 'regex',
  contextKeywords: ['mensual', 'neto', 'bruto'],
  priority: 10,
  isActive: true,
  description: 'Extrae el ingreso mensual de recibos de nómina'
})

// Crear regla para extraer saldo bancario
await ExtractionRule.create({
  name: 'Extract bank balance',
  documentType: 'bank_statement',
  fieldName: 'bank_balance',
  pattern: '(?:saldo|balance).*?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)',
  patternType: 'regex',
  contextKeywords: ['disponible', 'actual'],
  priority: 10,
  isActive: true
})
```

### 2. Subir Documentos de Prueba

Usa Postman o curl:
```bash
curl -X POST http://localhost:3333/api/ai/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "documentType=payroll" \
  -F "file=@/path/to/nomina.pdf"
```

### 3. Ver Revisiones Pendientes

Abre el frontend:
```
http://localhost:3000
```

Login como admin y revisa los documentos.

## 📈 Mejora Continua

El sistema mejora automáticamente:

1. **Tracking de Correcciones**
   - Cada campo corregido se marca en `field_corrections`
   - Se registra qué campos tienen más errores

2. **Estadísticas de Reglas**
   - `success_count`: Cuántas veces funcionó
   - `failure_count`: Cuántas veces falló
   - Success rate se calcula automáticamente

3. **Ajuste de Confianza**
   - Reglas con más éxito tienen mayor confianza
   - Se pueden desactivar reglas con bajo rendimiento

4. **Futuro: ML Real**
   - Los datos de `field_corrections` son el dataset de entrenamiento
   - Se puede entrenar un modelo de NLP con estos datos
   - Reemplazar pattern matching por modelo entrenado

## 🔒 Seguridad

- ✅ Documentos almacenados en S3 privado
- ✅ URLs firmadas con expiración (1 hora)
- ✅ Solo admin/agency_admin pueden revisar
- ✅ Usuarios solo ven sus propios documentos
- ✅ Tokens JWT para autenticación

## 🚀 Próximos Pasos

### Fase 2: OCR Real
Implementar Tesseract.js para extraer texto de PDFs/imágenes:
```bash
npm install tesseract.js
```

### Fase 3: Machine Learning Real
- Entrenar modelo con correcciones humanas
- Usar TensorFlow.js o Brain.js
- Reemplazar regex por modelo entrenado

### Fase 4: Scoring Avanzado
- Integración con burós de crédito
- Análisis de patrones de gasto
- Predicción de capacidad de pago

## 📞 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.
