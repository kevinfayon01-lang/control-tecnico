// CONFIGURACIÓN DE TU FORMULARIO DE FORMSPREE
const FORMSPREE_URL = "https://formspree.io";

// Almacenamiento local para no perder datos en el celular
let trabajos = JSON.parse(localStorage.getItem('tech_trabajos')) || [];
let visitas = JSON.parse(localStorage.getItem('tech_visitas')) || [];

// FUNCIÓN PARA CAMBIAR PESTAÑAS (Asegurada de forma global)
window.switchTab = function(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    if (tabName === 'balance') renderBalance();
    if (tabName === 'agenda') renderVisitas();
}

document.addEventListener("DOMContentLoaded", () => {
    const finanzasForm = document.getElementById('finanzas-form');
    const agendaForm = document.getElementById('agenda-form');
    const btnCancelar = document.getElementById('btn-cancelar');
    const selectEstado = document.getElementById('trabajo-estado');
    const contenedorSeñaInput = document.getElementById('contenedor-monto-seña');

    // Mostrar/ocultar casillero de seña dinámicamente según la opción elegida
    if (selectEstado && contenedorSeñaInput) {
        selectEstado.addEventListener('change', (e) => {
            if (e.target.value === 'Seña') {
                contenedorSeñaInput.style.display = 'block';
                document.getElementById('trabajo-monto-seña').setAttribute('required', 'true');
            } else {
                contenedorSeñaInput.style.display = 'none';
                document.getElementById('trabajo-monto-seña').removeAttribute('required');
            }
        });
    }

    // REGISTRO DE TRABAJOS Y GASTOS
    if (finanzasForm) {
        finanzasForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = document.getElementById('trabajo-id').value;
            const cliente = document.getElementById('trabajo-cliente').value;
            const rubro = document.getElementById('trabajo-rubro').value;
            const montoTotal = parseFloat(document.getElementById('trabajo-monto').value);
            const estado = document.getElementById('trabajo-estado').value;
            const desc = document.getElementById('trabajo-descripcion').value;
            
            let señaAbonada = 0;
            if (estado === 'Seña') {
                señaAbonada = parseFloat(document.getElementById('trabajo-monto-seña').value);
            }

            const datosTrabajo = {
                id: id ? parseInt(id) : Date.now(),
                cliente, rubro, montoTotal, estado, señaAbonada,
                descripcion: desc,
                fecha: new Date().toLocaleDateString('es-AR')
            };

            if (id) {
                trabajos = trabajos.map(t => t.id === datosTrabajo.id ? datosTrabajo : t);
                alert("¡Registro de trabajo actualizado! ✏️");
            } else {
                trabajos.push(datosTrabajo);
                alert("¡Guardado en caja correctamente! 💰");
                
                fetch(FORMSPREE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ Rubro: rubro, Cliente: cliente, Monto_Total: `$${montoTotal}`, Condicion: estado })
                }).catch(() => console.log("Guardado local sin red"));
            }

            localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
            resetearFormulario();
            window.switchTab('balance');
        });
    }

    // REGISTRO DE VISITAS TÉCNICAS (AGENDA)
    if (agendaForm) {
        agendaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cliente = document.getElementById('visita-cliente').value;
            const direccion = document.getElementById('visita-direccion').value;
            const fecha = document.getElementById('visita-fecha').value;
            const falla = document.getElementById('visita-falla').value;

            const nuevaVisita = { id: Date.now(), cliente, direccion, fecha, falla };
            visitas.push(nuevaVisita);
            localStorage.setItem('tech_visitas', JSON.stringify(visitas));
            
            agendaForm.reset();
            alert("¡Visita agendada con éxito! 📅");
            renderVisitas();
        });
    }

    if (btnCancelar) btnCancelar.addEventListener('click', resetearFormulario);
    
    // Ejecutar renders iniciales por si arranca en otra pestaña
    renderVisitas();
});

