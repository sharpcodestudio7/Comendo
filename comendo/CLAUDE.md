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
| Exportación | xlsx + file-saver + jszip |
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
- **mesas** — id_mesa, numero, estado (Libre / Ocupada / Por_Pagar), token_sesion_actual, token_creado_en, status_
- **categorias** — id_categoria, nombre
- **productos** — id_producto, id_categoria, nombre, descripcion, precio, disponible, imagen_url
- **pedidos** — id_pedido, id_mesa, id_mesero, estado_actual, total, metodo_pago, fecha_creacion, fecha_preparando, fecha_listo, fecha_entregado
- **detalle_pedidos** — id_detalle, id_pedido, id_producto, cantidad, precio_unitario, subtotal, notas
- **exclusiones_pedido** — id_exclusion, id_detalle, id_insumo, nombre_insumo, cantidad_no_descontada, unidad_medida
- **insumos** — id_insumo, nombre, cantidad_stock, unidad_medida
- **recetas** — id_receta, id_producto, id_insumo, cantidad_requerida
- **movimientos_inventario** — id_movimiento, id_insumo, tipo, cantidad, cantidad_anterior, cantidad_nueva, motivo, id_pedido, fecha

### Estados del pedido
`Recibido → Preparando → Listo → Entregado → Pagado`

### Método de pago
`efectivo | nequi | daviplata`

---

## Lógica de Negocio Clave

### Descuento de inventario (RF-3.1)
Al crear o agregar items a un pedido, `orderService.js` descuenta insumos del stock **respetando las exclusiones** — si el comensal excluyó un ingrediente, ese insumo no se descuenta. Se registra en `movimientos_inventario`.

### Timestamps de etapas del pedido
La tabla `pedidos` registra el momento exacto de cada transición de estado para poder medir tiempos de operación:
- `fecha_creacion` — cuando se crea el pedido (estado Recibido)
- `fecha_preparando` — cuando cocina presiona "Iniciar" (estado Preparando) — se guarda en `useKDS.js → cambiarEstado`
- `fecha_listo` — cuando cocina presiona "Listo" — se guarda en `useKDS.js → cambiarEstado`
- `fecha_entregado` — cuando el mesero presiona "✓ Entregado" — se guarda en `MeseroPage.jsx → marcarEntregado`

Estas columnas alimentan el **Timeline del pedido** en el Dashboard (panel de análisis de duración por etapa).

> SQL para crearlas si no existen:
> ```sql
> ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_preparando TIMESTAMPTZ;
> ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_listo      TIMESTAMPTZ;
> ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_entregado  TIMESTAMPTZ;
> ```

### Auto-asignación de mesero
Cuando un pedido cambia a estado "Listo", `meseroService.js` asigna automáticamente el mesero con menor carga de pedidos pendientes.

### Solicitar la cuenta
Cuando el comensal solicita la cuenta en `OrderTrackingPage`, el modal muestra el resumen completo de ítems pedidos (de todos los pedidos activos de la mesa) y el **total a pagar** antes de confirmar. Al confirmar se cierran **todos** los pedidos activos de la mesa consultando por `id_mesa` con `.in('estado_actual', ['Recibido','Preparando','Listo','Entregado'])`. Luego se libera la mesa (`estado: 'Libre', token_sesion_actual: null`). El banner post-confirmación también muestra el total para que el cliente lo lleve a la caja.

### Sesión de mesa y expiración de token QR
`useSesionMesa` gestiona el token UUID en localStorage para determinar qué dispositivo es "dueño" de la sesión. Retorna `esDueno`, `numeroMesa`, `cargando` y `sesionExpirada`.

- Al reclamar sesión nueva guarda `token_creado_en` en la DB y la expiración en `comendo_session_expiry_<mesaId>` (localStorage, ahora + 10 min).
- Un intervalo de 30 seg verifica si el token venció sin que se haya montado un pedido. Si venció: limpia localStorage + pone `token_sesion_actual = null` y `token_creado_en = null` en DB → activa `sesionExpirada`.
- Si ya hay pedido activo al momento de la verificación, elimina la clave de expiración y la sesión continúa indefinidamente.
- En Supabase hay un job de `pg_cron` (cada minuto) con la función `limpiar_tokens_expirados()` que limpia tokens cuyo `token_creado_en` tenga más de 10 min y la mesa no tenga pedidos activos — cubre el caso de browsers cerrados antes de expirar.
- Cuando `sesionExpirada = true`, `MenuPage` muestra una pantalla completa indicando que deben re-escanear el QR.

