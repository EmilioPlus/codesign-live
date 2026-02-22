# CoDesign LIVE

## 📘 Descripción

CoDesign LIVE es una plataforma web interactiva diseñada para facilitar la co-creación digital en tiempo real entre diseñadores y clientes.

El sistema integra transmisión en vivo, visualización 3D interactiva y espacios colaborativos en un entorno unificado, optimizando los procesos de revisión, retroalimentación y personalización de proyectos digitales.

El objetivo principal es reducir la fricción en la comunicación técnica y mejorar la eficiencia en los flujos de trabajo creativos.
---

## 📚 Funcionalidades (MVP)

🔐 Autenticación y gestión de usuarios

📁 Creación de proyectos / salas colaborativas

🎥 Streaming en tiempo real (WebRTC)

🧊 Visualización de modelos 3D (.glb / .gltf)

🔄 Sincronización básica de cámara y transformaciones

💬 Chat en tiempo real por sala

🗂 Foro por proyecto con hilos y respuestas

📎 Adjuntos en discusiones

---

## 👥 Integrantes

- Jiaber Emilio Higuita
- Andres Londoño Avedaño

Tecnológico de Antioquia  
Ingeniería en Software  
2025
---

## Arquitectura

El sistema sigue una arquitectura cliente-servidor organizada de forma modular:

---

## Frontend

Aplicación SPA desarrollada en React.

Arquitectura monolítica modular organizada por dominios.

Comunicación con backend mediante API REST.

Integración de renderizado 3D con Three.js.

Gestión de navegación con React Router.

---

## Backend

API REST construida con Node.js y Express.

Middleware para manejo global de errores.

Configuración segura de CORS.

Estructura modular por rutas, controladores y middlewares.

Base de Datos y Servicios

Firebase (Authentication, Firestore y Storage).

---

## Requisitos

Node.js v18+

npm

Git

WebRTC y WebGL

---
## 🛠 Instrucciones de Instalación y Ejecución

  ** Backend **

  1️⃣ Clonar el repositorio
  
      git clone https://github.com/tu-usuario/codesign-live.git
      
      cd codesign-live
      
  2️⃣ Ingresar a la carpeta del servidor
  
      cd server
      
  3️⃣ Instalar dependencias
  
      npm install
      
  4️⃣ Ejecutar el servidor en modo desarrollo
  
      npm run dev
      
  5️⃣ Verificar que la API está corriendo en: http://localhost:4000
  
  ⚠️ Nota técnica (ES Modules)
  
      El backend utiliza sintaxis de módulos ES (import/export).
      Si al ejecutar npm run dev aparece un error relacionado con Cannot use import statement outside a module, verifique que en el archivo package.
      json del servidor exista la siguiente configuración:  "type": "module"
      Si no está presente, agréguela y vuelva a ejecutar: npm run dev

      
  ** Frontend **
  
  6️⃣ Abrir una nueva terminal e ingresar a la carpeta del cliente
  
      cd client
      
  7️⃣ Instalar dependencias
  
      npm install
      
      Durante la instalación, puede aparecer un mensaje indicando vulnerabilidades o sugerencias para actualizar dependencias
      (por ejemplo relacionadas con ESLint).
      
      ⚠️ Importante:
      
          No ejecutar: npm audit fix --force.
          Puedes usar npm audit fix si aun asi persisten las actualizaciones, continua sin force. 
          El uso de --force puede instalar versiones incompatibles de dependencias (por ejemplo ESLint 10), 
          generando conflictos con typescript-eslint y rompiendo la instalación del proyecto.
          Las vulnerabilidades reportadas por npm audit suelen provenir de subdependencias internas y no afectan el entorno de desarrollo del proyecto.
          En caso de que aparezcan advertencias, se recomienda continuar sin forzar actualizaciones automáticas.
          
  8️⃣ Ejecutar el frontend
  
      npm run dev
      
  9️⃣ Acceder a la aplicación en: http://localhost:5173

    
