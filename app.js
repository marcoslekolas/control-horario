// Estado global
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let datos = JSON.parse(localStorage.getItem('controlHorario') || '{}');

const meses = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosGuardados();
  renderizarCalendario();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('btn-prev').addEventListener('click', () => {
    mesActual--;
    if (mesActual < 0) {
      mesActual = 11;
      anioActual--;
    }
    renderizarCalendario();
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    mesActual++;
    if (mesActual > 11) {
      mesActual = 0;
      anioActual++;
    }
    renderizarCalendario();
  });

  document.getElementById('btn-guardar').addEventListener('click', guardarDatos);
  document.getElementById('btn-excel').addEventListener('click', generarExcelProfesional);
  document.getElementById('btn-backup').addEventListener('click', crearBackup);
  document.getElementById('btn-restore').addEventListener('click', () => {
    document.getElementById('file-restore').click();
  });
  document.getElementById('file-restore').addEventListener('change', restaurarBackup);
}

function cargarDatosGuardados() {
  if (datos.config) {
    document.getElementById('empresa').value = datos.config.empresa || '';
    document.getElementById('cif').value = datos.config.cif || '';
    document.getElementById('ccc').value = datos.config.ccc || '';
    document.getElementById('trabajador').value = datos.config.trabajador || '';
    document.getElementById('nif').value = datos.config.nif || '';
    document.getElementById('naf').value = datos.config.naf || '';
  }
}

