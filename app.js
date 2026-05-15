// Configuración
const REPO = 'TU_USUARIO/control-horario';
const PATH = 'data/registros.json';
const BRANCH = 'main';

// Estado local
let pat = localStorage.getItem('GH_PAT') || prompt('Introduce tu GitHub PAT (scope: repo):');
if (pat) localStorage.setItem('GH_PAT', pat);

let localData = JSON.parse(localStorage.getItem('local_registros') || '{"config":{},"registros":[]}');

// Cargar config si existe
document.getElementById('btn-config').onclick = () => {
  const c = localData.config;
  const nueva = prompt('EMPRESA|CIF|CCC|TRABAJADOR|NIF|NAF (separados por |)', 
    `${c.empresa}|${c.cif}|${c.ccc}|${c.trabajador}|${c.nif}|${c.naf}`);
  if (nueva) {
    const [e, ci, cc, t, n, na] = nueva.split('|');
    localData.config = { empresa:e, cif:ci, ccc:cc, trabajador:t, nif:n, naf:na };
    saveLocal();
  }
};

// Presets
document.querySelectorAll('.presets button').forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.clear) {
      ['em','sm','et','st','obs'].forEach(id => document.getElementById(id).value = '');
      return;
    }
    if (btn.dataset.m) {
      document.getElementById('em').value = btn.dataset.m;
      document.getElementById('sm').value = btn.dataset.sm;
      document.getElementById('et').value = btn.dataset.t;
      document.getElementById('st').value = btn.dataset.st;
    }
    if (btn.dataset.obs) document.getElementById('obs').value = btn.dataset.obs;
  };
});

// Cálculo horas
function calcHoras(em, sm, et, st) {
  if (!em || !sm) return 0;
  const diff = (a, b) => { const [h1,m1]=a.split(':').map(Number), [h2,m2]=b.split(':').map(Number); return (h2*60+m2 - h1*60-m1)/60; };
  let h = diff(em, sm);
  if (et && st) h += diff(et, st);
  return Math.round(h * 10) / 10;
}

// Guardar
document.getElementById('registro-form').onsubmit = async (e) => {
  e.preventDefault();
  const fecha = document.getElementById('fecha').value;
  const em = document.getElementById('em').value;
  const sm = document.getElementById('sm').value;
  const et = document.getElementById('et').value;
  const st = document.getElementById('st').value;
  const obs = document.getElementById('obs').value;

  const reg = { fecha, em, sm, et, st, obs, horas: calcHoras(em, sm, et, st) };
  
  // Actualizar o añadir
  const idx = localData.registros.findIndex(r => r.fecha === fecha);
  if (idx >= 0) localData.registros[idx] = reg;
  else localData.registros.push(reg);

  localData.registros.sort((a,b) => a.fecha.localeCompare(b.fecha));
  saveLocal();
  await syncToGitHub();
  document.getElementById('status').textContent = '✅ Guardado y sincronizado';
  setTimeout(() => document.getElementById('status').textContent = '', 3000);
};

function saveLocal() {
  localStorage.setItem('local_registros', JSON.stringify(localData));
}

// Sincronización GitHub
async function syncToGitHub() {
  try {
    const headers = { 'Authorization': `token ${pat}`, 'Accept': 'application/vnd.github.v3+json' };
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, { headers });
    const { sha, content } = await res.json();
    const current = JSON.parse(atob(content.replace(/\n/g, '')));
    
    // Fusionar configuración y registros
    const merged = { ...current, ...localData };
    merged.registros = [...(current.registros || []), ...localData.registros]
      .sort((a,b) => a.fecha.localeCompare(b.fecha))
      .filter((v,i,a) => a.findIndex(t => t.fecha === v.fecha) === i); // eliminar duplicados

    const contentB64 = btoa(unescape(encodeURIComponent(JSON.stringify(merged, null, 2))));
    
    await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message: `sync: ${new Date().toISOString()}`, content: contentB64, sha, branch: BRANCH })
    });
  } catch (err) {
    console.error('Error sincronizando:', err);
    document.getElementById('status').textContent = '⚠️ Error sync. Revisa el PAT.';
  }
}

// Inicializar fecha
document.getElementById('fecha').valueAsDate = new Date();