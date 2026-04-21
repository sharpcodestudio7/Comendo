// src/components/admin/ProductosCRUD.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import ModalConfirm from '../ModalConfirm';
import { exportarProductos } from '../../api/exportService';

const ProductosCRUD = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);

  const formVacio = { nombre: '', descripcion: '', precio: '', id_categoria: '', disponible: true };
  const [form, setForm] = useState(formVacio);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: prods, error: errorProds }, { data: cats }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('*').order('nombre'),
    ]);
    console.log('Productos:', prods);
    console.log('Error:', errorProds);
    setProductos(prods || []);
    setCategorias(cats || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirCrear = () => {
    setProductoEditando(null);
    setForm(formVacio);
    setImagenPreview(null);
    setImagenArchivo(null);
    setError(null);
    setModalAbierto(true);
  };

  const abrirEditar = (producto) => {
    setProductoEditando(producto);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      id_categoria: producto.id_categoria,
      disponible: producto.disponible,
    });
    setImagenPreview(producto.imagen_url || null);
    setImagenArchivo(null);
    setError(null);
    setModalAbierto(true);
  };

  const handleImagenChange = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImagenArchivo(archivo);
    setImagenPreview(URL.createObjectURL(archivo));
  };

  const subirImagen = async (productoId) => {
    if (!imagenArchivo) return null;
    const extension = imagenArchivo.name.split('.').pop();
    const nombreArchivo = `${productoId}.${extension}`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(nombreArchivo, imagenArchivo, { upsert: true });
    if (error) throw new Error(`Error al subir imagen: ${error.message}`);
    const { data } = supabase.storage.from('productos').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  };

  const handleGuardar = async () => {
    if (!form.nombre || !form.precio || !form.id_categoria) {
      setError('Nombre, precio y categoría son obligatorios.');
      return;
    }
    try {
      setGuardando(true);
      setError(null);
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        id_categoria: form.id_categoria,
        disponible: form.disponible,
      };
      if (productoEditando) {
        await supabase.from('productos').update(payload).eq('id_producto', productoEditando.id_producto);
        if (imagenArchivo) {
          const urlImagen = await subirImagen(productoEditando.id_producto);
          await supabase.from('productos').update({ imagen_url: urlImagen }).eq('id_producto', productoEditando.id_producto);
        }
      } else {
        const { data: nuevo } = await supabase.from('productos').insert(payload).select().single();
        if (imagenArchivo && nuevo) {
          const urlImagen = await subirImagen(nuevo.id_producto);
          await supabase.from('productos').update({ imagen_url: urlImagen }).eq('id_producto', nuevo.id_producto);
        }
      }
      await cargarDatos();
      setModalAbierto(false);
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (productoId) => setModalEliminar(productoId);

  const confirmarEliminar = async () => {
    await supabase.storage.from('productos').remove([
      `${modalEliminar}.jpg`,
      `${modalEliminar}.png`,
      `${modalEliminar}.webp`
    ]);
    await supabase.from('productos').delete().eq('id_producto', modalEliminar);
    setModalEliminar(null);
    await cargarDatos();
  };

  const toggleDisponible = async (producto) => {
    await supabase.from('productos').update({ disponible: !producto.disponible }).eq('id_producto', producto.id_producto);
    await cargarDatos();
  };

  const formatCOP = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

  console.log('Estado cargando:', cargando, '| Productos:', productos.length);

  if (cargando) return <p style={{ color: '#fff' }}>Cargando productos...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titulo}>🍛 Gestión de Productos</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnExportar} onClick={() => exportarProductos(productos)}>
            ⬇ Exportar Excel
          </button>
          <button style={styles.btnCrear} onClick={abrirCrear}>
            + Nuevo Producto
          </button>
        </div>
      </div>

      <div style={styles.tabla}>
        {productos.length === 0 ? (
          <p style={{ color: '#888' }}>No hay productos registrados.</p>
        ) : (
          productos.map((producto) => (
            <div key={producto.id_producto} style={styles.fila}>
              <div style={styles.filaIzquierda}>
                {producto.imagen_url ? (
                  <img src={producto.imagen_url} alt={producto.nombre} style={styles.imagenMiniatura} />
                ) : (
                  <div style={styles.imagenPlaceholder}>🍽</div>
                )}
                <div style={styles.filaInfo}>
                  <span style={styles.nombre}>{producto.nombre}</span>
                  <span style={styles.categoria}>{producto.categorias?.nombre}</span>
                  <span style={styles.precio}>{formatCOP(producto.precio)}</span>
                </div>
              </div>
              <div style={styles.filaAcciones}>
                <button
                  style={{ ...styles.btnToggle, backgroundColor: producto.disponible ? '#2D6A4F' : '#555' }}
                  onClick={() => toggleDisponible(producto)}
                >
                  {producto.disponible ? '✅ Disponible' : '❌ Oculto'}
                </button>
                <button style={styles.btnEditar} onClick={() => abrirEditar(producto)}>✏️ Editar</button>
                <button style={styles.btnEliminar} onClick={() => handleEliminar(producto.id_producto)}>🗑 Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <>
          <div style={styles.overlay} onClick={() => setModalAbierto(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitulo}>
              {productoEditando ? '✏️ Editar Producto' : '+ Nuevo Producto'}
            </h3>
            <div style={styles.campos}>
              <input
                style={styles.input}
                placeholder="Nombre del producto"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <textarea
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                placeholder="Descripción (opcional)"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Precio (ej: 24000)"
                type="number"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
              <select
                style={styles.input}
                value={form.id_categoria}
                onChange={(e) => setForm({ ...form, id_categoria: e.target.value })}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              <div style={styles.imagenUpload}>
                <label style={styles.label}>Imagen del producto</label>
                {imagenPreview && (
                  <img src={imagenPreview} alt="Preview" style={styles.imagenPreview} />
                )}
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImagenChange}
                  style={styles.inputFile}
                />
                <p style={styles.imagenHint}>JPG, PNG o WebP — máx 2MB</p>
              </div>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                />
                <span style={{ color: '#ccc', marginLeft: '8px' }}>Disponible en el menú</span>
              </label>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalBotones}>
              <button style={styles.btnCancelar} onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button
                style={{ ...styles.btnGuardar, opacity: guardando ? 0.7 : 1 }}
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ✅ Modal eliminar DENTRO del return */}
      {modalEliminar && (
        <ModalConfirm
          titulo="Eliminar Producto"
          mensaje="¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer."
          labelConfirmar="Eliminar"
          colorConfirmar="#E53935"
          onConfirmar={confirmarEliminar}
          onCancelar={() => setModalEliminar(null)}
        />
      )}

    </div>
  );
};

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo: { margin: 0, color: '#fff', fontSize: '22px' },
  btnCrear: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  btnExportar: { padding: '10px 20px', backgroundColor: '#1565C0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' },
  tabla: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fila: { backgroundColor: '#16213e', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  filaIzquierda: { display: 'flex', alignItems: 'center', gap: '16px' },
  imagenMiniatura: { width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' },
  imagenPlaceholder: { width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#0f3460', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  filaInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  nombre: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  categoria: { color: '#888', fontSize: '13px' },
  precio: { color: '#4CAF50', fontWeight: '700', fontSize: '15px' },
  filaAcciones: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnToggle: { padding: '8px 12px', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnEditar: { padding: '8px 12px', backgroundColor: '#F57C00', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnEliminar: { padding: '8px 12px', backgroundColor: '#E53935', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#16213e', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '480px', zIndex: 101, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo: { margin: '0 0 24px', color: '#fff', fontSize: '20px' },
  campos: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  input: { padding: '12px', backgroundColor: '#0f3460', border: '1px solid #2D6A4F', borderRadius: '8px', color: '#fff', fontSize: '15px', width: '100%', boxSizing: 'border-box' },
  label: { color: '#ccc', fontSize: '14px', fontWeight: '600', marginBottom: '6px', display: 'block' },
  imagenUpload: { display: 'flex', flexDirection: 'column', gap: '8px' },
  imagenPreview: { width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2D6A4F' },
  inputFile: { color: '#ccc', fontSize: '14px' },
  imagenHint: { color: '#555', fontSize: '12px', margin: 0 },
  checkLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
  error: { color: '#E53935', fontSize: '13px', marginBottom: '12px' },
  modalBotones: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  btnCancelar: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnGuardar: { padding: '10px 20px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' },
};

export default ProductosCRUD;