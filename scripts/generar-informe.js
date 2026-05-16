const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/registros.json');
const { config, registros } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const now = new Date();
const mesObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const mesNum = String(mesObj.getMonth() + 1).padStart(2, '0');
const mesNombre = mesObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
const anio = mesObj.getFullYear();

const registrosMes = registros.filter(r => r.fecha.startsWith(`${anio}-${mesNum}`));

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Registro Jornada');

// Cabecera
ws.mergeCells('A1:L1'); ws.getCell('A1').value = 'REGISTRO DIARIO DE JORNADA'; ws.getCell('A1').font = { bold: true, size: 12 };
ws.mergeCells('A2:L2'); ws.getCell('A2').value = 'En cumplimiento de la obligación establecida en el artículo 34.9 del Estatuto de los Trabajadores';
ws.mergeCells('A4:B4'); ws.getCell('A4').value = 'EMPRESA:'; ws.getCell('C4').value = config.empresa;
ws.mergeCells('E4:F4'); ws.getCell('E4').value = 'C.I.F.'; ws.getCell('G4').value = config.cif;
ws.mergeCells('I4:J4'); ws.getCell('I4').value = 'C.C.C.'; ws.getCell('K4').value = config.ccc;
ws.mergeCells('L4:L4'); ws.getCell('L4').value = `MES: ${mesNombre} ${anio}`;
ws.mergeCells('A5:B5'); ws.getCell('A5').value = 'TRABAJADOR/A:'; ws.getCell('C5').value = config.trabajador;
ws.mergeCells('E5:F5'); ws.getCell('E5').value = 'N.I.F'; ws.getCell('G5').value = config.nif;
ws.mergeCells('I5:J5'); ws.getCell('I5').value = 'N.A.F'; ws.getCell('K5').value = config.naf;
ws.mergeCells('L5:L5'); ws.getCell('L5').value = `AÑO: ${anio}`;

// Encabezados tabla (idénticos a tu Excel)
const headers = ['DÍA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','H. ENTRADA','FIRMA','H. SALIDA','FIRMA','HORAS ORD.','HORAS EXTRA.','OBSERVACIONES'];
headers.forEach((h, i) => { ws.getCell(7, i+1).value = h; ws.getCell(7, i+1).font = { bold: true }; });

let totalHoras = 0;
for (let d = 1; d <= 31; d++) {
  const r = registrosMes.find(x => parseInt(x.fecha.split('-')[2]) === d);
  const row = [d, r?.em||'', '', r?.sm||'', '', r?.et||'', '', r?.st||'', '', r?.horas||'', '', r?.obs||''];
  totalHoras += r?.horas || 0;
  row.forEach((val, i) => ws.getCell(7+d, i+1).value = val);
}

// Pie
const last = 39;
ws.mergeCells(`A${last}:E${last}`); ws.getCell(`A${last}`).value = 'Fdo. La Empresa';
ws.mergeCells(`F${last}:J${last}`); ws.getCell(`F${last}`).value = 'Fdo. Trabajador/a';
ws.mergeCells(`K${last}:L${last}`); ws.getCell(`K${last}`).value = `Total horas: ${totalHoras}`;

// Guardar
const outDir = path.join(__dirname, '../informes');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const file = `${anio}-${mesNum}_REGISTRO_JORNADA.xlsx`;
wb.xlsx.writeFile(path.join(outDir, file)).then(() => console.log(`✅ ${file} generado`));
