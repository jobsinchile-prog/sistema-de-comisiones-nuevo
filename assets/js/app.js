const COMMISSION_RATE = 0.009;
let deferredPrompt = null;
let dailyChartInstance = null;
let monthlyChartInstance = null;
let hourlyChartInstance = null;

// Variables para el archivo CSV
let selectedFile = null;
let csvData = [];

// ==================== FUNCIONES PARA CAMBIAR PANTALLAS ====================
function showMainScreen() {
  document.getElementById('mainScreen').style.display = 'block';
  document.getElementById('analysisScreen').classList.remove('active');
  document.getElementById('crmScreen').classList.remove('active');
  refreshUI();
}

function showAnalysisScreen() {
  document.getElementById('mainScreen').style.display = 'none';
  document.getElementById('analysisScreen').classList.add('active');
  document.getElementById('crmScreen').classList.remove('active');
  calculateAndDisplayKPIs();
}

function showCRMScreen() {
  document.getElementById('mainScreen').style.display = 'none';
  document.getElementById('analysisScreen').classList.remove('active');
  document.getElementById('crmScreen').classList.add('active');
  loadProspects();
  updateProspectStats();
  actualizarNombreVendedor();
}

// ==================== FUNCIONES PARA PROSPECTOS ====================
let currentProspectId = null;
let clientFileData = [];
let clientFileHeaders = [];

function getProspectsStorage() {
  try {
    const data = localStorage.getItem('prospectos');
    const prospects = data ? JSON.parse(data) : [];
    return prospects;
  } catch (e) {
    console.error('Error leyendo prospectos:', e);
    return [];
  }
}

function setProspectsStorage(prospects) {
  try {
    localStorage.setItem('prospectos', JSON.stringify(prospects));
    return true;
  } catch (e) {
    console.error('Error guardando prospectos:', e);
    alert('Error al guardar. Verifica el espacio disponible.');
    return false;
  }
}

function generateProspectId() {
  return 'prospect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showAddProspectModal() {
  document.getElementById('prospectName').value = '';
  document.getElementById('prospectPhone').value = '';
  document.getElementById('prospectProduct').value = '';
  document.getElementById('prospectStatus').value = 'Falta contactar';
  document.getElementById('prospectObservation').value = '';
  // Limpiar checkboxes
  document.getElementById('prospectTagTrabajo').checked = false;
  document.getElementById('prospectTagCotizacion').checked = false;
  showModal('addProspectModal');
}

function saveProspect() {
  const name = document.getElementById('prospectName').value.trim();
  const phone = document.getElementById('prospectPhone').value.trim();
  const product = document.getElementById('prospectProduct').value.trim();
  const status = document.getElementById('prospectStatus').value;
  const observation = document.getElementById('prospectObservation').value.trim();
  
  // Obtener etiquetas seleccionadas
  const etiquetas = [];
  if (document.getElementById('prospectTagTrabajo').checked) {
    etiquetas.push('TRABAJO EN CURSO');
  }
  if (document.getElementById('prospectTagCotizacion').checked) {
    etiquetas.push('COTIZACIÓN');
  }
  
  if (!name || !phone || !product) {
    alert('Por favor completa los campos obligatorios: Nombre, Teléfono y Producto.');
    return;
  }
  
  const prospects = getProspectsStorage();
  
  // Verificar si ya existe un prospecto con el mismo teléfono
  const existingProspect = prospects.find(p => p.telefono === phone);
  if (existingProspect) {
    alert('Ya existe un prospecto con este número de teléfono.');
    return;
  }
  
  const newProspect = {
    id: generateProspectId(),
    nombre: name,
    telefono: phone,
    producto: product,
    estado: status,
    etiquetas: etiquetas,
    observaciones: [],
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString()
  };
  
  if (observation) {
    newProspect.observaciones.push({
      fecha: new Date().toISOString(),
      texto: observation
    });
  }
  
  prospects.push(newProspect);
  setProspectsStorage(prospects);
  
  hideModal('addProspectModal');
  loadProspects();
  updateProspectStats();
  showToast('✅ Prospecto guardado correctamente');
}

function loadProspects() {
  const prospects = getProspectsStorage();
  const container = document.getElementById('prospectList');
  
  if (prospects.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--muted); font-style: italic;">No hay prospectos registrados.</div>';
    return;
  }
  
  // Actualizar lista de productos para filtro
  updateProductFilter(prospects);
  
  // Aplicar filtros adicionales
  const searchTerm = document.getElementById('searchProspect')?.value.toLowerCase() || '';
  const filterStatus = document.getElementById('filterStatus')?.value || '';
  const filterProduct = document.getElementById('filterProduct')?.value || '';
  
  let filteredProspects = prospects;
  
  if (searchTerm) {
    filteredProspects = filteredProspects.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm) || 
      p.telefono.includes(searchTerm)
    );
  }
  
  if (filterStatus) {
    filteredProspects = filteredProspects.filter(p => p.estado === filterStatus);
  }
  
  if (filterProduct) {
    filteredProspects = filteredProspects.filter(p => p.producto === filterProduct);
  }
  
  container.innerHTML = '';
  
  filteredProspects.forEach(prospect => {
    const div = document.createElement('div');
    div.className = 'prospect-item';
    div.onclick = () => showProspectDetail(prospect.id);
    
    // Determinar clase CSS según el estado
    let statusClass = 'status-not-contacted';
    if (prospect.estado === 'Contactado por WhatsApp') {
      statusClass = 'status-whatsapp';
    } else if (prospect.estado === 'Contactado por llamada') {
      statusClass = 'status-call';
    } else if (prospect.estado === 'Contactado por WhatsApp y Llamada') {
      statusClass = 'status-both';
    } else if (prospect.estado === 'Falta contactar') {
      statusClass = 'status-not-contacted';
    }
    
    const lastObservation = prospect.observaciones.length > 0 
      ? prospect.observaciones[prospect.observaciones.length - 1].texto 
      : 'Sin observaciones';
    
    // Mostrar etiquetas si tiene
    let etiquetasHTML = '';
    if (prospect.etiquetas && prospect.etiquetas.length > 0) {
      etiquetasHTML = `<span>🏷️ ${prospect.etiquetas.join(', ')}</span>`;
    }
    
    div.innerHTML = `
      <div class="prospect-info">
        <div class="prospect-name">${prospect.nombre}</div>
        <div class="prospect-details">
          <span>📞 ${prospect.telefono}</span>
          <span>📦 ${prospect.producto}</span>
          <span class="prospect-status ${statusClass}">${prospect.estado}</span>
          ${etiquetasHTML}
          <span>📝 ${lastObservation.substring(0, 30)}${lastObservation.length > 30 ? '...' : ''}</span>
        </div>
      </div>
      <div style="color: var(--muted); font-size: 12px;">
        👁️ Ver
      </div>
    `;
    
    container.appendChild(div);
  });
}

function updateProductFilter(prospects) {
  const filterProduct = document.getElementById('filterProduct');
  if (!filterProduct) return;
  
  const products = [...new Set(prospects.map(p => p.producto).filter(p => p))];
  
  filterProduct.innerHTML = '<option value="">Todos los productos</option>';
  products.forEach(product => {
    const option = document.createElement('option');
    option.value = product;
    option.textContent = product;
    filterProduct.appendChild(option);
  });
}

function filterProspects() {
  loadProspects();
  updateProspectStats();
}

function resetFilters() {
  document.getElementById('searchProspect').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterProduct').value = '';
  loadProspects();
  updateProspectStats();
}

