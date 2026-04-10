// src/api/exportService.js
// Servicio centralizado de exportación a Excel.
// Cada función recibe datos ya cargados y genera un archivo .xlsx

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ── Utilidad base ─────────────────────────────────────────────────────────
const exportarExcel = (datos, nombreHoja, nombreArchivo) => {
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ── 1. Exportar Productos ─────────────────────────────────────────────────
export const exportarProductos = (productos) => {
  const datos = productos.map((p) => ({
    'Nombre': p.nombre,
    'Categoría': p.categorias?.nombre || '—',
    'Precio': p.precio,
    'Disponible': p.disponible ? 'Sí' : 'No',
    'Descripción': p.descripcion || '—',
  }));
  exportarExcel(datos, 'Productos', 'comendo_productos');
};

// ── 2. Exportar Insumos ───────────────────────────────────────────────────
export const exportarInsumos = (insumos) => {
  const datos = insumos.map((i) => {
    const limite = i.unidad_medida === 'Unidades' ? 10 : 1000;
    const estado = i.cantidad_stock <= limite * 0.25
      ? '🔴 Crítico'
      : i.cantidad_stock <= limite * 0.5
        ? '🟡 Bajo'
        : '🟢 Normal';
    return {
      'Insumo': i.nombre,
      'Stock Actual': i.cantidad_stock,
      'Unidad': i.unidad_medida,
      'Estado': estado,
    };
  });
  exportarExcel(datos, 'Inventario', 'comendo_inventario');
};

// ── 3. Exportar Recetas ───────────────────────────────────────────────────
export const exportarRecetas = (productos, recetas) => {
  const datos = recetas.map((r) => {
    const producto = productos.find((p) => p.id_producto === r.id_producto);
    return {
      'Producto': producto?.nombre || '—',
      'Insumo': r.insumos?.nombre || '—',
      'Cantidad Requerida': r.cantidad_requerida,
      'Unidad': r.insumos?.unidad_medida || '—',
    };
  });
  exportarExcel(datos, 'Recetas', 'comendo_recetas');
};

// ── 4. Exportar Ventas ────────────────────────────────────────────────────
export const exportarVentas = (pedidos) => {
  const datos = pedidos.flatMap((pedido) =>
    pedido.detalle_pedidos.map((detalle) => ({
      'ID Pedido': pedido.id_pedido.slice(0, 8).toUpperCase(),
      'Mesa': pedido.mesas?.numero ?? '—',
      'Fecha': new Date(pedido.fecha_creacion).toLocaleDateString('es-CO'),
      'Hora': new Date(pedido.fecha_creacion).toLocaleTimeString('es-CO'),
      'Producto': detalle.productos?.nombre || '—',
      'Cantidad': detalle.cantidad,
      'Precio Unitario': detalle.precio_unitario,
      'Subtotal': detalle.subtotal,
      'Total Pedido': pedido.total,
      'Estado': pedido.estado_actual,
    }))
  );
  exportarExcel(datos, 'Ventas', 'comendo_ventas');
};