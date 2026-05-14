# Comendo — Sistema POS para Mr. Arroz Paisa

## Idioma
Siempre responde en **español**. Toda comunicación, explicaciones, comentarios de código y sugerencias deben estar en español.

---

## Descripción del Proyecto

**Comendo** es una PWA (Progressive Web App) de gestión de pedidos para el restaurante **Mr. Arroz Paisa**. Permite a los comensales hacer pedidos desde su mesa escaneando un QR, a la cocina gestionar el flujo de preparación en tiempo real, y a los meseros saber cuándo entregar los pedidos.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| State management | Zustand v5 |
| Routing | React Router v7 |
| Iconos | Lucide React |
| Estilos | CSS-in-JS (estilos inline en los componentes) |
| Exportación | xlsx + file-saver |
| QR | qrcode.react |
| PWA | manifest.json + Service Worker |

---

## Estructura del Proyecto

```
comendo/
├── src/
│   ├── api/
│   │   ├── supabase.js           # Cliente Supabase
│   │   ├── orderService.js       # Crear/agregar pedidos + descuento inventario
│   │   ├── meseroService.js      # Auto-asignación de mesero
│   │   └── exportService.js      # Exportación Excel
│   ├── components/
│   │   ├── admin/                # Módulos del panel admin
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProductosCRUD.jsx
│   │   │   ├── InsumosCRUD.jsx
│   │   │   ├── RecetasCRUD.jsx
│   │   │   ├── MesasQR.jsx
│   │   │   ├── MonitorMesas.jsx
│   │   │   ├── MovimientosInventario.jsx
│   │   │   └── MeserosCRUD.jsx
│   │   ├── CartDrawer.jsx        # Carrito lateral del comensal
│   │   ├── ProductCard.jsx       # Tarjeta de producto en el menú
│   │   ├── ProductDetailModal.jsx # Modal para personalizar pedido
│   │   ├── ModalConfirm.jsx      # Modal genérico de confirmación
│   │   ├── PageTransition.jsx    # Wrapper de transición de entrada entre páginas
│   │   ├── SkeletonCard.jsx      # Skeleton loader
│   │   ├── ProtectedRoute.jsx    # Protege rutas de Admin
│   │   └── ProtectedKDS.jsx      # Protege rutas de Cocina
│   ├── hooks/
│   │   ├── useMenu.js            # Carga categorías y productos desde Supabase
│   │   ├── useKDS.js             # Estado del KDS + Realtime
│   │   ├── useActivePedido.js    # Detecta pedido activo de la mesa (Recibido/Preparando/Listo/Entregado)
│   │   ├── useSesionMesa.js      # Gestiona token de sesión de mesa + retorna numero de mesa
│   │   └── useKDSSound.js        # Alertas sonoras con Web Audio API
│   ├── pages/
│   │   ├── MenuPage.jsx          # Vista del comensal
│   │   ├── KDSPage.jsx           # Kitchen Display System
│   │   ├── OrderTrackingPage.jsx # Seguimiento del pedido en tiempo real
│   │   ├── MeseroPage.jsx        # Vista del mesero
│   │   ├── LoginPage.jsx         # Login para admin y cocina
│   │   └── AdminPage.jsx         # Panel administrativo
│   ├── store/
│   │   └── useCartStore.js       # Zustand: carrito del comensal
│   ├── App.jsx                   # Rutas de la app
│   ├── main.jsx                  # Entry point
│   └── registerSW.js             # Service Worker
├── public/
│   ├── manifest.json             # Config PWA
│   └── sw.js                     # Service Worker
├── index.html
├── vite.config.js
├── vercel.json                       # Rewrites SPA para Vercel
└── package.json
```

---

## Rutas de la Aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | MenuPage | Público |
| `/mesa/:mesaId` | MenuPage | Público (vía QR) |
| `/pedido/:pedidoId` | OrderTrackingPage | Público |
| `/cocina` | KDSPage | Rol: Operario_Cocina |
| `/mesero` | MeseroPage | Sin login (localStorage) |
| `/login` | LoginPage | Público |
| `/admin` | AdminPage | Rol: Administrador |

---

## Base de Datos Supabase

### Tablas principales