function updateProspectStats() {
  const prospects = getProspectsStorage();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const total = prospects.length;
  const pending = prospects.filter(p => p.estado === 'Falta contactar').length;
  const contacted = prospects.filter(p => p.estado !== 'Falta contactar').length;
  const recent = prospects.filter(p => new Date(p.fechaCreacion) > sevenDaysAgo).length;
  
  document.getElementById('totalProspects').textContent = total;
  document.getElementById('pendingProspects').textContent = pending;
  document.getElementById('contactedProspects').textContent = contacted;
  document.getElementById('recentProspects').textContent = recent;
}

function showProspectDetail(id) {
  const prospects = getProspectsStorage();
  const prospect = prospects.find(p => p.id === id);
  
  if (!prospect) {
    alert('Prospecto no encontrado.');
    return;
  }
  
  currentProspectId = id;
  
  document.getElementById('detailProspectName').textContent = prospect.nombre;
  document.getElementById('detailProspectPhone').textContent = prospect.telefono;
  document.getElementById('detailProspectProduct').textContent = prospect.producto;
  document.getElementById('detailProspectStatus').value = prospect.estado;
  document.getElementById('detailProspectNextContact').value = prospect.proximoContacto || '';
  
  // Cargar etiquetas
  const tagsContainer = document.getElementById('detailProspectTags');
  tagsContainer.innerHTML = '';
  if (prospect.etiquetas && prospect.etiquetas.length > 0) {
    prospect.etiquetas.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag active';
      span.textContent = tag;
      span.style.marginRight = '4px';
      span.style.marginBottom = '4px';
      tagsContainer.appendChild(span);
    });
  }
  
  // Cargar observaciones
  const obsContainer = document.getElementById('detailProspectObservations');
  obsContainer.innerHTML = '';
  
  if (prospect.observaciones.length === 0) {
    obsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); font-style: italic;">No hay observaciones registradas.</div>';
  } else {
    // Mostrar observaciones más recientes primero
    [...prospect.observaciones].reverse().forEach(obs => {
      const div = document.createElement('div');
      div.className = 'observation-item';
      const date = new Date(obs.fecha);
      div.innerHTML = `
        <div class="observation-date">${date.toLocaleString('es-CL')}</div>
        <div class="observation-text">${obs.texto}</div>
      `;
      obsContainer.appendChild(div);
    });
  }
  
  // Configurar eventos para etiquetas rápidas
  document.querySelectorAll('.tag[data-tag]').forEach(tag => {
    tag.onclick = function() {
      const tagText = this.getAttribute('data-tag');
      addTagToProspect(tagText);
    };
  });
  
  showModal('prospectDetailModal');
}

function addTagToProspect(tag) {
  if (!currentProspectId) return;
  
  const prospects = getProspectsStorage();
  const index = prospects.findIndex(p => p.id === currentProspectId);
  
  if (index === -1) return;
  
  if (!prospects[index].etiquetas) {
    prospects[index].etiquetas = [];
  }
  
  if (!prospects[index].etiquetas.includes(tag)) {
    prospects[index].etiquetas.push(tag);
    setProspectsStorage(prospects);
    showProspectDetail(currentProspectId);
    showToast(`🏷️ Etiqueta "${tag}" agregada`);
  }
}

function addObservation() {
  const textarea = document.getElementById('newObservation');
  const text = textarea.value.trim();
  
  if (!text) {
    alert('Por favor escribe una observación.');
    return;
  }
  
  if (!currentProspectId) return;
  
  const prospects = getProspectsStorage();
  const index = prospects.findIndex(p => p.id === currentProspectId);
  
  if (index === -1) return;
  
  if (!prospects[index].observaciones) {
    prospects[index].observaciones = [];
  }
  
  prospects[index].observaciones.push({
    fecha: new Date().toISOString(),
    texto: text
  });
  
  prospects[index].fechaActualizacion = new Date().toISOString();
  
  setProspectsStorage(prospects);
  textarea.value = '';
  showProspectDetail(currentProspectId);
  showToast('✅ Observación agregada');
}

function saveProspectChanges() {
  if (!currentProspectId) return;
  
  const prospects = getProspectsStorage();
  const index = prospects.findIndex(p => p.id === currentProspectId);
  
  if (index === -1) return;
  
  prospects[index].estado = document.getElementById('detailProspectStatus').value;
  prospects[index].proximoContacto = document.getElementById('detailProspectNextContact').value;
  prospects[index].fechaActualizacion = new Date().toISOString();
  
  setProspectsStorage(prospects);
  hideModal('prospectDetailModal');
  loadProspects();
  updateProspectStats();
  showToast('✅ Cambios guardados');
}

function confirmDeleteProspect() {
  if (!confirm('¿Está seguro de eliminar este prospecto?')) {
    return;
  }
  
  deleteProspect();
}

function deleteProspect() {
  if (!currentProspectId) return;
  
  const prospects = getProspectsStorage();
  const index = prospects.findIndex(p => p.id === currentProspectId);
  
  if (index === -1) return;
  
  prospects.splice(index, 1);
  setProspectsStorage(prospects);
  hideModal('prospectDetailModal');
  loadProspects();
  updateProspectStats();
  showToast('🗑️ Prospecto eliminado');
}

// ==================== FUNCIONES PARA WHATSAPP Y NOMBRE VENDEDOR ====================
function guardarNombreVendedor() {
  const nombreInput = document.getElementById('vendedorNombre');
  const nombre = nombreInput.value.trim();
  
  if (!nombre) {
    alert('Por favor ingresa tu nombre.');
    return;
  }
  
  localStorage.setItem('nombre_vendedor', nombre);
  actualizarNombreVendedor();
  nombreInput.value = '';
  showToast('✅ Nombre guardado correctamente');
}

function obtenerNombreVendedor() {
  return localStorage.getItem('nombre_vendedor') || 'Vendedor';
}

function actualizarNombreVendedor() {
  const nombre = obtenerNombreVendedor();
  document.getElementById('nombreVendedorActual').textContent = nombre;
}