function renderizarCalendario() {
  document.getElementById('mes-actual').textContent = `${meses[mesActual]} ${anioActual}`;
  const tbody = document.getElementById('tbody-calendario');
  tbody.innerHTML = '';

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  
  if (!datos[claveMes]) {
    datos[claveMes] = {};
  }

  let totalHoras = 0;
  let totalExtras = 0;
  let totalComplem = 0;

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const claveDia = String(dia).padStart(2, '0');
    const registro = datos[claveMes][claveDia] || {
      entradaManana: '',
      salidaManana: '',
      entradaTarde: '',
      salidaTarde: '',
      horasExtras: '',
      horasComplem: ''
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${dia}</strong></td>
      <td><input type="time" class="entrada-manana" data-dia="${claveDia}" value="${registro.entradaManana}"></td>
      <td><input type="time" class="salida-manana" data-dia="${claveDia}" value="${registro.salidaManana}"></td>
      <td><input type="time" class="entrada-tarde" data-dia="${claveDia}" value="${registro.entradaTarde}"></td>
      <td><input type="time" class="salida-tarde" data-dia="${claveDia}" value="${registro.salidaTarde}"></td>
      <td><input type="number" class="total-horas" data-dia="${claveDia}" value="${registro.totalHoras || ''}" step="0.5" min="0"></td>
      <td><input type="number" class="horas-extras" data-dia="${claveDia}" value="${registro.horasExtras || ''}" step="0.5" min="0"></td>
      <td><input type="number" class="horas-complem" data-dia="${claveDia}" value="${registro.horasComplem || ''}" step="0.5" min="0"></td>
      <td><input type="text" class="firma" data-dia="${claveDia}" value="${registro.firma || ''}" placeholder="Firma"></td>
    `;
    tbody.appendChild(tr);

    totalHoras += parseFloat(registro.totalHoras) || 0;
    totalExtras += parseFloat(registro.horasExtras) || 0;
    totalComplem += parseFloat(registro.horasComplem) || 0;
  }

  document.getElementById('total-horas-mes').textContent = totalHoras.toFixed(1);
  document.getElementById('total-extras').textContent = totalExtras.toFixed(1);
  document.getElementById('total-complem').textContent = totalComplem.toFixed(1);

  // Event listeners para inputs
  tbody.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', () => {
      actualizarRegistro(input);
    });
  });
}

function actualizarRegistro(input) {
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const dia = input.dataset.dia;
  
  if (!datos[claveMes]) datos[claveMes] = {};
  if (!datos[claveMes][dia]) datos[claveMes][dia] = {};

  const campo = input.classList.contains('entrada-manana') ? 'entradaManana' :
                input.classList.contains('salida-manana') ? 'salidaManana' :
                input.classList.contains('entrada-tarde') ? 'entradaTarde' :
                input.classList.contains('salida-tarde') ? 'salidaTarde' :
                input.classList.contains('total-horas') ? 'totalHoras' :
                input.classList.contains('horas-extras') ? 'horasExtras' :
                input.classList.contains('horas-complem') ? 'horasComplem' : 'firma';

  datos[claveMes][dia][campo] = input.value;
  
  // Recalcular totales
  renderizarCalendario();
}

function guardarDatos() {
  datos.config = {
    empresa: document.getElementById('empresa').value,
    cif: document.getElementById('cif').value,
    ccc: document.getElementById('ccc').value,
    trabajador: document.getElementById('trabajador').value,
    nif: document.getElementById('nif').value,
    naf: document.getElementById('naf').value
  };
  
  localStorage.setItem('controlHorario', JSON.stringify(datos));
  alert('✅ Datos guardados correctamente');
}

async function generarExcelProfesional() {
  const config = datos.config || {};
  const claveMes = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const registros = datos[claveMes] || {};
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registro de Jornada');

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
    { header: 'FIRMA DEL TRABAJADOR', key: 'firma', width: 25 }
  ];

  // Estilo de cabecera
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

  // Título principal
  worksheet.mergeCells('A1:I1');
  const titulo = worksheet.getCell('A1');
  titulo.value = 'REGISTRO DIARIO DE JORNADA';
  titulo.font = { bold: true, size: 16, color: { argb: 'FF667EEA' } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  titulo.border = {
    top: { style: 'thick', color: { argb: 'FF667EEA' } },
    left: { style: 'thick', color: { argb: 'FF667EEA' } },
    bottom: { style: 'thick', color: { argb: 'FF667EEA' } },
    right: { style: 'thick', color: { argb: 'FF667EEA' } }
  };

  // Información empresa y trabajador
  worksheet.addRow([]);
  worksheet.addRow(['EMPRESA:', config.empresa || '', 'CIF:', config.cif || '', 'CCC:', config.ccc || '']);
  worksheet.addRow(['TRABAJADOR/A:', config.trabajador || '', 'NIF:', config.nif || '', 'NAF:', config.naf || '']);
  worksheet.addRow(['MES Y AÑO:', `${meses[mesActual]} ${anioActual}`]);

  // Aplicar estilo a celdas de info
  for (let row = 2; row <= 5; row++) {
    for (let col = 1; col <= 6; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
      cell.font = { bold: col % 2 !== 0, size: 10 };
    }
  }

  worksheet.addRow([]);

  // Cabeceras de tabla
  const headerRow = worksheet.addRow([
    'DÍA', 'MAÑANA Entrada', 'MAÑANA Salida', 'TARDE Entrada', 'TARDE Salida',
    'TOTAL HORAS', 'HORAS EXTRAS', 'HORAS COMPLEM.', 'FIRMA DEL TRABAJADOR'
  ]);
  
  headerRow.eachCell(cell => {
    cell.style = headerStyle;
  });

  // Datos de días
  let totalHorasMes = 0;
  let totalExtrasMes = 0;
  let totalComplemMes = 0;

  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  
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
      reg.firma || ''
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
  const totalRow = worksheet.addRow([
    'TOTAL MES', '', '', '', '',
    totalHorasMes.toFixed(1),
    totalExtrasMes.toFixed(1),
    totalComplemMes.toFixed(1),
    ''
  ]);

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
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

  // Texto legal
  const legalText = [
    'REGISTRO REALIZADO EN CUMPLIMIENTO DE LA OBLIGACIÓN ESTABLECIDA EN EL ART. 34.9 DEL ESTATUTO DE LOS TRABAJADORES',
    '',
    '"La empresa garantizará el registro diario de jornada, que deberá incluir el horario concreto de inicio y finalización de la jornada de trabajo de cada persona trabajadora"',
    '',
    'El empresario deberá conservar los resúmenes mensuales de los registros de jornada durante un período mínimo de cuatro años.',
    '',
    'FIRMA DE LA EMPRESA: ___________________________    FIRMA DEL TRABAJADOR: ___________________________'
  ];

  legalText.forEach((text, index) => {
    const row = worksheet.addRow([text]);
    const cell = row.getCell(1);
    cell.merge('A' + (worksheet.rowCount) + ':I' + (worksheet.rowCount));
    cell.font = { 
      italic: index !== 0 && index !== 6,
      bold: index === 0 || index === 6,
      size: index === 0 ? 10 : 9,
      color: { argb: index === 0 || index === 6 ? 'FF667EEA' : 'FF555555' }
    };
    cell.alignment = { horizontal: index === 0 || index === 6 ? 'center' : 'left', vertical: 'middle', wrapText: true };
  });

  // Descargar Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `REGISTRO_JORNADA_${config.trabajador?.replace(/\s+/g, '_') || 'TRABAJADOR'}_${anioActual}_${String(mesActual + 1).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  alert('✅ Excel profesional generado correctamente');
}

function crearBackup() {
  const dataStr = JSON.stringify(datos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_control_horario_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert('✅ Backup creado correctamente');
}

function restaurarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      datos = JSON.parse(e.target.result);
      localStorage.setItem('controlHorario', JSON.stringify(datos));
      cargarDatosGuardados();
      renderizarCalendario();
      alert('✅ Backup restaurado correctamente');
    } catch (error) {
      alert('❌ Error al restaurar backup: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
