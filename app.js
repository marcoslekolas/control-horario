// Estado global
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let datos = JSON.parse(localStorage.getItem('controlHorarioDatos') || '{}');

const meses = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Aplicación cargada');
  cargarConfiguracion();
  renderizarCalendario();
  setupEventListeners();
});

function setupEventListeners() {
  console.log('🔧 Configurando event listeners...');
  
  // Navegación
  document.getElementById('btnPrev').addEventListener('click', function() {
    console.log('◀ Mes anterior');
    mesActual--;
    if (mesActual < 0) {
      mesActual = 11;
      anioActual--;
    }
    renderizarCalendario();
  });

  document.getElementById('btnNext').addEventListener('click', function() {
    console.log('▶ Mes siguiente');
    mesActual++;
    if (mesActual > 11) {
      mesActual = 0;
      anioActual++;
    }
    renderizarCalendario();
  });

  // Guardar configuración
  document.getElementById('btnGuardarConfig').addEventListener('click', guardarConfiguracion);
  
  // Guardar datos del mes
  document.getElementById('btnGuardar').addEventListener('click', function() {
    console.log('💾 Guardando datos del mes...');
    guardarDatosMes();
    alert('✅ Datos del mes guardados correctamente');
  });
  
  // Generar Excel
  document.getElementById('btnExcel').addEventListener('click', function() {
    console.log('📊 Generando Excel...');
    generarExcel();
  });
  
  // Backup
  document.getElementById('btnBackup').addEventListener('click', crearBackup);
  
  // Restaurar
  document.getElementById('btnRestore').addEventListener('click', function() {
    document.getElementById('fileRestore').click();
  });
  
  document.getElementById('fileRestore').addEventListener('change', restaurarBackup);
}

function cargarConfiguracion() {
  if (datos.config) {
    document.getElementById('empresa').value = datos.config.empresa || '';
    document.getElementById('cif').value = datos.config.cif || '';
    document.getElementById('ccc').value = datos.config.ccc || '';
    document.getElementById('trabajador').value = datos.config.trabajador || '';
    document.getElementById('nif').value = datos.config.nif || '';
    document.getElementById('naf').value = datos.config.naf || '';
  }
}

function guardarConfiguracion() {
  console.log('💾 Guardando configuración...');
  if (!datos.config) datos.config = {};
  
  datos.config.empresa = document.getElementById('empresa').value;
  datos.config.cif = document.getElementById('cif').value;
  datos.config.ccc = document.getElementById('ccc').value;
  datos.config.trabajador = document.getElementById('trabajador').value;
  datos.config.nif = document.getElementById('nif').value;
  datos.config.naf = document.getElementById('naf').value;
  
  localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
  alert('✅ Configuración guardada correctamente');
}