// ==================== FUNCIONES CORREGIDAS PARA MÓVILES ====================
function openWhatsApp() {
  const phone = document.getElementById('detailProspectPhone').textContent;
  const prospectName = document.getElementById('detailProspectName').textContent;
  const product = document.getElementById('detailProspectProduct').textContent;
  const vendedorNombre = obtenerNombreVendedor();
  
  // Limpiar número de teléfono (eliminar espacios, guiones, etc.)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Validar que el número tenga el formato correcto (9 dígitos para Chile)
  if (!cleanPhone || cleanPhone.length < 9) {
    alert('Número de teléfono inválido');
    return;
  }
  
  // Mensaje predefinido que incluye nombre del cliente, vendedor y producto
  const message = encodeURIComponent(`Hola ${prospectName}, soy ${vendedorNombre} de Neumáticos y Llantas del Pacífico. Te contacto por tu interés en ${product}. ¿En qué puedo ayudarte?`);
  
  // PARA WHATSAPP: Agregar el prefijo +56 al número (formato internacional)
  const whatsappPhone = '+56' + cleanPhone;
  
  // Construir URL de WhatsApp
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${message}`;
  
  // Ocultar el modal primero
  hideModal('prospectDetailModal');
  
  // Pequeño delay para asegurar que el estado se guarde y el modal se cierre
  setTimeout(() => {
    // Abrir WhatsApp - funciona tanto en móviles como en escritorio
    window.location.href = whatsappUrl;
    
    // Fallback para escritorio si window.location no funciona
    setTimeout(() => {
      // Si después de 500ms no se ha redirigido, intentar con window.open
      if (document.visibilityState === 'visible') {
        window.open(whatsappUrl, '_blank');
      }
    }, 500);
  }, 100);
}

function callProspect() {
  const phone = document.getElementById('detailProspectPhone').textContent;
  // PARA LLAMADA: Usar el número sin prefijo internacional (formato local)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Validar que el número tenga el formato correcto
  if (!cleanPhone || cleanPhone.length < 9) {
    alert('Número de teléfono inválido');
    return;
  }
  
  // Ocultar el modal primero
  hideModal('prospectDetailModal');
  
  // CORRECCIÓN PARA MÓVILES: Usar window.location.href para el esquema tel:
  // Esto funciona mejor en dispositivos móviles
  // PARA LLAMADA: Usar el número sin +56 (formato local)
  const telUrl = `tel:${cleanPhone}`;
  
  // Pequeño delay para asegurar que el estado se guarde y el modal se cierre
  setTimeout(() => {
    // Llamar al prospecto - funciona en móviles
    window.location.href = telUrl;
    
    // Fallback para escritorio
    setTimeout(() => {
      // Si estamos en escritorio, mostrar mensaje
      if (document.visibilityState === 'visible') {
        alert(`En un dispositivo móvil, esto iniciaría una llamada a: ${cleanPhone}`);
      }
    }, 500);
  }, 100);
}

// ==================== FUNCIONES PARA IMPORTAR CLIENTES ====================
function showImportClientModal() {
  showModal('importClientModal');
  resetClientImportForm();
}

function resetClientImportForm() {
  document.getElementById('clientFile').value = '';
  document.getElementById('clientFileName').textContent = 'No se ha seleccionado ningún archivo';
  document.getElementById('clientFilePreview').style.display = 'none';
  document.getElementById('clientUploadStats').style.display = 'none';
  document.getElementById('processClientBtn').disabled = true;
  clientFileData = [];
  clientFileHeaders = [];
}

function handleClientFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    resetClientImportForm();
    return;
  }
  
  clientFileData = [];
  document.getElementById('clientFileName').textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  
  const reader = new FileReader();
  
  if (file.name.endsWith('.csv')) {
    reader.onload = function(e) {
      try {
        parseCSVData(e.target.result);
      } catch (error) {
        alert('Error al leer el archivo CSV: ' + error.message);
        resetClientImportForm();
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    alert('⚠️ Importación de Excel requiere la biblioteca SheetJS. Para esta versión, por favor convierte tu archivo a CSV.');
    resetClientImportForm();
    return;
  } else {
    alert('Formato de archivo no soportado. Use CSV o Excel.');
    resetClientImportForm();
    return;
  }
}

function parseCSVData(content) {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    alert('El archivo CSV está vacío.');
    resetClientImportForm();
    return;
  }
  
  // Leer encabezados
  const headers = lines[0].split(',').map(h => h.trim());
  clientFileHeaders = headers;
  
  // Verificar encabezados obligatorios
  const requiredHeaders = ['NombreApellido', 'Telefono', 'Producto', 'Estado'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    alert(`Faltan los siguientes encabezados obligatorios: ${missingHeaders.join(', ')}`);
    resetClientImportForm();
    return;
  }
  
  // Parsear datos
  const data = [];
  let validRows = 0;
  let ignoredRows = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(',').map(c => c.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    
    // Validar datos mínimos
    if (!row.NombreApellido || !row.Telefono || !row.Producto || !row.Estado) {
      ignoredRows++;
      continue;
    }
    
    // Validar estado
    const validStatuses = ['Falta contactar', 'Contactado por WhatsApp', 'Contactado por llamada', 'Contactado por WhatsApp y Llamada'];
    if (!validStatuses.includes(row.Estado)) {
      ignoredRows++;
      continue;
    }
    
    data.push(row);
    validRows++;
  }
  
  clientFileData = data;
  
  // Mostrar vista previa
  showClientPreview(data.slice(0, 10));
  
  // Calcular duplicados
  const existingProspects = getProspectsStorage();
  const duplicateRows = data.filter(row => 
    existingProspects.some(p => p.telefono === row.Telefono)
  ).length;
  
  showClientUploadStats(data.length, validRows, duplicateRows, ignoredRows);
  document.getElementById('processClientBtn').disabled = false;
}

function showClientPreview(data) {
  const previewBody = document.getElementById('clientPreviewBody');
  previewBody.innerHTML = '';
  
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.NombreApellido || ''}</td>
      <td>${row.Telefono || ''}</td>
      <td>${row.Producto || ''}</td>
      <td>${row.Estado || ''}</td>
      <td>${row.ObservacionInicial || ''}</td>
      <td>${row.ProximoContacto || ''}</td>
      <td>${row.Etiqueta || ''}</td>
    `;
    previewBody.appendChild(tr);
  });
  
  document.getElementById('clientFilePreview').style.display = 'block';
}

function showClientUploadStats(total, valid, duplicate, ignored) {
  document.getElementById('clientTotalRecords').textContent = total;
  document.getElementById('clientValidRecords').textContent = valid;
  document.getElementById('clientDuplicateRecords').textContent = duplicate;
  document.getElementById('clientIgnoredRecords').textContent = ignored;
  
  document.getElementById('clientUploadStats').style.display = 'block';
}

function processClientFile() {
  if (clientFileData.length === 0) {
    alert('No hay datos para procesar.');
    return;
  }
  
  const prospects = getProspectsStorage();
  let imported = 0;
  let duplicates = 0;
  let ignored = 0;
  
  clientFileData.forEach(row => {
    // Verificar duplicado por teléfono
    const existingProspect = prospects.find(p => p.telefono === row.Telefono);
    if (existingProspect) {
      duplicates++;
      return;
    }
    
    // Validar datos mínimos
    if (!row.NombreApellido || !row.Telefono || !row.Producto || !row.Estado) {
      ignored++;
      return;
    }
    
    const newProspect = {
      id: generateProspectId(),
      nombre: row.NombreApellido,
      telefono: row.Telefono,
      producto: row.Producto,
      estado: row.Estado,
      etiquetas: row.Etiqueta ? [row.Etiqueta] : [],
      proximoContacto: row.ProximoContacto || '',
      observaciones: [],
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };
    
    if (row.ObservacionInicial) {
      newProspect.observaciones.push({
        fecha: new Date().toISOString(),
        texto: row.ObservacionInicial
      });
    }
    
    prospects.push(newProspect);
    imported++;
  });
  
  setProspectsStorage(prospects);
  
  let message = `✅ Importación completada:\n\n`;
  message += `• Registros en archivo: ${clientFileData.length}\n`;
  message += `• Nuevos prospectos: ${imported}\n`;
  message += `• Duplicados omitidos: ${duplicates}\n`;
  message += `• Registros ignorados: ${ignored}`;
  
  alert(message);
  hideModal('importClientModal');
  loadProspects();
  updateProspectStats();
  showToast(`📥 ${imported} prospectos importados`);
}