### Soft delete en CRUDs
Todos los CRUDs de entidades usan la columna `status_` (integer, 1 = activo, 0 = inactivo) en lugar de `DELETE` real. Patrón:
- Filtrar activos: `.eq('status_', 1)`
- Eliminar: `.update({ status_: 0 })`
- Reactivar: `.update({ status_: 1 })`
- Cada CRUD tiene botón "Ver inactivos" y botón "Reactivar" por ítem.
- **Excepción:** `RecetasCRUD` usa `DELETE` real porque opera sobre la tabla pivote `recetas` (relación insumo↔producto), no sobre una entidad del negocio.

### Gestión de meseros en MeseroPage
`MeseroPage` incluye CRUD de meseros directamente en la pantalla de selección (sin ir al admin):
- **Crear:** botón "+ Nuevo mesero" en el footer del selector → formulario inline.
- **Desactivar:** botón 🗑 en cada fila → abre `ModalConfirm` → `status_: 0`.
- **Ver inactivos / Reactivar:** botón "🗂 Ver inactivos" alterna la lista; cada inactivo tiene botón "Reactivar" → `status_: 1`.
- Función `cargarListaMeseros()` filtra por `status_` según el toggle activo.
- `MeserosCRUD` en el admin panel mantiene la misma funcionalidad para el administrador.

### Paleta de colores y tema visual
Todo el proyecto usa **tema oscuro** con paleta dorada/cobre. Tokens principales:
- Fondos: `#0D0D0D` (página), `#1A1A1A` (cards/superficies), `#2A2A2A` (inputs/secundario)
- Bordes: `#333`
- Texto: `#FFFFFF` (primario), `#AAAAAA` (secundario), `#666` (atenuado)
- Acento dorado: `#C8A84E` (gold), `#B87333` (cobre), `#D4922A` (ámbar)
- Rojo/danger: `#8B1A1A`
- Tipografía branding: `Georgia, serif` italic en `#C8A84E` para títulos de marca
- Tipografía general: `sans-serif`
- **No usar** azules (`#1a1a2e`, `#16213e`) ni verdes (`#2D6A4F`) — son colores del tema antiguo.

### Carrito y animaciones
`useCartStore` tiene el campo `cartAnimationTrigger` (entero) que se incrementa en cada `agregarItem`. `MenuPage` lo escucha con `useEffect` para disparar el bounce del ícono del carrito en la barra inferior.

### Realtime
Las páginas KDS, OrderTracking y Mesero usan Supabase Realtime (canales PostgreSQL) para actualizar el estado sin recarga.

### Dashboard — Gráficas y analítica
El `Dashboard.jsx` incluye las siguientes secciones de analítica (todas usando `recharts`):

1. **KPIs** — Ventas, pedidos y ticket promedio con comparación vs período anterior (Hoy / Semana / Mes).
2. **Tendencia de ventas** — `AreaChart` con total de ventas por día, últimos 30 días.
3. **Ventas por categoría** — `LineChart` multi-línea, una línea por categoría activa, últimos 30 días. Las categorías se detectan dinámicamente de la DB.
4. **Ventas por producto** — `LineChart` multi-línea, top 7 productos por ventas totales, últimos 30 días.
5. **Productos Estrella** — Ranking top 5 con barras de progreso (tab Hoy / Este Mes).
6. **Distribución de pagos** — `PieChart` donut con efectivo vs tarjeta.
7. **Inventario bajo** — Lista de los 5 insumos con menor stock relativo, con semáforo de color.
8. **Ingredientes más excluidos** — Ranking de exclusiones solicitadas por comensales.
9. **Notas recientes** — Últimas 6 personalizaciones escritas por comensales.
10. **Timeline del pedido** — Pipeline horizontal con tiempo promedio por etapa (Recibido→Preparando→Listo→Entregado) + 4 tarjetas resumen coloreadas por rendimiento (verde < 5 min, cobre 5–12 min, ámbar 12–20 min, rojo > 20 min).
11. **Pedidos por estado** — Contadores actuales por cada estado del flujo.

Paleta de colores para multi-línea: `CAT_COLORS = ['#B87333', '#4A90D9', '#4CAF50', '#FFB300', '#E06C75', '#9C67E0', '#00BCD4']`.

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
- Métodos de pago: Efectivo, Nequi, Daviplata
- Meseros se identifican con localStorage (sin login formal)
- Deploy: Vercel (SPA con rewrites en `vercel.json`)