function renderizarCalendario() {
  console.log(`📅 Renderizando: ${meses[mesActual]} ${anioActual}`);
  
  document.getElementById('mesActual').textContent = `${meses[mesActual]} ${anioActual}`;
  
  const tbody = document.getElementById('tbodyCalendario');
  tbody.innerHTML = '';
  
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  
  if (!datos.meses) datos.meses = {};
  if (!datos.meses[claveMes]) datos.meses[claveMes] = {};
  
  let totalHoras = 0;
  let totalExtras = 0;
  let totalComplem = 0;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const claveDia = String(dia).padStart(2, '0');
    const registro = datos.meses[claveMes][claveDia] || {
      entradaManana: '',
      salidaManana: '',
      entradaTarde: '',
      salidaTarde: '',
      horasExtras: '',
      horasComplem: '',
      observaciones: ''
    };

    // Calcular horas totales
    const horasTotales = calcularHorasTotales(registro);
    registro.totalHoras = horasTotales;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${dia}</strong></td>
      <td><input type="time" class="entrada-manana" data-dia="${claveDia}" value="${registro.entradaManana}"></td>
      <td><input type="time" class="salida-manana" data-dia="${claveDia}" value="${registro.salidaManana}"></td>
      <td><input type="time" class="entrada-tarde" data-dia="${claveDia}" value="${registro.entradaTarde}"></td>
      <td><input type="time" class="salida-tarde" data-dia="${claveDia}" value="${registro.salidaTarde}"></td>
      <td><input type="number" class="total-horas" data-dia="${claveDia}" value="${registro.totalHoras || ''}" step="0.5" min="0" readonly></td>
      <td><input type="number" class="horas-extras" data-dia="${claveDia}" value="${registro.horasExtras || ''}" step="0.5" min="0"></td>
      <td><input type="number" class="horas-complem" data-dia="${claveDia}" value="${registro.horasComplem || ''}" step="0.5" min="0"></td>
      <td><input type="text" class="observaciones" data-dia="${claveDia}" value="${registro.observaciones || ''}" placeholder="Obs."></td>
    `;
    tbody.appendChild(tr);
    
    totalHoras += parseFloat(registro.totalHoras) || 0;
    totalExtras += parseFloat(registro.horasExtras) || 0;
    totalComplem += parseFloat(registro.horasComplem) || 0;
  }

  // Actualizar totales
  document.getElementById('totalHorasMes').textContent = totalHoras.toFixed(1);
  document.getElementById('totalExtras').textContent = totalExtras.toFixed(1);
  document.getElementById('totalComplem').textContent = totalComplem.toFixed(1);

  // Añadir event listeners a los inputs
  tbody.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('change', function() {
      const claveDia = this.dataset.dia;
      const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
      
      if (!datos.meses[claveMes][claveDia]) {
        datos.meses[claveMes][claveDia] = {};
      }
      
      if (this.classList.contains('entrada-manana')) {
        datos.meses[claveMes][claveDia].entradaManana = this.value;
      } else if (this.classList.contains('salida-manana')) {
        datos.meses[claveMes][claveDia].salidaManana = this.value;
      } else if (this.classList.contains('entrada-tarde')) {
        datos.meses[claveMes][claveDia].entradaTarde = this.value;
      } else if (this.classList.contains('salida-tarde')) {
        datos.meses[claveMes][claveDia].salidaTarde = this.value;
      } else if (this.classList.contains('horas-extras')) {
        datos.meses[claveMes][claveDia].horasExtras = this.value;
      } else if (this.classList.contains('horas-complem')) {
        datos.meses[claveMes][claveDia].horasComplem = this.value;
      } else if (this.classList.contains('observaciones')) {
        datos.meses[claveMes][claveDia].observaciones = this.value;
      }
      
      // Recalcular horas si cambió entrada/salida
      if (this.classList.contains('entrada-manana') || 
          this.classList.contains('salida-manana') || 
          this.classList.contains('entrada-tarde') || 
          this.classList.contains('salida-tarde')) {
        const horas = calcularHorasTotales(datos.meses[claveMes][claveDia]);
        datos.meses[claveMes][claveDia].totalHoras = horas;
        const row = this.closest('tr');
        row.querySelector('.total-horas').value = horas.toFixed(1);
      }
      
      // Actualizar totales del mes
      actualizarTotalesMes();
    });
  });
}

function calcularHorasTotales(registro) {
  let total = 0;
  
  if (registro.entradaManana && registro.salidaManana) {
    const inicio = new Date(`2000-01-01T${registro.entradaManana}`);
    const fin = new Date(`2000-01-01T${registro.salidaManana}`);
    total += (fin - inicio) / (1000 * 60 * 60);
  }
  
  if (registro.entradaTarde && registro.salidaTarde) {
    const inicio = new Date(`2000-01-01T${registro.entradaTarde}`);
    const fin = new Date(`2000-01-01T${registro.salidaTarde}`);
    total += (fin - inicio) / (1000 * 60 * 60);
  }
  
  return Math.round(total * 10) / 10;
}

function actualizarTotalesMes() {
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const registros = datos.meses[claveMes] || {};
  
  let totalHoras = 0;
  let totalExtras = 0;
  let totalComplem = 0;
  
  Object.values(registros).forEach(reg => {
    totalHoras += parseFloat(reg.totalHoras) || 0;
    totalExtras += parseFloat(reg.horasExtras) || 0;
    totalComplem += parseFloat(reg.horasComplem) || 0;
  });
  
  document.getElementById('totalHorasMes').textContent = totalHoras.toFixed(1);
  document.getElementById('totalExtras').textContent = totalExtras.toFixed(1);
  document.getElementById('totalComplem').textContent = totalComplem.toFixed(1);
}

function guardarDatosMes() {
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  
  // Guardar configuración
  if (!datos.config) datos.config = {};
  datos.config.empresa = document.getElementById('empresa').value;
  datos.config.cif = document.getElementById('cif').value;
  datos.config.ccc = document.getElementById('ccc').value;
  datos.config.trabajador = document.getElementById('trabajador').value;
  datos.config.nif = document.getElementById('nif').value;
  datos.config.naf = document.getElementById('naf').value;
  
  localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
}

async function generarExcel() {
  console.log('📊 Generando Excel profesional...');
  
  const config = datos.config || {};
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const registros = datos.meses[claveMes] || {};
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registro Jornada');

    // Configurar columnas
    worksheet.columns = [
      { header: 'DÍA', key: 'dia', width: 8 },
      { header: 'MAÑANA\nEntrada', key: 'entradaManana', width: 15 },
      { header: 'MAÑANA\nSalida', key: 'salidaManana', width: 15 },
      { header: 'TARDE\nEntrada', key: 'entradaTarde', width: 15 },
      { header: 'TARDE\nSalida', key: 'salidaTarde', width: 15 },
      { header: 'TOTAL HORAS', key: 'totalHoras', width: 15 },
      { header: 'HORAS EXTRAS', key: 'horasExtras', width: 15 },
      { header: 'HORAS COMPLEM.', key: 'horasComplem', width: 15 },
      { header: 'OBSERVACIONES', key: 'observaciones', width: 25 }
    ];

    // Título principal
    worksheet.mergeCells('A1:I1');
    const titulo = worksheet.getCell('A1');
    titulo.value = 'REGISTRO DIARIO DE JORNADA';
    titulo.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titulo.fill = {
      type: 'gradient',
      gradient: 'angle',
      from: { argb: 'FF667EEA' },
      to: { argb: 'FF764BA2' }
    };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    titulo.border = {
      top: { style: 'thick', color: { argb: 'FF667EEA' } },
      left: { style: 'thick', color: { argb: 'FF667EEA' } },
      bottom: { style: 'thick', color: { argb: 'FF667EEA' } },
      right: { style: 'thick', color: { argb: 'FF667EEA' } }
    };

    // Subtítulo legal
    worksheet.mergeCells('A2:I2');
    const subtítulo = worksheet.getCell('A2');
    subtítulo.value = 'En cumplimiento de la obligación establecida en el artículo 34.9 del Estatuto de los Trabajadores';
    subtítulo.font = { italic: true, size: 10 };
    subtítulo.alignment = { horizontal: 'center', vertical: 'middle' };
    subtítulo.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Información empresa y trabajador
    worksheet.addRow([]);
    worksheet.addRow(['EMPRESA:', config.empresa || '', 'CIF:', config.cif || '', 'CCC:', config.ccc || '']);
    worksheet.addRow(['TRABAJADOR/A:', config.trabajador || '', 'NIF:', config.nif || '', 'NAF:', config.naf || '']);
    worksheet.addRow(['MES Y AÑO:', `${meses[mesActual]} ${anioActual}`]);

    // Aplicar bordes y estilos
    for (let row = 3; row <= 6; row++) {
      for (let col = 1; col <= 6; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
        if (col % 2 !== 0) {
          cell.font = { bold: true, size: 10 };
        }
      }
    }

    worksheet.addRow([]);

    // Cabeceras de tabla con colores
    const headerRow1 = worksheet.addRow(['DÍA', 'HORARIO DE MAÑANA', '', 'HORARIO DE TARDE', '', 'TOTAL HORAS', 'HORAS EXTRAS', 'HORAS COMPLEM.', 'OBSERVACIONES']);
    const headerRow2 = worksheet.addRow(['DÍA', 'H. ENTRADA', 'H. SALIDA', 'H. ENTRADA', 'H. SALIDA', 'TOTAL HORAS', 'HORAS EXTRAS', 'HORAS COMPLEM.', 'OBSERVACIONES']);
    
    // Merge cells para cabeceras
    worksheet.mergeCells(`B7:C7`);
    worksheet.mergeCells(`D7:E7`);
    
    // Estilo cabeceras
    for (let col = 1; col <= 9; col++) {
      const cell1 = worksheet.getCell(7, col);
      const cell2 = worksheet.getCell(8, col);
      
      const headerStyle = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'gradient',
          gradient: 'angle',
          from: { argb: 'FF667EEA' },
          to: { argb: 'FF764BA2' }
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      };
      
      // Colores diferentes para mañana y tarde
      if (col >= 2 && col <= 3) {
        headerStyle.fill = {
          type: 'gradient',
          gradient: 'angle',
          from: { argb: 'FF4CAF50' },
          to: { argb: 'FF45a049' }
        };
      } else if (col >= 4 && col <= 5) {
        headerStyle.fill = {
          type: 'gradient',
          gradient: 'angle',
          from: { argb: 'FFFF9800' },
          to: { argb: 'FFF57C00' }
        };
      }
      
      cell1.style = headerStyle;
      cell2.style = headerStyle;
    }

    // Datos de días
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    let totalHorasMes = 0;
    let totalExtrasMes = 0;
    let totalComplemMes = 0;

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const claveDia = String(dia).padStart(2, '0');
      const reg = registros[claveDia] || {};
      
      const row = worksheet.addRow([
        dia,
        reg.entradaManana || '',
        reg.salidaManana || '',
        reg.entradaTarde || '',
        reg.salidaTarde || '',
        reg.totalHoras || '',
        reg.horasExtras || '',
        reg.horasComplem || '',
        reg.observaciones || ''
      ]);

      // Estilo de celdas
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Colorear filas alternas
        if (dia % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FF' }
          };
        }
      });

      totalHorasMes += parseFloat(reg.totalHoras) || 0;
      totalExtrasMes += parseFloat(reg.horasExtras) || 0;
      totalComplemMes += parseFloat(reg.horasComplem) || 0;
    }

    // Fila de totales
    const totalRowNum = 9 + diasEnMes;
    const totalRow = worksheet.addRow([
      'TOTAL MES', '', '', '', '',
      totalHorasMes.toFixed(1),
      totalExtrasMes.toFixed(1),
      totalComplemMes.toFixed(1),
      ''
    ]);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'gradient',
        gradient: 'angle',
        from: { argb: 'FF667EEA' },
        to: { argb: 'FF764BA2' }
      };
      cell.border = {
        top: { style: 'thick', color: { argb: 'FF667EEA' } },
        left: { style: 'thick', color: { argb: 'FF667EEA' } },
        bottom: { style: 'thick', color: { argb: 'FF667EEA' } },
        right: { style: 'thick', color: { argb: 'FF667EEA' } }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.addRow([]);

    // Texto legal y firmas
    const legalText1 = 'Registro realizado en cumplimiento de la obligación establecida en el Art. 34.9 del Real Decreto Legislativo 2/2015 de 23 de Octubre';
    const legalText2 = '"La empresa garantizará el registro diario de jornada, que deberá incluir el horario concreto de inicio y finalización de la jornada de trabajo de cada persona trabajadora"';
    const legalText3 = 'El empresario deberá conservar los resúmenes mensuales de los registros de jornada durante un período mínimo de cuatro años.';

    const rowLegal1 = worksheet.addRow([legalText1]);
    rowLegal1.getCell(1).merge(`A${worksheet.rowCount}:I${worksheet.rowCount}`);
    rowLegal1.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF667EEA' } };
    rowLegal1.getCell(1).alignment = { horizontal: 'center', wrapText: true };

    const rowLegal2 = worksheet.addRow([legalText2]);
    rowLegal2.getCell(1).merge(`A${worksheet.rowCount}:I${worksheet.rowCount}`);
    rowLegal2.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    rowLegal2.getCell(1).alignment = { horizontal: 'left', wrapText: true };

    const rowLegal3 = worksheet.addRow([legalText3]);
    rowLegal3.getCell(1).merge(`A${worksheet.rowCount}:I${worksheet.rowCount}`);
    rowLegal3.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    rowLegal3.getCell(1).alignment = { horizontal: 'left', wrapText: true };

    worksheet.addRow([]);
    
    const rowFirmas = worksheet.addRow(['Firma de la Empresa:', '', '', '', '', '', '', 'Firma del Trabajador:', '']);
    rowFirmas.getCell(1).font = { bold: true };
    rowFirmas.getCell(8).font = { bold: true };

    // Descargar Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nombreTrabajador = (config.trabajador || 'TRABAJADOR').replace(/\s+/g, '_');
    a.download = `REGISTRO_JORNADA_${nombreTrabajador}_${anioActual}_${String(mesActual + 1).padStart(2, '0')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('✅ Excel generado correctamente');
    console.log('✅ Excel generado con éxito');
    
  } catch (error) {
    console.error('❌ Error generando Excel:', error);
    alert('❌ Error al generar Excel: ' + error.message);
  }
}

function crearBackup() {
  console.log('📥 Creando backup...');
  const dataStr = JSON.stringify(datos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_control_horario_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('✅ Backup creado correctamente');
}

function restaurarBackup(event) {
  console.log('📤 Restaurando backup...');
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      datos = JSON.parse(e.target.result);
      localStorage.setItem('controlHorarioDatos', JSON.stringify(datos));
      cargarConfiguracion();
      renderizarCalendario();
      alert('✅ Backup restaurado correctamente');
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      alert('❌ Error al restaurar backup: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