// ==================== FUNCIÓN PARA EXPORTAR PROSPECTOS ====================
function exportProspects() {
  const prospects = getProspectsStorage();
  
  if (prospects.length === 0) {
    alert('No hay prospectos para exportar.');
    return;
  }
  
  let csv = 'NombreApellido,Telefono,Producto,Estado,Etiquetas,ProximoContacto,Observaciones,FechaCreacion\n';
  
  prospects.forEach(p => {
    const etiquetas = p.etiquetas ? p.etiquetas.join(';') : '';
    const observaciones = p.observaciones ? p.observaciones.map(o => 
      `[${new Date(o.fecha).toLocaleString('es-CL')}] ${o.texto}`
    ).join(' | ') : '';
    
    csv += `"${p.nombre}","${p.telefono}","${p.producto}","${p.estado}","${etiquetas}","${p.proximoContacto || ''}","${observaciones}","${new Date(p.fechaCreacion).toLocaleString('es-CL')}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `prospectos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast(`📤 ${prospects.length} prospectos exportados`);
}

// ==================== FUNCIONES EXISTENTES (SIN CAMBIOS) ====================
function showUploadModal() {
  showModal('uploadModal');
  resetUploadForm();
}

function resetUploadForm() {
  document.getElementById('csvFile').value = '';
  document.getElementById('fileName').textContent = 'No se ha seleccionado ningún archivo';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('uploadStats').style.display = 'none';
  document.getElementById('processBtn').disabled = true;
  selectedFile = null;
  csvData = [];
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    resetUploadForm();
    return;
  }

  selectedFile = file;
  document.getElementById('fileName').textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  document.getElementById('processBtn').disabled = false;

  // Leer y previsualizar el archivo
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      csvData = parseCSV(content);
      
      if (csvData.length === 0) {
        alert('El archivo CSV está vacío o no tiene el formato correcto.');
        resetUploadForm();
        return;
      }

      // Mostrar vista previa
      showPreview(csvData);
      showUploadStats(csvData);
    } catch (error) {
      alert('Error al leer el archivo CSV: ' + error.message);
      resetUploadForm();
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }

  // Verificar si la primera línea es encabezado
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('fecha/hora') || firstLine.includes('monto') || firstLine.includes('comisión');
  
  const startIndex = hasHeader ? 1 : 0;
  const data = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Manejar comillas y separadores
    const cells = [];
    let inQuotes = false;
    let currentCell = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell);
    
    // Limpiar comillas y espacios
    const cleanCells = cells.map(cell => cell.replace(/"/g, '').trim());
    
    if (cleanCells.length >= 6) {
      // Formato esperado: Fecha/Hora, Monto con IVA, Neto sin IVA, Comisión, Fecha, Mes
      const [fechaHoraStr, montoConIVARaw, netoSinIVARaw, comisionRaw, fechaStr, mesStr] = cleanCells;
      
      // Convertir fechas
      const timestamp = parseDateString(fechaHoraStr);
      const dateIso = parseDateOnly(fechaStr);
      const monthId = mesStr;
      
      // Convertir números y redondear a enteros
      const montoConIVA = Math.round(parseNumber(montoConIVARaw));
      const netoSinIVA = Math.round(parseNumber(netoSinIVARaw));
      const comision = Math.round(parseNumber(comisionRaw));
      
      if (timestamp && !isNaN(montoConIVA) && !isNaN(netoSinIVA) && !isNaN(comision) && dateIso && monthId) {
        data.push({
          fecha_hora: fechaHoraStr,
          amount_with_vat: montoConIVA,
          net_without_vat: netoSinIVA,
          commission: comision,
          fecha: fechaStr,
          mes: mesStr,
          // Datos convertidos para el sistema
          timestamp: timestamp.toISOString(),
          date_iso: dateIso,
          month_id: monthId
        });
      }
    }
  }
  
  return data;
}

function parseDateString(dateStr) {
  // Formato esperado: "05/12/25 10:18" (DD/MM/YY HH:MM)
  const parts = dateStr.split(' ');
  if (parts.length !== 2) return new Date();
  
  const datePart = parts[0]; // "05/12/25"
  const timePart = parts[1]; // "10:18"
  
  const dateParts = datePart.split('/');
  if (dateParts.length !== 3) return new Date();
  
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = 2000 + parseInt(dateParts[2]);
  
  const timeParts = timePart.split(':');
  const hours = timeParts.length >= 1 ? parseInt(timeParts[0]) : 0;
  const minutes = timeParts.length >= 2 ? parseInt(timeParts[1]) : 0;
  
  return new Date(year, month, day, hours, minutes);
}

function parseDateOnly(dateStr) {
  // Formato esperado: "04/12/25" (DD/MM/YY)
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = '20' + parts[2];
  
  return `${year}-${month}-${day}`;
}

