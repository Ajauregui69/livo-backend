# 🚀 Guía de Despliegue - Livo Backend

## 📋 Información del Servidor
- **IP del Droplet**: 64.23.186.195
- **Usuario**: root
- **Base de datos**: PostgreSQL local
- **Puerto de la aplicación**: 3333

## 🎯 Proceso de Despliegue Completo

### 1. 🚀 Primer Despliegue (HTTP)
```bash
./auto-deploy.sh
```
**Esto instala y configura TODO automáticamente**:
- ✅ Node.js 20 + PM2
- ✅ PostgreSQL + Base de datos `livodb`
- ✅ Nginx configurado
- ✅ Firewall configurado
- ✅ Tu aplicación funcionando

**Resultado**: http://64.23.186.195

### 2. 🔒 Configurar HTTPS + Subdominio

#### Paso A: Configurar DNS
1. Ve a tu proveedor de dominio (GoDaddy, Namecheap, etc.)
2. Crea un registro A:
   - **Nombre**: `api` (o el subdominio que prefieras)
   - **Valor**: `64.23.186.195`
   - **TTL**: 300 (5 minutos)

#### Paso B: Configurar HTTPS
1. Edita `setup-https.sh` y cambia:
   ```bash
   DOMAIN="api.tudominio.com"  # Tu dominio real
   ```

2. Ejecuta:
   ```bash
   ./setup-https.sh
   ```

**Resultado**: https://api.tudominio.com

### 3. 🔄 Actualizaciones Futuras
```bash
./update-deploy.sh
```

## 🛠️ Scripts Disponibles

| Script | Propósito | Cuándo usar |
|--------|-----------|-------------|
| `auto-deploy.sh` | Despliegue inicial completo | Solo la primera vez |
| `setup-https.sh` | Configurar SSL + dominio | Después del DNS |
| `update-deploy.sh` | Actualizaciones de código | Para cambios futuros |
| `deploy.sh` | Deploy manual en servidor | Si estás en el droplet |

## 📝 Comandos Útiles

### Ver estado de la aplicación:
```bash
ssh root@64.23.186.195 'pm2 status'
```

### Ver logs:
```bash
ssh root@64.23.186.195 'pm2 logs livo-backend'
```

### Reiniciar aplicación:
```bash
ssh root@64.23.186.195 'pm2 restart livo-backend'
```

### Conectar a la base de datos:
```bash
ssh root@64.23.186.195 'sudo -u postgres psql livodb'
```

## 🔧 Solución de Problemas

### La aplicación no responde:
```bash
ssh root@64.23.186.195 'pm2 restart livo-backend'
```

### Error de base de datos:
```bash
ssh root@64.23.186.195 'systemctl restart postgresql'
```

### Error de Nginx:
```bash
ssh root@64.23.186.195 'nginx -t && systemctl reload nginx'
```

## 📊 Monitoreo

### Ver uso de recursos:
```bash
ssh root@64.23.186.195 'htop'
```

### Ver logs de Nginx:
```bash
ssh root@64.23.186.195 'tail -f /var/log/nginx/*.log'
```

## 🔐 Seguridad Implementada

- ✅ Firewall UFW configurado
- ✅ Solo puertos 22, 80, 443 abiertos
- ✅ SSL/TLS con Let's Encrypt
- ✅ Headers de seguridad en Nginx
- ✅ Rate limiting configurado
- ✅ Renovación automática de certificados