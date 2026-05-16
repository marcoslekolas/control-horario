// Estado local
let local = JSON.parse(localStorage.getItem('local_registros') || '{"config":{},"registros":[]}');

// Configuración
document.getElementById('btn-config').onclick = () => {
  const c = local.config;
  const data = prompt('📝 EMPRESA|CIF|CCC|TRABAJADOR|NIF|NAF', `${c.empresa}|${c.cif}|${c.ccc}|${c.trabajador}|${c.nif}|${c.naf}`);
  if (data) {
    const [e,ci,cc,t,n,na] = data.split('|');
    local.config = { empresa:e, cif:ci, ccc:cc, trabajador:t, nif:n, naf:na };
    saveLocal();
  }
};

// Presets de horario
document.querySelectorAll('.presets button').forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.clear) {
      ['em','sm','et','st','obs','horas'].forEach(id => document.getElementById(id).value = '');
      return;
    }
    if (btn.dataset.m) {
      document.getElementById('em').value = btn.dataset.m;
      document.getElementById('sm').value = btn.dataset.sm;
      document.getElementById('et').value = btn.dataset.t;
      document.getElementById('st').value = btn.dataset.st;
      document.getElementById('horas').value = btn.dataset.h;
    }
    if (btn.dataset.obs) document.getElementById('obs').value = btn.dataset.obs;
  };
});

// Guardar registro
document.getElementById('registro-form').onsubmit = (e) => {
  e.preventDefault();
  const fecha = document.getElementById('fecha').value;
  const reg = {
    fecha,
    em: document.getElementById('em').value,
    sm: document.getElementById('sm').value,
    et: document.getElementById('et').value,
    st: document.getElementById('st').value,
    obs: document.getElementById('obs').value,
    horas: parseFloat(document.getElementById('horas').value) || 0
  };

  const idx = local.registros.findIndex(r => r.fecha === fecha);
  if (idx >= 0) local.registros[idx] = reg;
  else local.registros.push(reg);
  
  local.registros.sort((a,b) => a.fecha.localeCompare(b.fecha));
  saveLocal();
  setStatus('✅ Guardado en el navegador');
};

function saveLocal() { localStorage.setItem('local_registros', JSON.stringify(local)); }
function setStatus(msg) { const s = document.getElementById('status'); s.textContent = msg; setTimeout(() => s.textContent = '', 3000); }

// Exportar JSON para subir a GitHub
function exportarJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(local, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = "registros.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus('📥 JSON descargado. Súbelo a GitHub en data/registros.json');
}
// Añade botón de exportar dinámicamente al header
const btnExport = document.createElement('button');
btnExport.textContent = '📤 Exportar para GitHub';
btnExport.style.marginLeft = '0.5rem';
btnExport.onclick = exportarJSON;
document.getElementById('btn-config').after(btnExport);

document.getElementById('fecha').valueAsDate = new Date();