function parseNumber(numStr) {
  // Eliminar puntos de miles y convertir decimales
  const clean = numStr.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function showPreview(data) {
  const previewBody = document.getElementById('previewBody');
  previewBody.innerHTML = '';
  
  const previewCount = Math.min(5, data.length);
  
  for (let i = 0; i < previewCount; i++) {
    const row = data[i];
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${row.fecha_hora || ''}</td>
      <td>${formatCLP(row.amount_with_vat)}</td>
      <td>${formatCLP(row.net_without_vat)}</td>
      <td>${formatCLP(row.commission)}</td>
      <td>${row.fecha || ''}</td>
      <td>${row.mes || ''}</td>
    `;
    
    previewBody.appendChild(tr);
  }
  
  document.getElementById('filePreview').style.display = 'block';
}

function showUploadStats(data) {
  const totalRecords = data.length;
  const permanentSales = getStorage('ventas_permanentes');
  
  // Buscar duplicados (misma fecha/hora y mismo monto)
  let newRecords = 0;
  data.forEach(row => {
    const isDuplicate = permanentSales.some(sale => 
      sale.timestamp === row.timestamp && 
      sale.amount_with_vat === row.amount_with_vat
    );
    if (!isDuplicate) newRecords++;
  });
  
  document.getElementById('totalRecords').textContent = totalRecords;
  document.getElementById('newRecords').textContent = newRecords;
  document.getElementById('importRecords').textContent = newRecords;
  
  document.getElementById('uploadStats').style.display = 'block';
}

function processCSVFile() {
  if (!selectedFile || csvData.length === 0) {
    alert('No hay archivo para procesar.');
    return;
  }

  const permanentSales = getStorage('ventas_permanentes');
  const salesMonth = getStorage('ventas_mes');
  const salesDay = getStorage('ventas_dia');
  const today = getCurrentDate();
  const currentMonth = getCurrentMonth();
  
  let addedToPermanent = 0;
  let addedToMonth = 0;
  let addedToDay = 0;
  let duplicates = 0;

  csvData.forEach(row => {
    // Verificar si ya existe (duplicado)
    const isDuplicate = permanentSales.some(sale => 
      sale.timestamp === row.timestamp && 
      sale.amount_with_vat === row.amount_with_vat
    );

    if (!isDuplicate) {
      // Crear objeto de venta
      const sale = {
        amount_with_vat: row.amount_with_vat,
        net_without_vat: row.net_without_vat,
        commission: row.commission,
        timestamp: row.timestamp,
        date_iso: row.date_iso,
        month_id: row.month_id
      };

      // Siempre agregar al historial permanente
      permanentSales.push(sale);
      addedToPermanent++;

      // Agregar a ventas del mes si es del mes actual
      if (row.month_id === currentMonth) {
        salesMonth.push(sale);
        addedToMonth++;
      }

      // Agregar a ventas del día si es del día actual
      if (row.date_iso === today) {
        salesDay.push(sale);
        addedToDay++;
      }
    } else {
      duplicates++;
    }
  });

  // Guardar cambios
  setStorage('ventas_permanentes', permanentSales);
  setStorage('ventas_mes', salesMonth);
  setStorage('ventas_dia', salesDay);

  // Mostrar resumen
  let message = `✅ Archivo procesado correctamente:\n\n`;
  message += `• Registros en CSV: ${csvData.length}\n`;
  message += `• Nuevos registros agregados: ${addedToPermanent}\n`;
  message += `• Duplicados omitidos: ${duplicates}\n`;
  
  if (addedToMonth > 0) {
    message += `• Agregados al mes actual: ${addedToMonth}\n`;
  }
  
  if (addedToDay > 0) {
    message += `• Agregados al día actual: ${addedToDay}\n`;
  }

  alert(message);
  hideModal('uploadModal');
  refreshUI();
  showToast(`✅ ${addedToPermanent} ventas importadas correctamente`);
}

// ==================== CÁLCULO DE KPIs ====================
function calculateAndDisplayKPIs() {
  const permanentSales = getStorage('ventas_permanentes');
  const today = getCurrentDate();
  const currentMonth = getCurrentMonth();
  
  const startOfWeek = getStartOfWeek();
  
  const daySales = permanentSales.filter(s => s.date_iso === today);
  const weekSales = permanentSales.filter(s => isDateInWeek(s.date_iso, startOfWeek));
  const monthSales = permanentSales.filter(s => s.month_id === currentMonth);
  
  const dayTotal = Math.round(daySales.reduce((sum, s) => sum + s.net_without_vat, 0));
  const dayCount = daySales.length;
  const dayAverage = dayCount > 0 ? Math.round(dayTotal / dayCount) : 0;
  const dayCommission = Math.round(daySales.reduce((sum, s) => sum + s.commission, 0));
  
  const weekTotal = Math.round(weekSales.reduce((sum, s) => sum + s.net_without_vat, 0));
  const weekCount = weekSales.length;
  const weekAverage = weekCount > 0 ? Math.round(weekTotal / weekCount) : 0;
  const weekCommission = Math.round(weekSales.reduce((sum, s) => sum + s.commission, 0));
  
  const monthTotal = Math.round(monthSales.reduce((sum, s) => sum + s.net_without_vat, 0));
  const monthCount = monthSales.length;
  const monthAverage = monthCount > 0 ? Math.round(monthTotal / monthCount) : 0;
  const monthCommission = Math.round(monthSales.reduce((sum, s) => sum + s.commission, 0));
  
  document.getElementById('kpiDayTotal').textContent = formatCLP(dayTotal);
  document.getElementById('kpiDayCount').textContent = dayCount;
  document.getElementById('kpiDayAverage').textContent = formatCLP(dayAverage);
  document.getElementById('kpiDayCommission').textContent = formatCLP(dayCommission);
  
  document.getElementById('kpiWeekTotal').textContent = formatCLP(weekTotal);
  document.getElementById('kpiWeekCount').textContent = weekCount;
  document.getElementById('kpiWeekAverage').textContent = formatCLP(weekAverage);
  document.getElementById('kpiWeekCommission').textContent = formatCLP(weekCommission);
  
  document.getElementById('kpiMonthTotal').textContent = formatCLP(monthTotal);
  document.getElementById('kpiMonthCount').textContent = monthCount;
  document.getElementById('kpiMonthAverage').textContent = formatCLP(monthAverage);
  document.getElementById('kpiMonthCommission').textContent = formatCLP(monthCommission);
  
  // MODIFICADO: Ahora pasamos todas las ventas permanentes para el gráfico por hora
  renderHourlyChart(permanentSales);
}

// ==================== FUNCIONES AUXILIARES PARA KPIs ====================
function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString().split('T')[0];
}

function isDateInWeek(dateString, startOfWeek) {
  const date = new Date(dateString);
  const start = new Date(startOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return date >= start && date <= end;
}

// ==================== GRÁFICO DE VENTAS POR HORA MODIFICADO ====================
function renderHourlyChart(allSales) {
  // Crear un array para las horas de 8:00 a 20:00
  const hourlyData = {};
  
  // Inicializar todas las horas de 8 a 20 con valor 0
  for (let h = 8; h <= 20; h++) {
    const hourLabel = `${h.toString().padStart(2, '0')}:00`;
    hourlyData[hourLabel] = 0;
  }
  
  // Procesar todas las ventas
  allSales.forEach(sale => {
    const saleDate = new Date(sale.timestamp);
    const hour = saleDate.getHours();
    
    // Solo considerar ventas entre las 8:00 y 20:00
    if (hour >= 8 && hour <= 20) {
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourLabel] = (hourlyData[hourLabel] || 0) + sale.net_without_vat;
    }
  });
  
  // Ordenar las horas
  const hours = Object.keys(hourlyData).sort((a, b) => {
    const hourA = parseInt(a.split(':')[0]);
    const hourB = parseInt(b.split(':')[0]);
    return hourA - hourB;
  });
  
  // Obtener valores redondeados
  const values = hours.map(hour => Math.round(hourlyData[hour]));
  
  // Si no hay datos en ninguna hora, mostrar un mensaje
  const hasData = values.some(v => v > 0);
  
  if (!hasData) {
    hours.length = 0;
    values.length = 0;
    
    // Mostrar todas las horas con valor 0
    for (let h = 8; h <= 20; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
      values.push(0);
    }
  }
  
  const ctx = document.getElementById('hourlyChart');
  if (hourlyChartInstance) {
    hourlyChartInstance.destroy();
  }
  
  hourlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [{
        label: 'Volumen de Ventas (sin IVA)',
        data: values,
        backgroundColor: '#f7c600',
        borderColor: '#d1a400',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCLP(context.parsed.y);
            },
            title: function(tooltipItems) {
              return `Hora: ${tooltipItems[0].label}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Monto ($)',
            color: '#999999',
            font: {
              size: 12
            }
          },
          ticks: {
            callback: function(value) {
              return formatCLP(value);
            },
            color: '#999999'
          },
          grid: {
            color: '#2a2a2a'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Hora del día',
            color: '#999999',
            font: {
              size: 12
            }
          },
          ticks: {
            color: '#999999',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: '#2a2a2a'
          }
        }
      }
    }
  });
}

// ==================== FUNCIONES EXISTENTES (SIN CAMBIOS) ====================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installPrompt').classList.add('show');
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        document.getElementById('installPrompt').classList.remove('show');
      }
      deferredPrompt = null;
    });
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('Service Worker registrado');
  }).catch(err => {
    console.warn('Error registrando SW:', err);
  });
}

const manifest = {
  name: "Sistema de Comisiones",
  short_name: "Comisiones",
  description: "Sistema de comisiones offline para vendedores",
  start_url: location.href,
  display: "standalone",
  background_color: "#0f0f10",
  theme_color: "#f7c600",
  orientation: "portrait",
  icons: [
    {
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect fill='%23f7c600' width='512' height='512'/%3E%3Ctext x='256' y='360' font-size='280' text-anchor='middle' fill='%23111111' font-weight='bold'%3E💰%3C/text%3E%3C/svg%3E",
      sizes: "512x512",
      type: "image/svg+xml"
    }
  ]
};

// Nota: el link a manifest.json está en index.html

function getStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading storage:', e);
    return [];
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Error saving storage:', e);
    alert('Error al guardar datos. Verifica el espacio disponible.');
    return false;
  }
}

function formatCLP(amount) {
  const num = Math.round(parseFloat(amount) || 0);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  return `${sign}$ ${abs.toLocaleString('es-CL')}`;
}