- **usuarios** — id_usuario, email, nombre, rol (Administrador / Operario_Cocina / Mesero)
- **mesas** — id_mesa, numero, estado (Libre / Ocupada / Por_Pagar), token_sesion_actual
- **categorias** — id_categoria, nombre
- **productos** — id_producto, id_categoria, nombre, descripcion, precio, disponible, imagen_url
- **pedidos** — id_pedido, id_mesa, id_mesero, estado_actual, total, metodo_pago, fecha_creacion, fecha_listo
- **detalle_pedidos** — id_detalle, id_pedido, id_producto, cantidad, precio_unitario, subtotal, notas
- **exclusiones_pedido** — id_exclusion, id_detalle, id_insumo, nombre_insumo, cantidad_no_descontada, unidad_medida
- **insumos** — id_insumo, nombre, cantidad_stock, unidad_medida
- **recetas** — id_receta, id_producto, id_insumo, cantidad_requerida
- **movimientos_inventario** — id_movimiento, id_insumo, tipo, cantidad, cantidad_anterior, cantidad_nueva, motivo, id_pedido, fecha

### Estados del pedido
`Recibido → Preparando → Listo → Entregado → Pagado`

### Método de pago
`efectivo | tarjeta`

---

## Lógica de Negocio Clave

### Descuento de inventario (RF-3.1)
Al crear o agregar items a un pedido, `orderService.js` descuenta insumos del stock **respetando las exclusiones** — si el comensal excluyó un ingrediente, ese insumo no se descuenta. Se registra en `movimientos_inventario`.

### Auto-asignación de mesero
Cuando un pedido cambia a estado "Listo", `meseroService.js` asigna automáticamente el mesero con menor carga de pedidos pendientes.

### Solicitar la cuenta
Cuando el comensal solicita la cuenta en `OrderTrackingPage`, se cierran **todos** los pedidos activos de la mesa (no solo el del URL) consultando por `id_mesa` con `.in('estado_actual', ['Recibido','Preparando','Listo','Entregado'])`. Luego se libera la mesa (`estado: 'Libre', token_sesion_actual: null`).

### Sesión de mesa
`useSesionMesa` gestiona el token UUID en localStorage para determinar qué dispositivo es "dueño" de la sesión. También retorna `numeroMesa` (número visible, no UUID) obtenido en la misma query. El badge en MenuPage siempre muestra `Mesa {numero}`, nunca el UUID.

### Carrito y animaciones
`useCartStore` tiene el campo `cartAnimationTrigger` (entero) que se incrementa en cada `agregarItem`. `MenuPage` lo escucha con `useEffect` para disparar el bounce del ícono del carrito en la barra inferior.

### Realtime
Las páginas KDS, OrderTracking y Mesero usan Supabase Realtime (canales PostgreSQL) para actualizar el estado sin recarga.

### Alertas sonoras en cocina
`useKDSSound.js` usa la Web Audio API para emitir beeps al recibir nuevos pedidos o detectar pedidos urgentes (más de 15 minutos).

### iOS / Mobile
- Siempre usar `WebkitOverflowScrolling: 'touch'` en contenedores con `overflowY: auto`
- `env(safe-area-inset-bottom)` en `paddingBottom` de barras fijas inferiores (bottomNav, CartDrawer footer, ProductDetailModal footer)
- Botones de acción principales fuera del área de scroll (footer con `flexShrink: 0`)
- Mínimo 44px de alto en botones tocables

---

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con:

```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

---

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
npm run lint     # Linter ESLint
```

---

## Convenciones del Proyecto

- **Estilos:** CSS-in-JS con objetos de estilo inline (sin Tailwind, sin módulos CSS)
- **Componentes:** Funcionales con hooks. Un archivo por componente.
- **Nombres:** camelCase para variables/funciones, PascalCase para componentes
- **Supabase:** Todas las queries pasan por `src/api/supabase.js`
- **Sin comentarios innecesarios:** Solo cuando el "por qué" no es obvio
- **Sin manejo de errores especulativo:** Solo validar en los límites del sistema

---

## Contexto del Negocio

- Restaurante: **Mr. Arroz Paisa**
- Flujo principal: Comensal escanea QR → hace pedido → cocina lo prepara → mesero lo entrega
- Impoconsumo: 8% calculado en CartDrawer sobre el subtotal
- Métodos de pago: Efectivo, Tarjeta
- Meseros se identifican con localStorage (sin login formal)
- Deploy: Vercel (SPA con rewrites en `vercel.json`)
