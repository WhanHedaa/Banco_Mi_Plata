# Sistema Bancario "Mi Plata" - Proyecto de Aula

**Institución:** CESDE  
**Programa:** Desarrollo de Software  
**Semestre:** 2do  
**Herramienta:** JavaScript (Frontend)  
**Docente:** Jorge Albeiro Muriel Vélez  
**Proyecto:** Sistema de transacciones bancarias con POO  

---

## 📋 Descripción del Proyecto

Esta aplicación web simula el sistema de transacciones de la sucursal bancaria **"Mi Plata"**.  
Fue desarrollada aplicando los pilares de la **Programación Orientada a Objetos (POO)** en JavaScript puro (vanilla), sin frameworks, para demostrar comprensión de:

- **Abstracción**
- **Encapsulamiento**
- **Herencia**
- **Polimorfismo**

La interfaz es responsiva y tiene una identidad visual corporativa bancaria (colores azul oscuro + verde menta).

---

## 🏗️ Estructura del Proyecto

```
mi-plata/
├── index.html          → Página principal (todas las vistas)
├── css/
│   └── styles.css      → Estilos responsivos y diseño
├── js/
│   ├── clases.js       → Todas las clases del dominio (POO)
│   └── app.js          → Lógica de la aplicación e interfaz
└── README.md           → Este archivo
```

---

## 🧩 Implementación de POO (clases.js)

### Clases definidas:

| Clase              | Descripción |
|--------------------|-------------|
| `Movimiento`       | Representa una transacción (fecha, tipo, valor, descripción) |
| `Cuenta`           | Clase base (abstracta) con saldo, consignar, retirar, transferir |
| `CuentaAhorros`    | Extiende Cuenta. Aplica 1.5% de interés al retirar |
| `CuentaCorriente`  | Extiende Cuenta. Permite sobregiro del 20% |
| `TarjetaCredito`   | Extiende Cuenta. Compras a cuotas con tasas según plazo |
| `Cliente`          | Persona con datos personales, contraseña y lista de cuentas |
| `Banco`            | Gestor del sistema (registro, autenticación, persistencia) |

### Herencia
```
Cuenta (base)
 ├── CuentaAhorros
 ├── CuentaCorriente
 └── TarjetaCredito
```

### Polimorfismo
El método `calcularRetiro(monto)` se comporta diferente según el tipo de cuenta:

- **Ahorros:** Calcula y suma el 1.5% de interés sobre el saldo antes de descontar el retiro.
- **Corriente:** Permite retirar hasta saldo + 20% (sobregiro).
- **Crédito:** Valida contra el cupo disponible.

### Encapsulamiento
Se usan campos privados con `#` (sintaxis moderna de JavaScript):
- `#saldo`, `#numeroCuenta`, `#movimientos`
- `#password`, `#intentosFallidos`, `#bloqueado`
- Getters y métodos controlados para acceder/modificar.

---

## 💳 Productos Bancarios y Reglas de Negocio

### 1. Cuenta de Ahorros
- Consignación y retiro.
- **Interés:** 1.5% mensual aplicado **en el momento del retiro**.
- No se puede retirar más del saldo disponible.

### 2. Cuenta Corriente
- No genera intereses.
- **Sobregiro:** hasta 20% adicional sobre el saldo actual.
- Ejemplo: saldo $1.000.000 → se puede retirar hasta $1.200.000.

### 3. Tarjeta de Crédito
- Cupo inicial por defecto: $5.000.000.
- Compras a cuotas con la siguiente tabla de tasas:

| Cuotas     | Tasa mensual | Observación      |
|------------|--------------|------------------|
| ≤ 2        | 0%           | Sin interés      |
| 3 – 6      | 1.9%         | Interés moderado |
| ≥ 7        | 2.3%         | Interés alto     |

**Fórmula de cuota mensual:**
```
Cuota = (Capital × tasa) / (1 − (1 + tasa)^(−n))
```
Donde `tasa` es decimal y `n` es el número de cuotas.

Al realizar una compra se muestra al usuario el valor de la cuota mensual resultante.

---

## 🔐 Módulo de Registro y Autenticación

### Registro
Campos obligatorios:
- Número de identificación
- Nombre completo
- Número de celular
- Nombre de usuario (único)
- Contraseña + confirmación
- Tipo de producto inicial (Ahorros / Corriente / Tarjeta)

**Un mismo usuario puede tener las 3 cuentas activas al mismo tiempo.**  
Desde el Panel de Transacciones puede abrir los productos que le falten con el botón **"+ Abrir nuevo producto"**.

### Login
- Validación de usuario y contraseña.
- **Máximo 3 intentos fallidos**.
- Contador de intentos visible.
- Al tercer intento la cuenta se **bloquea** y se muestra mensaje informativo.
- Solo un administrador puede desbloquear.

