document.addEventListener('DOMContentLoaded', () => {
  let mes = new Date().getMonth(), anio = new Date().getFullYear();
  let datos = JSON.parse(localStorage.getItem('hc') || '{}');
  let cfg = datos.cfg || {empresa:'',cif:'',ccc:'',trabajador:'',nif:'',naf:''};
  const tbody = document.getElementById('tbody-calendario');
  const nombres = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const preset = {c:{em:'09:00',sm:'14:00',et:'16:00',st:'18:00',h:8,o:''},m:{em:'09:00',sm:'14:00',et:'',st:'',h:5,o:''},o:{em:'08:00',sm:'15:00',et:'',st:'',h:7,o:''},f:{em:'',sm:'',et:'',st:'',h:0,o:'FESTIVO'},v:{em:'',sm:'',et:'',st:'',h:0,o:'VACACIONES'},l:{em:'',sm:'',et:'',st:'',h:0,o:''}};

  function guardar(){datos.cfg=cfg; localStorage.setItem('hc',JSON.stringify(datos));}
  function claveM(){return `${anio}-${String(mes+1).padStart(2,'0')}`;}
  
  function render(){
    document.getElementById('mes-actual').textContent = `${nombres[mes]} ${anio}`;
    tbody.innerHTML='';
    const dias = new Date(anio, mes+1, 0).getDate();
    datos[claveM()] = datos[claveM()] || {};
    for(let d=1; d<=dias; d++){
      const ds = new Date(anio, mes, d).getDay();
      const kd = String(d).padStart(2,'0');
      if(!datos[claveM()][kd]) datos[claveM()][kd] = (ds>=1&&ds<=5)?{...preset.c}:{...preset.l};
      const r = datos[claveM()][kd];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><b>${d}</b></td>
        <td><input type="time" value="${r.em||''}" data-f="em" data-d="${kd}"></td>
        <td><input type="time" value="${r.sm||''}" data-f="sm" data-d="${kd}"></td>
        <td><input type="time" value="${r.et||''}" data-f="et" data-d="${kd}"></td>
        <td><input type="time" value="${r.st||''}" data-f="st" data-d="${kd}"></td>
        <td><b>${r.h||0}h</b></td>
        <td><input type="text" value="${r.o||''}" data-f="o" data-d="${kd}" placeholder="Obs."></td>`;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('input').forEach(i=>i.onchange=e=>{
      const d=e.target.dataset.d, f=e.target.dataset.f, v=e.target.value;
      datos[claveM()][d][f]=v; if(f!=='o') datos[claveM()][d].h = calc(d); guardar();
    });
    guardar();
  }
  
  function calc(d){
    const r=datos[claveM()][d];
    if(r.o?.includes('FESTIVO')||r.o?.includes('VACACIONES')) return r.h||0;
    let h=0;
    if(r.em&&r.sm) h+= (new Date(`2000-01-01T${r.sm}`)-new Date(`2000-01-01T${r.em}`))/36e5;
    if(r.et&&r.st) h+= (new Date(`2000-01-01T${r.st}`)-new Date(`2000-01-01T${r.et}`))/36e5;
    return Math.round(h*10)/10;
  }

  // Navegación
  document.getElementById('btn-prev').onclick=()=>{mes--; if(mes<0){mes=11;anio--;} render();};
  document.getElementById('btn-next').onclick=()=>{mes++; if(mes>11){mes=0;anio++;} render();};

  // Config
  document.getElementById('btn-config').onclick=()=>{
    ['cfg-empresa','cfg-cif','cfg-ccc','cfg-trabajador','cfg-nif','cfg-naf'].forEach((id,i)=>{
      document.getElementById(id).value = Object.values(cfg)[i];
    });
    document.getElementById('modal-config').showModal();
  };
  document.getElementById('form-config').onsubmit=e=>{
    e.preventDefault();
    cfg = {
      empresa:document.getElementById('cfg-empresa').value,
      cif:document.getElementById('cfg-cif').value,
      ccc:document.getElementById('cfg-ccc').value,
      trabajador:document.getElementById('cfg-trabajador').value,
      nif:document.getElementById('cfg-nif').value,
      naf:document.getElementById('cfg-naf').value
    };
    guardar(); document.getElementById('modal-config').close(); render();
  };
  document.getElementById('btn-cancelar').onclick=()=>document.getElementById('modal-config').close();

  // Backup
  document.getElementById('btn-export').onclick=()=>{
    const b=new Blob([JSON.stringify(datos)],{type:'application/json'}), a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=`backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  };
  document.getElementById('btn-import').onclick=()=>document.getElementById('file-import').click();
  document.getElementById('file-import').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{try{datos=JSON.parse(ev.target.result);cfg=datos.cfg||cfg;guardar();render();alert('✅ Restaurado');}catch(err){alert('❌ '+err.message);}}; r.readAsText(f); e.target.value='';
  };

  // Generar Excel
  document.getElementById('btn-generar').onclick=()=>{
    const wb=XLSX.utils.book_new();
    for(let ms=0; ms<12; ms++){
      const km = `${anio}-${String(ms+1).padStart(2,'0')}`, dias = new Date(anio, ms+1, 0).getDate(), rm = datos[km]||{};
      const wsData = [
        ['REGISTRO DIARIO DE JORNADA'],
        ['Art. 34.9 Estatuto de los Trabajadores'],
        [],
        ['EMPRESA:',cfg.empresa,'','C.I.F.',cfg.cif,'','C.C.C.',cfg.ccc,'','','MES:',`${nombres[ms]} ${anio}`],
        ['TRABAJADOR/A:',cfg.trabajador,'','N.I.F',cfg.nif,'','N.A.F',cfg.naf,'','','AÑO:',anio],
        [],
        ['DÍA','H. ENTRADA M.','FIRMA','H. SALIDA M.','FIRMA','H. ENTRADA T.','FIRMA','H. SALIDA T.','FIRMA','HORAS ORD.','HORAS EXT.','OBSERVACIONES']
      ];
      let tot=0;
      for(let d=1; d<=dias; d++){
        const r=rm[String(d).padStart(2,'0')]||{}, h=r.h||0; tot+=h;
        wsData.push([d,r.em||'','',r.sm||'','',r.et||'','',r.st||'','',h,'',r.o||'']);
      }
      wsData.push([],['Fdo. Empresa','','','','','Fdo. Trabajador','','','','',`Total: ${tot}h`,'']);
      const ws=XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols']=[{wch:5},{wch:10},{wch:15},{wch:10},{wch:15},{wch:10},{wch:15},{wch:10},{wch:15},{wch:10},{wch:10},{wch:20}];
      XLSX.utils.book_append_sheet(wb, ws, nombres[ms]);
    }
    XLSX.writeFile(wb, `${anio}_CONTROL_HORARIO.xlsx`);
  };

  render();
});
