document.addEventListener('DOMContentLoaded', function () {

  // ==========================================
  // 1. GENERADOR DE DATOS ALEATORIOS CREDENCIAL
  // ==========================================
  
  const nombres = ["Juan", "María", "Carlos", "Ana", "Pedro", "Lucía", "Miguel", "Sofía", "Jorge", "Elena", "Elisa", "Roberto"];
  const apellidos = ["García", "Rodríguez", "López", "Martínez", "González", "Pérez", "Sánchez", "Ramirez", "Díaz", "Fernández"];
  const ciudades = ["General Rodríguez", "CABA", "La Plata", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán", "Mar del Plata"];
  const provincias = ["Buenos Aires", "Córdoba", "Santa Fe", "Mendoza", "Tucumán"];
  
  // Listas medicas
  const alergiasLista = ["PENICILINA", "LATEX", "POLEN", "ACAROS", "NÍQUEL", "SULFAS"];
  const medicamentosLista = ["ENALAPRIL", "METFORMINA", "IBUPROFENO", "LEVOTIROXINA", "ATORVASTATINA", "CLONAZEPAM"];
  const operacionesLista = ["APENDICECTOMÍA", "CESÁREA", "VESÍCULA", "BOMBA DE MORFINA", "PRÓTESIS DE RODILLA", "BYPASS GÁSTRICO"];
  const antecedentesLista = ["HIPERTENSIÓN", "DIABETES TIPO 2", "ASMA", "HIPOTIROIDISMO", "HIPERTENSIÓN REACTIVA AL ESTRÉS"];
  const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  // Helpers
  function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randNum(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  
  // Generadores específicos
  function genDNI() { 
    const n = randNum(10000000, 50000000).toString();
    return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`;
  }
  
  function genFechaNac() {
    const dia = randNum(1, 28);
    const mes = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][randNum(0, 11)];
    const anio = randNum(1950, 2005);
    return `${dia} ${mes} ${anio}`;
  }

  function genList(source, emptyText, max = 1) {
    if (Math.random() > 0.7) return emptyText; 
    const count = randNum(1, max);
    let items = [];
    let temp = [...source];
    for(let i=0; i<count; i++) {
        if(temp.length === 0) break;
        const idx = Math.floor(Math.random() * temp.length);
        items.push(temp.splice(idx, 1)[0]);
    }
    return items.join('<br>');
  }

  function genTel() {
    const count = randNum(1, 3);
    let html = "";
    for(let i=0; i<count; i++) html += `011 ${randNum(1000,9999)} ${randNum(1000,9999)}<br>`;
    return html;
  }

  // --- POBLAR LA TARJETA ---
  const nombre = randItem(nombres);
  const apellido = randItem(apellidos);
  const fullName = `${nombre} ${apellido}`;
  const dni = genDNI();

  // Frente
  document.getElementById('fullNameFront').textContent = fullName;
  document.getElementById('dniFront').textContent = `D.N.I: ${dni}`;
  document.getElementById('bloodType').textContent = randItem(tiposSangre);
  
  document.getElementById('alergias').innerHTML = genList(alergiasLista, "NO REFIERE", 1);
  document.getElementById('operaciones').innerHTML = genList(operacionesLista, "NINGUNA", 2);
  document.getElementById('fechaNac').textContent = genFechaNac();
  
  document.getElementById('medicamentos').innerHTML = genList(medicamentosLista, "SIN MEDICACIÓN VITAL EN USO", 2);
  document.getElementById('domicilio').innerHTML = `${randItem(ciudades)}<br>${randItem(provincias)}`;
  
  document.getElementById('antecedentes').innerHTML = genList(antecedentesLista, "SIN PATOLOGÍAS REGISTRADAS", 2);
  document.getElementById('contactos').innerHTML = genTel();

  // Dorso
  document.getElementById('fullNameBack').textContent = fullName;
  document.getElementById('dniBack').textContent = `D.N.I: ${dni}`;
  document.getElementById('idNumber').textContent = `ID03-${dni.replace(/\./g,'')}`;


  // ==========================================
  // 2. GIRO DE TARJETA
  // ==========================================
  const card = document.getElementById('idCard');
  if (card) {
    card.addEventListener('click', function() {
      this.classList.toggle('is-flipped');
    });
  }


  // ==========================================
  // 3. SCROLL SUAVE Y NAVEGACIÓN
  // ==========================================
  function smoothScrollTo(element, duration = 1700) {
    if (!element) return;
    const targetY = element.getBoundingClientRect().top + window.pageYOffset;
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    let startTime = null;

    function animation(currentTime) {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      window.scrollTo(0, startY + distance * ease);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    requestAnimationFrame(animation);
  }

  // Links Navbar
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.getAttribute('href').substring(1);
      const target = id === 'inicio' ? document.body : document.getElementById(id);
      smoothScrollTo(target);
    });
  });

  // Botones Hero
  const btnSumate = document.getElementById('btn-sumate');
  const btnInfo = document.getElementById('btn-info');
  if(btnSumate) btnSumate.addEventListener('click', (e) => { e.preventDefault(); smoothScrollTo(document.getElementById('sumate')); });
  if(btnInfo) btnInfo.addEventListener('click', (e) => { e.preventDefault(); smoothScrollTo(document.getElementById('informacion')); });


  // ==========================================
  // 4. API GEOREF (CIUDADES)
  // ==========================================
  const provSel = document.querySelector('select[name="provincia"]');
  const ciuSel = document.getElementById('ciudad-select');

  if(provSel && ciuSel) {
    provSel.addEventListener('change', async () => {
       const prov = provSel.value;
       ciuSel.innerHTML = '<option value="">Cargando ciudades...</option>';
       if(!prov) { ciuSel.innerHTML='<option value="">Seleccioná una ciudad</option>'; return; }
       try {
         const r = await fetch('https://apis.datos.gob.ar/georef/api/localidades?max=5000&campos=nombre&provincia='+encodeURIComponent(prov));
         const d = await r.json();
         const locs = (d.localidades||[]).map(l=>l.nombre).sort((a,b)=>a.localeCompare(b,'es'));
         ciuSel.innerHTML = '<option value="">Seleccioná una ciudad</option>';
         locs.forEach(n => { const o = document.createElement('option'); o.value=n; o.textContent=n; ciuSel.appendChild(o); });
       } catch(e) { ciuSel.innerHTML='<option value="">Error al cargar</option>'; }
    });
  }


  // ==========================================
  // 5. MODALES Y FORMULARIOS (BREVO/FORMSUBMIT)
  // ==========================================
  
  // Helpers Modales
  function openModal(id) {
    const m = document.getElementById(id);
    if(!m) return;
    const c = m.querySelector('.modal-card');
    m.classList.remove('hidden');
    requestAnimationFrame(() => { m.classList.add('show'); if(c) c.classList.add('show'); });
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if(!m) return;
    const c = m.querySelector('.modal-card');
    m.classList.remove('show');
    if(c) c.classList.remove('show');
    setTimeout(() => m.classList.add('hidden'), 250);
  }

  // Setup de Cierres
  ['novedades-modal', 'success-modal', 'sumate-modal', 'newsletter-modal'].forEach(id => {
    const m = document.getElementById(id);
    if(!m) return;
    m.addEventListener('click', e => { if(e.target === m) closeModal(id); });
    const btn = m.querySelector('button'); // Boton cerrar o OK
    if(btn) btn.addEventListener('click', () => closeModal(id));
  });

  // Novedades Auto
  openModal('novedades-modal');
  setTimeout(() => closeModal('novedades-modal'), 10000);

  // Formulario Contacto
  const fContact = document.getElementById('contact-form');
  if(fContact) {
    fContact.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = fContact.querySelector('button');
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Enviando...';
        try {
            const r = await fetch(fContact.action, { method: 'POST', body: new FormData(fContact), headers: {'Accept':'application/json'} });
            if(!r.ok) throw new Error();
            fContact.reset();
            openModal('success-modal');
        } catch(err) { alert('Ocurrió un error.'); }
        finally { btn.disabled=false; btn.textContent=txt; }
    });
  }

  // Formulario Sumate
  const fSumate = document.getElementById('sumate-form');
  if(fSumate) {
    fSumate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = fSumate.querySelector('button');
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Enviando...';
        try {
            const fd = new FormData(fSumate);
            const email = (fd.get('email')||'').trim();
            const p1 = fetch(fSumate.action, { method:'POST', headers:{'Accept':'application/json'}, body:fd });
            let p2 = Promise.resolve();
            if(email) p2 = fetch('/api/sumate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, tipo:'SUMARME'}) });
            const [r] = await Promise.all([p1, p2]);
            if(!r.ok) throw new Error();
            fSumate.reset();
            openModal('sumate-modal');
        } catch(err) { alert('Error al enviar.'); }
        finally { btn.disabled=false; btn.textContent=txt; }
    });
  }

  // Formulario Newsletter
  const fNews = document.getElementById('newsletter-form');
  if(fNews) {
    fNews.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = fNews.querySelector('button');
        const txt = btn.textContent;
        btn.disabled=true; btn.textContent='Enviando...';
        try {
            const email = fNews.querySelector('input[name="email"]').value.trim();
            if(!email) throw new Error('Email invalido');
            const r = await fetch('/api/newsletter', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}) });
            if(!r.ok) throw new Error();
            fNews.reset();
            openModal('newsletter-modal');
        } catch(err) { alert('Error al suscribir.'); }
        finally { btn.disabled=false; btn.textContent=txt; }
    });
  }

});
</script>
