# 🔐 Admin Scripts - Gestión de Roles

Estos scripts permiten gestionar los roles de usuarios en CoDesign LIVE directamente desde la línea de comandos.

## 📋 Scripts Disponibles

### 1. `check-user-role.js` - Verificar rol de un usuario

```bash
node scripts/check-user-role.js <email>
```

**Ejemplo:**

```bash
node scripts/check-user-role.js jaiberhiguita4@gmail.com
```

**Salida:**

```
🔍 Verificando usuario: jaiberhiguita4@gmail.com

✅ Usuario encontrado:

  📧 Email: jaiberhiguita4@gmail.com
  👤 Nombre: Jaiberth Higuita
  🎭 Rol: super_admin
  📅 Creado: 2024-03-15T10:30:00Z
  🖼️  Avatar: Sí

🔐 ⭐ Este usuario ES ADMINISTRADOR (super_admin)
```

---

### 2. `list-admins.js` - Listar todos los administradores

```bash
node scripts/list-admins.js
```

**Salida:**

```
✅ Se encontraron 2 administrador(es):

1. 👤 Admin One
   📧 admin1@example.com
   🎭 Rol: super_admin
   📅 Creado: 2024-03-01

2. 👤 Admin Two
   📧 admin2@example.com
   🎭 Rol: super_admin
   📅 Creado: 2024-03-05
```

---

### 3. `change-user-role.js` - Cambiar rol de un usuario

```bash
node scripts/change-user-role.js <email> <new_role>
```

**Roles válidos:** `user`, `spectator`, `super_admin`

**Ejemplo - Promover a admin:**

```bash
node scripts/change-user-role.js jaiberhiguita4@gmail.com super_admin
```

**Ejemplo - Degradar a usuario normal:**

```bash
node scripts/change-user-role.js jaiberhiguita4@gmail.com user
```

---

## ⚙️ Requisitos Previos

### 1. Credenciales Firebase

Los scripts requieren credenciales de Firebase. Asegúrate de tener **una de estas opciones:**

**Opción A: Variable de entorno** (Recomendado para producción)

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"..."}'
```

**Opción B: Archivo local** (Para desarrollo)

```bash
# Asegurar que Firebasekey.json existe en server/
ls server/Firebasekey.json
```

### 2. Dependencias Node.js

```bash
cd server/
npm install
```

---

## 🚀 Cómo Ejecutar

### Desde la raíz del proyecto:

```bash
# Opción 1: Con Node.js y archivos relativos
node scripts/check-user-role.js jaiberhiguita4@gmail.com

# Opción 2: Con node_modules de server
cd server && node ../scripts/check-user-role.js jaiberhiguita4@gmail.com
```

### Con variables de entorno:

```bash
# Cargar .env del server
export $(cat server/.env | xargs)

# Ejecutar script
node scripts/check-user-role.js jaiberhiguita4@gmail.com
```

---

## 📊 Sistema de Roles

| Rol             | Descripción                   | Permisos                                                   |
| --------------- | ----------------------------- | ---------------------------------------------------------- |
| **user**        | Usuario regular (por defecto) | Ver/crear proyectos, subir archivos, participar en streams |
| **spectator**   | Espectador                    | Ver streams, chat, votaciones (solo lectura)               |
| **super_admin** | Administrador                 | Listar usuarios, cambiar roles, acceso a `/api/admin/*`    |

---

## 🔒 Seguridad

- Los scripts acceden directamente a Firebase Firestore
- Requieren credenciales válidas
- **NUNCA** compartas credenciales en código o repositorios públicos
- Usa variables de entorno en producción

---

## 📝 Logging y Auditoría

Cada cambio de rol queda registrado con:

- Email del usuario
- Rol anterior
- Rol nuevo
- Timestamp de la actualización (`updatedAt`)

**Consultar en Firebase Firestore:**

```
Collection: users
Buscar por: email
Campo: role, updatedAt
```

---

## ⚠️ Troubleshooting

### Error: "Firebase credentials not found"

```bash
# Solución: Asegurar que Firebasekey.json existe o FIREBASE_SERVICE_ACCOUNT está set
ls server/Firebasekey.json
echo $FIREBASE_SERVICE_ACCOUNT
```

### Error: "Usuario NO encontrado"

- Verificar que el email está exactamente correcto
- Buscar en Firebase Console: https://console.firebase.google.com

### Error: "Rol inválido"

- Roles permitidos: `user`, `spectator`, `super_admin`
- Revisar ortografía (case-sensitive en algunos casos)

---

## 📞 Ejemplos Completos

### Verificar si un usuario es admin

```bash
node scripts/check-user-role.js jaiberhiguita4@gmail.com

# Buscar en salida: "ES ADMINISTRADOR" o "NO es administrador"
```

### Hacer a alguien admin

```bash
node scripts/change-user-role.js jaiberhiguita4@gmail.com super_admin
# Verificar cambio:
node scripts/check-user-role.js jaiberhiguita4@gmail.com
```

### Listar todos los admins

```bash
node scripts/list-admins.js
```

---