function formatDateForExcel(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatDateTimeForExcel(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function parseAmount(str) {
  if (!str) throw new Error('Introduce un número válido');
  const cleaned = str.replace(/[^0-9]/g, '');
  if (!cleaned) throw new Error('Introduce un número válido');
  return parseFloat(cleaned);
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function round2(x) {
  // MODIFICADO: Redondear a número entero
  return Math.round(x);
}

function addSale() {
  const input = document.getElementById('amountInput');
  const amountText = input.value;
  
  try {
    const amt = parseAmount(amountText);
    // MODIFICADO: Redondear a números enteros
    const net = Math.round(amt / 1.19);
    const commission = Math.round(net * COMMISSION_RATE);
    
    const sale = {
      amount_with_vat: Math.round(amt), // Entero
      net_without_vat: net, // Entero
      commission: commission, // Entero
      timestamp: new Date().toISOString(),
      date_iso: getCurrentDate(),
      month_id: getCurrentMonth()
    };

    const permanentSales = getStorage('ventas_permanentes');
    permanentSales.push(sale);
    setStorage('ventas_permanentes', permanentSales);

    const salesMonth = getStorage('ventas_mes');
    salesMonth.push(sale);
    setStorage('ventas_mes', salesMonth);

    const salesDay = getStorage('ventas_dia');
    salesDay.push(sale);
    setStorage('ventas_dia', salesDay);

    if (input.value) {
      input.value = '';
      refreshUI();
      showToast('✓ Venta agregada correctamente');
    }
  } catch (e) {
    alert(e.message);
  }
}

function deleteLastSale() {
  const salesDay = getStorage('ventas_dia');
  
  if (salesDay.length === 0) {
    alert('No hay ventas para eliminar');
    return;
  }
  
  const lastSale = salesDay[salesDay.length - 1];
  const lastAmount = formatCLP(lastSale.amount_with_vat);
  
  if (!confirm(`¿Eliminar la última venta de ${lastAmount}?`)) {
    return;
  }
  
  const permanentSales = getStorage('ventas_permanentes');
  const permIndex = permanentSales.findIndex(s => 
    s.timestamp === lastSale.timestamp && 
    s.amount_with_vat === lastSale.amount_with_vat
  );
  if (permIndex !== -1) {
    permanentSales.splice(permIndex, 1);
    setStorage('ventas_permanentes', permanentSales);
  }
  
  salesDay.pop();
  setStorage('ventas_dia', salesDay);
  
  const salesMonth = getStorage('ventas_mes');
  const monthIndex = salesMonth.findIndex(s => 
    s.timestamp === lastSale.timestamp && 
    s.amount_with_vat === lastSale.amount_with_vat
  );
  if (monthIndex !== -1) {
    salesMonth.splice(monthIndex, 1);
    setStorage('ventas_mes', salesMonth);
  }
  
  refreshUI();
  showToast('✓ Última venta eliminada');
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function closeDay() {
  setStorage('ventas_dia', []);
  refreshUI();
  showToast('✓ Día cerrado. Ventas del día vaciadas.');
}

function closeMonth() {
  setStorage('ventas_dia', []);
  setStorage('ventas_mes', []);
  refreshUI();
  showToast('✓ Mes cerrado. Ventas del día y del mes vaciadas.');
}

function resetAll() {
  if (!confirm('⚠️ ¿Estás COMPLETAMENTE SEGURO? Se borrarán TODOS los datos de forma PERMANENTE.')) {
    return;
  }
  setStorage('ventas_dia', []);
  setStorage('ventas_mes', []);
  setStorage('ventas_permanentes', []);
  refreshUI();
  showToast('Sistema reseteado');
}

function exportToExcel() {
  showModal('exportModal');
  updateExportOptions();
}

function updateExportOptions() {
  const exportType = document.getElementById('exportType').value;
  const dateSelector = document.getElementById('dateSelector');
  const dateSelect = document.getElementById('dateSelect');
  
  dateSelect.innerHTML = '';
  
  if (exportType === 'day') {
    dateSelector.style.display = 'block';
    const salesDay = getStorage('ventas_dia');
    const today = getCurrentDate();
    
    if (salesDay.length > 0) {
      const option = document.createElement('option');
      option.value = today;
      option.textContent = `${today} (Día actual - ${salesDay.length} ventas)`;
      dateSelect.appendChild(option);
    } else {
      const option = document.createElement('option');
      option.textContent = 'No hay ventas hoy';
      dateSelect.appendChild(option);
    }
  } else if (exportType === 'month') {
    dateSelector.style.display = 'block';
    const salesMonth = getStorage('ventas_mes');
    const currentMonth = getCurrentMonth();
    const currentSales = salesMonth.filter(s => s.month_id === currentMonth);
    
    if (currentSales.length > 0) {
      const option = document.createElement('option');
      option.value = currentMonth;
      option.textContent = `${currentMonth} (Mes actual - ${currentSales.length} ventas)`;
      dateSelect.appendChild(option);
    } else {
      const option = document.createElement('option');
      option.textContent = 'No hay ventas en el mes actual';
      dateSelect.appendChild(option);
    }
  } else if (exportType === 'permanent') {
    dateSelector.style.display = 'block';
    const permanentSales = getStorage('ventas_permanentes');
    
    const uniqueMonths = [...new Set(permanentSales.map(s => s.month_id).filter(Boolean))].sort().reverse();
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todos los meses';
    dateSelect.appendChild(allOption);
    
    uniqueMonths.forEach(month => {
      const monthSales = permanentSales.filter(s => s.month_id === month);
      const option = document.createElement('option');
      option.value = month;
      option.textContent = `${month} (${monthSales.length} ventas)`;
      dateSelect.appendChild(option);
    });
    
    if (dateSelect.options.length === 1) {
      const option = document.createElement('option');
      option.textContent = 'No hay ventas en historial permanente';
      dateSelect.appendChild(option);
    }
  } else {
    dateSelector.style.display = 'none';
  }
}

function confirmExport() {
  const exportType = document.getElementById('exportType').value;
  const dateSelect = document.getElementById('dateSelect');
  const selectedDate = dateSelect.value;
  
  let data = [];
  let filename = '';
  
  if (exportType === 'day') {
    const salesDay = getStorage('ventas_dia');
    const today = getCurrentDate();
    
    if (selectedDate === today) {
      data = salesDay;
      filename = `ventas_dia_${selectedDate}.csv`;
    }
  } else if (exportType === 'month') {
    const currentMonth = getCurrentMonth();
    const salesMonth = getStorage('ventas_mes');
    
    if (selectedDate === currentMonth) {
      data = salesMonth.filter(s => s.month_id === currentMonth);
      filename = `ventas_mes_${selectedDate}.csv`;
    }
  } else if (exportType === 'permanent') {
    const permanentSales = getStorage('ventas_permanentes');
    
    if (selectedDate === 'all') {
      data = permanentSales;
      filename = 'historial_permanente_completo.csv';
    } else {
      data = permanentSales.filter(s => s.month_id === selectedDate);
      filename = `historial_permanente_${selectedDate}.csv`;
    }
  }
  
  if (data.length === 0) {
    alert('No hay datos para exportar en la selección elegida');
    return;
  }
  
  let csv = 'Fecha/Hora,Monto con IVA,Neto sin IVA,Comisión,Fecha,Mes\n';
  data.forEach(s => {
    const timestamp = formatDateTimeForExcel(s.timestamp);
    const dateFormatted = formatDateForExcel(s.date_iso || s.timestamp);
    csv += `"${timestamp}",${s.amount_with_vat},${s.net_without_vat},${s.commission},"${dateFormatted}","${s.month_id}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  hideModal('exportModal');
  showToast(`✓ Exportado: ${filename}`);
}

function showModifyModal() {
  showModal('modifyModal');
  document.getElementById('saleDate').value = getCurrentDate();
  document.getElementById('saleAmount').value = '';
  document.getElementById('searchQuery').value = '';
  updateModifyAction();
}

function updateModifyAction() {
  const action = document.getElementById('modifyAction').value;
  const addSection = document.getElementById('addSaleSection');
  const deleteSection = document.getElementById('deleteSaleSection');
  const searchSection = document.getElementById('searchSaleSection');
  
  if (action === 'add') {
    addSection.style.display = 'block';
    deleteSection.style.display = 'none';
    searchSection.style.display = 'none';
  } else if (action === 'delete') {
    addSection.style.display = 'none';
    deleteSection.style.display = 'block';
    searchSection.style.display = 'none';
    updateDeleteList();
  } else if (action === 'search') {
    addSection.style.display = 'none';
    deleteSection.style.display = 'none';
    searchSection.style.display = 'block';
    searchPermanentSales();
  }
}

function updateDeleteList() {
  const period = document.getElementById('deletePeriod').value;
  const container = document.getElementById('salesListToDelete');
  container.innerHTML = '';
  
  let sales = [];
  if (period === 'day') {
    sales = getStorage('ventas_dia');
  } else if (period === 'month') {
    const currentMonth = getCurrentMonth();
    const allSales = getStorage('ventas_mes');
    sales = allSales.filter(s => s.month_id === currentMonth);
  } else if (period === 'permanent') {
    sales = getStorage('ventas_permanentes');
  }
  
  if (sales.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: var(--muted); text-align: center;">No hay ventas para eliminar</div>';
    return;
  }
  
  sales.forEach((sale, index) => {
    const div = document.createElement('div');
    div.style.cssText = `
      padding: 12px;
      margin: 4px 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    const time = formatDateTimeForExcel(sale.timestamp);
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--accent);">${formatCLP(sale.amount_with_vat)}</div>
          <div style="font-size: 12px; color: var(--muted);">${time} | Com: ${formatCLP(sale.commission)}</div>
        </div>
        <button onclick="deleteSaleFromPeriod('${period}', ${index})" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">Eliminar</button>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function searchPermanentSales() {
  const query = document.getElementById('searchQuery').value.toLowerCase();
  const container = document.getElementById('searchResults');
  container.innerHTML = '';
  
  const permanentSales = getStorage('ventas_permanentes');
  
  if (permanentSales.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: var(--muted); text-align: center;">No hay ventas en el historial permanente</div>';
    return;
  }
  
  let filteredSales = permanentSales;
  
  if (query) {
    filteredSales = permanentSales.filter(sale => {
      const monthId = sale.month_id || '';
      const amount = sale.amount_with_vat.toString();
      const date = sale.date_iso || '';
      return monthId.toLowerCase().includes(query) || 
             amount.includes(query) ||
             date.toLowerCase().includes(query);
    });
  }
  
  if (filteredSales.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: var(--muted); text-align: center;">No se encontraron ventas</div>';
    return;
  }
  
  filteredSales.slice(0, 50).forEach((sale, index) => {
    const div = document.createElement('div');
    div.style.cssText = `
      padding: 12px;
      margin: 4px 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
    `;
    
    const time = formatDateTimeForExcel(sale.timestamp);
    
    div.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 600; color: var(--accent);">${formatCLP(sale.amount_with_vat)}</div>
        <div style="font-size: 12px; color: var(--muted);">${time} | Com: ${formatCLP(sale.commission)}</div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">Fecha: ${sale.date_iso} | Mes: ${sale.month_id}</div>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function deleteSaleFromPeriod(period, index) {
  if (!confirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.')) {
    return;
  }
  
  let saleToDelete;
  
  if (period === 'day') {
    const salesDay = getStorage('ventas_dia');
    saleToDelete = salesDay[index];
    
    const permanentSales = getStorage('ventas_permanentes');
    const permIndex = permanentSales.findIndex(s => 
      s.timestamp === saleToDelete.timestamp && 
      s.amount_with_vat === saleToDelete.amount_with_vat
    );
    if (permIndex !== -1) {
      permanentSales.splice(permIndex, 1);
      setStorage('ventas_permanentes', permanentSales);
    }
    
    salesDay.splice(index, 1);
    setStorage('ventas_dia', salesDay);
    
    const salesMonth = getStorage('ventas_mes');
    const monthIndex = salesMonth.findIndex(s => 
      s.timestamp === saleToDelete.timestamp && 
      s.amount_with_vat === saleToDelete.amount_with_vat
    );
    if (monthIndex !== -1) {
      salesMonth.splice(monthIndex, 1);
      setStorage('ventas_mes', salesMonth);
    }
    
  } else if (period === 'month') {
    const currentMonth = getCurrentMonth();
    const salesMonth = getStorage('ventas_mes');
    const monthSales = salesMonth.filter(s => s.month_id === currentMonth);
    saleToDelete = monthSales[index];
    
    const permanentSales = getStorage('ventas_permanentes');
    const permIndex = permanentSales.findIndex(s => 
      s.timestamp === saleToDelete.timestamp && 
      s.amount_with_vat === saleToDelete.amount_with_vat
    );
    if (permIndex !== -1) {
      permanentSales.splice(permIndex, 1);
      setStorage('ventas_permanentes', permanentSales);
    }
    
    const fullIndex = salesMonth.findIndex(s => 
      s.timestamp === saleToDelete.timestamp && 
      s.amount_with_vat === saleToDelete.amount_with_vat
    );
    if (fullIndex !== -1) {
      salesMonth.splice(fullIndex, 1);
      setStorage('ventas_mes', salesMonth);
    }
    
    const today = getCurrentDate();
    if (saleToDelete.date_iso === today) {
      const salesDay = getStorage('ventas_dia');
      const dayIndex = salesDay.findIndex(s => 
        s.timestamp === saleToDelete.timestamp && 
        s.amount_with_vat === saleToDelete.amount_with_vat
      );
      if (dayIndex !== -1) {
        salesDay.splice(dayIndex, 1);
        setStorage('ventas_dia', salesDay);
      }
    }
    
  } else if (period === 'permanent') {
    const permanentSales = getStorage('ventas_permanentes');
    saleToDelete = permanentSales[index];
    
    permanentSales.splice(index, 1);
    setStorage('ventas_permanentes', permanentSales);
    
    const currentMonth = getCurrentMonth();
    if (saleToDelete.month_id === currentMonth) {
      const salesMonth = getStorage('ventas_mes');
      const monthIndex = salesMonth.findIndex(s => 
        s.timestamp === saleToDelete.timestamp && 
        s.amount_with_vat === saleToDelete.amount_with_vat
      );
      if (monthIndex !== -1) {
        salesMonth.splice(monthIndex, 1);
        setStorage('ventas_mes', salesMonth);
      }
    }
    
    const today = getCurrentDate();
    if (saleToDelete.date_iso === today) {
      const salesDay = getStorage('ventas_dia');
      const dayIndex = salesDay.findIndex(s => 
        s.timestamp === saleToDelete.timestamp && 
        s.amount_with_vat === saleToDelete.amount_with_vat
      );
      if (dayIndex !== -1) {
        salesDay.splice(dayIndex, 1);
        setStorage('ventas_dia', salesDay);
      }
    }
  }
  
  refreshUI();
  updateDeleteList();
  showToast('✓ Venta eliminada');
}

function confirmModify() {
  const action = document.getElementById('modifyAction').value;
  
  if (action === 'add') {
    const dateInput = document.getElementById('saleDate').value;
    const amountInput = document.getElementById('saleAmount').value;
    
    if (!dateInput) {
      alert('Por favor selecciona una fecha');
      return;
    }
    
    if (!amountInput) {
      alert('Por favor ingresa un monto');
      return;
    }
    
    try {
      const amt = parseAmount(amountInput);
      // MODIFICADO: Redondear a números enteros
      const net = Math.round(amt / 1.19);
      const commission = Math.round(net * COMMISSION_RATE);
      
      const now = new Date();
      const selectedDateTime = new Date(dateInput + 'T' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0'));
      
      const sale = {
        amount_with_vat: Math.round(amt), // Entero
        net_without_vat: net, // Entero
        commission: commission, // Entero
        timestamp: selectedDateTime.toISOString(),
        date_iso: dateInput,
        month_id: dateInput.substring(0, 7)
      };
      
      const permanentSales = getStorage('ventas_permanentes');
      permanentSales.push(sale);
      setStorage('ventas_permanentes', permanentSales);
      
      const currentMonth = getCurrentMonth();
      if (dateInput.substring(0, 7) === currentMonth) {
        const salesMonth = getStorage('ventas_mes');
        salesMonth.push(sale);
        setStorage('ventas_mes', salesMonth);
      }
      
      const today = getCurrentDate();
      if (dateInput === today) {
        const salesDay = getStorage('ventas_dia');
        salesDay.push(sale);
        setStorage('ventas_dia', salesDay);
      }
      
      hideModal('modifyModal');
      refreshUI();
      showToast(`✓ Venta agregada con fecha ${formatDateForExcel(dateInput)}`);
    } catch (e) {
      alert(e.message);
    }
  }
}

function refreshUI() {
  const salesDay = getStorage('ventas_dia');
  const salesMonth = getStorage('ventas_mes');
  const currentMonth = getCurrentMonth();
  const salesCurrentMonth = salesMonth.filter(s => s.month_id === currentMonth);

  // MODIFICADO: Redondear todos los cálculos a enteros
  const dayWithVat = Math.round(salesDay.reduce((sum, s) => sum + s.amount_with_vat, 0));
  const dayWithoutVat = Math.round(salesDay.reduce((sum, s) => sum + s.net_without_vat, 0));
  const dayCommission = Math.round(salesDay.reduce((sum, s) => sum + s.commission, 0));

  const monthWithVat = Math.round(salesCurrentMonth.reduce((sum, s) => sum + s.amount_with_vat, 0));
  const monthWithoutVat = Math.round(salesCurrentMonth.reduce((sum, s) => sum + s.net_without_vat, 0));
  const monthCommission = Math.round(salesCurrentMonth.reduce((sum, s) => sum + s.commission, 0));

  document.getElementById('dayWithVat').textContent = formatCLP(dayWithVat);
  document.getElementById('dayWithoutVat').textContent = formatCLP(dayWithoutVat);
  document.getElementById('dayCommission').textContent = formatCLP(dayCommission);
  document.getElementById('monthWithVat').textContent = formatCLP(monthWithVat);
  document.getElementById('monthWithoutVat').textContent = formatCLP(monthWithoutVat);
  document.getElementById('monthCommission').textContent = formatCLP(monthCommission);

  renderSalesList('salesDay', salesDay.slice(-20).reverse());
  renderSalesList('salesMonth', salesCurrentMonth.slice(-20).reverse());

  renderCharts();
}

function renderSalesList(elementId, sales) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';
  sales.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'sale-item';
    const time = s.timestamp.substring(0, 16).replace('T', ' ');
    div.textContent = `${i + 1}. ${formatCLP(s.amount_with_vat)} | Neto: ${formatCLP(s.net_without_vat)} | Com: ${formatCLP(s.commission)} | ${time}`;
    container.appendChild(div);
  });
}

function showModal(id) {
  document.getElementById(id).classList.add('active');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showCloseDayModal() {
  showModal('closeDayModal');
}

function showCloseMonthModal() {
  showModal('closeMonthModal');
}

function showResetModal() {
  showModal('resetModal');
}

function showExportModal() {
  showModal('exportModal');
  updateExportOptions();
}

function confirmCloseDay() {
  closeDay();
  hideModal('closeDayModal');
}

function confirmCloseMonth() {
  closeMonth();
  hideModal('closeMonthModal');
}

function confirmReset() {
  resetAll();
  hideModal('resetModal');
}

function renderCharts() {
  renderDailyChart();
  renderMonthlyChart();
}

function renderDailyChart() {
  const currentMonth = getCurrentMonth();
  const salesMonth = getStorage('ventas_mes');
  const salesCurrentMonth = salesMonth.filter(s => s.month_id === currentMonth);
  
  const dataMap = {};
  
  salesCurrentMonth.forEach(s => {
    const day = parseInt(s.date_iso.split('-')[2]);
    dataMap[day] = (dataMap[day] || 0) + s.commission;
  });

  const days = Object.keys(dataMap).map(Number).sort((a, b) => a - b);
  const values = days.map(d => Math.round(dataMap[d])); // Entero

  if (days.length === 0) {
    days.push(1);
    values.push(0);
  }

  const ctx = document.getElementById('dailyChart');
  if (dailyChartInstance) {
    dailyChartInstance.destroy();
  }

  dailyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Comisión',
        data: values,
        backgroundColor: '#f7c600',
        borderColor: '#d1a400',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCLP(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCLP(value);
            },
            color: '#999999'
          },
          grid: {
            color: '#2a2a2a'
          }
        },
        x: {
          ticks: {
            color: '#999999'
          },
          grid: {
            color: '#2a2a2a'
          }
        }
      }
    }
  });
}