### CRUD de Usuarios (solo Admin)
Usuario por defecto:
- **Usuario:** `admin`
- **Contraseña:** `admin123`

Funciones:
- Agregar nuevos usuarios
- Editar nombre y celular
- Eliminar usuarios (con confirmación)
- Desbloquear cuentas bloqueadas

---

## 🏦 Panel de Transacciones

Una vez autenticado el usuario ve:

| Función              | Descripción |
|----------------------|-------------|
| Consultar Saldo      | Muestra saldo actual (o disponible + deuda en tarjeta) |
| Consignar            | Deposita dinero (valida monto > 0) |
| Retirar              | Aplica reglas según tipo de cuenta |
| Ver Movimientos      | Historial ordenado por fecha descendente (Array) |
| Transferir           | Entre productos del mismo usuario o a otros usuarios. **No permite** transferir al mismo producto |
| Abrir nuevo producto | Permite abrir Ahorros, Corriente o Tarjeta si aún no las tiene (máx. 3 productos) |
| Perfil               | Editar nombre/celular + cambio de contraseña |
| Compra a Cuotas      | Solo visible en Tarjeta de Crédito |
| Cerrar Sesión        | Cierra la sesión actual |

Cada movimiento guarda: **Fecha y hora**, **Tipo** y **Valor**.

---

## 🎨 Interfaz y Diseño

- **Diseño responsivo** (desktop, tablet y móvil).
- Landing page con presentación institucional, menú y footer.
- Colores corporativos: azul oscuro (#0a2540) + verde menta (#00d4aa).
- Mensajes claros de éxito, error y advertencia en cada operación.
- Modales para formularios de operaciones.
- Navegación por secciones sin recargar la página.

---

## 💾 Persistencia

Los datos se guardan en **localStorage** del navegador.  
Esto permite que los usuarios, cuentas y movimientos se mantengan aunque se cierre el navegador (mientras no se limpie el almacenamiento).

---

## 🚀 Cómo ejecutar el proyecto

1. Descomprime la carpeta `mi-plata`.
2. Abre el archivo `index.html` directamente en cualquier navegador moderno (Chrome, Edge, Firefox).
3. ¡Listo! No necesita servidor ni instalación de dependencias.

**Recomendación:** Usa Live Server en Visual Studio Code si quieres recarga automática.

---

## 👤 Usuario de prueba (Administrador)

```
Usuario: admin
Contraseña: admin123
```

Con este usuario puedes:
- Ver el panel de transacciones
- Acceder a **Admin Usuarios** (CRUD completo)
- Desbloquear cuentas bloqueadas

---

## ✅ Lista de Chequeo cumplida

### 5.1 Implementación de POO
- [x] Clases: Cliente, Cuenta, CuentaAhorros, CuentaCorriente, TarjetaCredito
- [x] Herencia correctamente implementada
- [x] Polimorfismo en `calcularRetiro()`

### 5.2 Registro y Autenticación
- [x] Formulario de registro completo
- [x] Formulario de login funcional
- [x] Validación de usuario/contraseña
- [x] Contador de intentos visible
- [x] Bloqueo después de 3 intentos
- [x] CRUD de usuarios

### 5.3 Módulo de Transacciones
- [x] Redirección al panel tras login
- [x] Consultar saldo
- [x] Consignar con validación
- [x] Retirar con validación de saldo
- [x] Sobregiro 20% en Cuenta Corriente
- [x] Interés 1.5% en Cuenta de Ahorros
- [x] Historial de movimientos (Array)
- [x] Transferencias entre productos distintos
- [x] Transferencias a otros usuarios
- [x] Restricción mismo producto

### 5.4 Tarjeta de Crédito
- [x] ≤ 2 cuotas sin interés
- [x] 1.9% para 3-6 cuotas
- [x] 2.3% para ≥ 7 cuotas
- [x] Pago mensual mostrado

### 5.5 Perfil y Seguridad
- [x] Edición de perfil
- [x] Cambio de contraseña completo

### 5.6 Interfaz
- [x] Diseño responsivo
- [x] Landing page + menú + footer
- [x] Coherencia visual en login/registro
- [x] Mensajes de retroalimentación

---

## 📝 Notas del estudiante

Este proyecto fue desarrollado aplicando los conceptos vistos en clase de JavaScript y Programación Orientada a Objetos.  

Se priorizó:
1. Código legible y comentado.
2. Separación de responsabilidades (clases vs. lógica de UI).
3. Experiencia de usuario clara y mensajes informativos.
4. Cumplimiento estricto de las reglas de negocio del documento.

¡Mucho éxito con la evaluación! 🚀

---

**Desarrollado como Proyecto de Aula - CESDE**  
*Sistema Bancario "Mi Plata"*