// MOSTRAR VISITAS AGENDADAS
function renderVisitas() {
    const contenedor = document.getElementById('lista-visitas');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (visitas.length === 0) {
        contenedor.innerHTML = `<p style="color:#7f8c8d; text-align:center; padding: 10px;">No tenés visitas pendientes en agenda.</p>`;
        return;
    }

    visitas.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

    visitas.forEach(v => {
        const div = document.createElement('div');
        div.className = 'visita-item';
        div.innerHTML = `
            <div class="visita-info">
                <h4>${v.cliente}</h4>
                <p>📍 <strong>Dirección:</strong> ${v.direccion}</p>
                <p>🔧 <strong>Falla:</strong> ${v.falla}</p>
                <p>📅 <strong>Fecha:</strong> ${v.fecha.split('-').reverse().join('/')}</p>
            </div>
            <div>
                <button class="btn-accion" onclick="completarVisita(${v.id})">✅</button>
                <button class="btn-accion" onclick="eliminarVisita(${v.id})">🗑️</button>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

window.completarVisita = function(id) {
    const v = visitas.find(vis => vis.id === id);
    if (!v) return;
    document.getElementById('trabajo-cliente').value = v.cliente;
    document.getElementById('trabajo-descripcion').value = `Visita por: ${v.falla}`;
    visitas = visitas.filter(vis => vis.id !== id);
    localStorage.setItem('tech_visitas', JSON.stringify(visitas));
    window.switchTab('trabajos');
}

window.eliminarVisita = function(id) {
    if (confirm("¿Borrar visita?")) {
        visitas = visitas.filter(v => v.id !== id);
        localStorage.setItem('tech_visitas', JSON.stringify(visitas));
        renderVisitas();
    }
}

// CALCULAR CONTADORES Y RENDERIZAR RECUADRO DE BALANCE
function renderBalance() {
    const lista = document.getElementById('lista-trabajos');
    if (!lista) return;
    lista.innerHTML = '';

    let ingresosReales = 0;
    let gastosTotales = 0;
    let deudasClientes = 0;

    if (trabajos.length === 0) {
        lista.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay registros.</td></tr>`;
    } else {
        trabajos.forEach(t => {
            let textoMontoFila = `$${t.montoTotal.toFixed(2)}`;
            if (t.estado === 'Gasto') { gastosTotales += t.montoTotal; }
            else if (t.estado === 'Cobrado') { ingresosReales += t.montoTotal; }
            else if (t.estado === 'Seña') {
                ingresosReales += t.señaAbonada;
                deudasClientes += (t.montoTotal - t.señaAbonada);
                textoMontoFila = `Total: $${t.montoTotal} (Señó: $${t.señaAbonada})`;
            } else if (t.estado === 'Pendiente') { deudasClientes += t.montoTotal; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.cliente}</strong><br><small style="color:#7f8c8d">${t.descripcion}</small></td>
                <td>${textoMontoFila}</td>
                <td><span class="badge ${t.estado}">${t.estado}</span></td>
                <td>
                    ${(t.estado === 'Seña' || t.estado === 'Pendiente') ? `<button class="btn-accion" onclick="liquidarDeuda(${t.id})">💸</button>` : ''}
                    <button class="btn-accion" onclick="cargarEditarTrabajo(${t.id})">✏️</button>
                    <button class="btn-accion" onclick="eliminarTrabajo(${t.id})">🗑️</button>
                </td>
            `;
            lista.appendChild(tr);
        });
    }

    document.getElementById('total-ingresos').innerText = `$${ingresosReales.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${gastosTotales.toFixed(2)}`;
    document.getElementById('total-por-cobrar').innerText = `$${deudasClientes.toFixed(2)}`;
    document.getElementById('total-neto').innerText = `$${(ingresosReales - gastosTotales).toFixed(2)}`;
}

window.liquidarDeuda = function(id) {
    const t = trabajos.find(trab => trab.id === id);
    if (!t && confirm(`¿Saldar deuda de ${t.cliente}?`)) {
        t.estado = 'Cobrado';
        t.señaAbonada = 0;
        localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
        renderBalance();
    }
}

window.cargarEditarTrabajo = function(id) {
    const t = trabajos.find(trab => trab.id === id);
    if (!t) return;
    document.getElementById('trabajo-id').value = t.id;
    document.getElementById('trabajo-cliente').value = t.cliente;
    document.getElementById('trabajo-rubro').value = t.rubro;
    document.getElementById('trabajo-monto').value = t.montoTotal;
    document.getElementById('trabajo-estado').value = t.estado;
    document.getElementById('trabajo-descripcion').value = t.descripcion;
    window.switchTab('trabajos');
}

window.eliminarTrabajo = function(id) {
    if (confirm("¿Borrar registro?")) {
        trabajos = trabajos.filter(t => t.id !== id);
        localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
        renderBalance();
    }
}

function resetearFormulario() {