function renderMonthlyChart() {
  const salesMonth = getStorage('ventas_mes');
  const currentMonth = getCurrentMonth();
  const currentCommission = Math.round(salesMonth.filter(s => s.month_id === currentMonth).reduce((sum, s) => sum + s.commission, 0)); // Entero

  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const currentMonthNum = parseInt(currentMonth.split('-')[1]);
  const labels = [monthNames[currentMonthNum - 1]];
  const values = [currentCommission];

  const ctx = document.getElementById('monthlyChart');
  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Comisión',
        data: values,
        backgroundColor: '#111111',
        borderColor: '#444444',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCLP(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCLP(value);
            },
            color: '#999999'
          },
          grid: {
            color: '#2a2a2a'
          }
        },
        x: {
          ticks: {
            color: '#999999'
          },
          grid: {
            color: '#2a2a2a'
          }
        }
      }
    }
  });
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  const saleDateInput = document.getElementById('saleDate');
  if (saleDateInput) {
    saleDateInput.value = getCurrentDate();
    // Asegurar que el input de fecha tenga el formato correcto para móviles
    saleDateInput.type = 'date';
  }
  
  const searchQueryInput = document.getElementById('searchQuery');
  if (searchQueryInput) {
    searchQueryInput.addEventListener('input', searchPermanentSales);
  }
  
  const exportTypeSelect = document.getElementById('exportType');
  if (exportTypeSelect) {
    exportTypeSelect.addEventListener('change', updateExportOptions);
  }
  
  const saleAmountInput = document.getElementById('saleAmount');
  if (saleAmountInput) {
    saleAmountInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value) {
        const cursorPos = e.target.selectionStart;
        const oldLength = e.target.value.length;
        const num = parseInt(value);
        const formatted = '$ ' + num.toLocaleString('es-CL');
        e.target.value = formatted;
        const newLength = formatted.length;
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
      }
    });
  }
  
  // Configurar búsqueda de prospectos
  const searchProspectInput = document.getElementById('searchProspect');
  if (searchProspectInput) {
    searchProspectInput.addEventListener('input', filterProspects);
  }
  
  // Cargar nombre del vendedor al iniciar
  actualizarNombreVendedor();
  
  refreshUI();
  // Inicializar estadísticas de prospectos si estamos en la pantalla de CRM
  updateProspectStats();
});

document.getElementById('amountInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addSale();
});

document.getElementById('amountInput').addEventListener('input', (e) => {
  let value = e.target.value.replace(/[^0-9]/g, '');
  if (value) {
    const cursorPos = e.target.selectionStart;
    const oldLength = e.target.value.length;
    
    const num = parseInt(value);
    const formatted = '$ ' + num.toLocaleString('es-CL');
    e.target.value = formatted;
    
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
  }
});