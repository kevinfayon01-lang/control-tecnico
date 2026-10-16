// CONFIGURACIÓN DE TU FORMULARIO DE FORMSPREE
const FORMSPREE_URL = "https://formspree.io";

// Almacenamiento local para no perder datos en el celular
let trabajos = JSON.parse(localStorage.getItem('tech_trabajos')) || [];
let visitas = JSON.parse(localStorage.getItem('tech_visitas')) || [];

function switchTab(tabName, event) {
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
                cliente, 
                rubro, 
                montoTotal, 
                estado, 
                señaAbonada,
                descripcion: desc,
                fecha: new Date().toLocaleDateString('es-AR')
            };

            if (id) {
                // Modo Edición
                trabajos = trabajos.map(t => t.id === datosTrabajo.id ? datosTrabajo : t);
                alert("¡Registro de trabajo actualizado! ✏️");
            } else {
                // Modo Nuevo Registro
                trabajos.push(datosTrabajo);
                alert("¡Guardado en caja correctamente! 💰");
                
                // Respaldo por correo a tu Formspree
                fetch(FORMSPREE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ 
                        Rubro: rubro, 
                        Cliente: cliente, 
                        Monto_Total: `$${montoTotal}`, 
                        Seña_Cobrada: estado === 'Seña' ? `$${señaAbonada}` : 'No aplica',
                        Estado: estado,
                        Detalle: desc 
                    })
                }).catch(() => console.log("Guardado local sin internet"));
            }

            localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
            resetearFormulario();
            switchTab('balance');
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
                <button class="btn-accion" onclick="completarVisita(${v.id})" title="Pasar a Trabajo Realizado">✅</button>
                <button class="btn-accion" onclick="eliminarVisita(${v.id})" title="Eliminar de agenda">🗑️</button>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// PASAR VISITA A TRABAJO REALIZADO
function completarVisita(id) {
    const v = visitas.find(vis => vis.id === id);
    if (!v) return;
    
    document.getElementById('trabajo-cliente').value = v.cliente;
    document.getElementById('trabajo-descripcion').value = `Visita técnica por: ${v.falla}`;
    
    visitas = visitas.filter(vis => vis.id !== id);
    localStorage.setItem('tech_visitas', JSON.stringify(visitas));
    
    switchTab('trabajos');
    alert("¡Cliente cargado en el formulario! Ingresá el importe y el estado del pago.");
}

function eliminarVisita(id) {
    if (confirm("¿Querés borrar esta visita programada de la agenda?")) {
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
        lista.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay registros guardados.</td></tr>`;
    } else {
        trabajos.forEach(t => {
            let textoMontoFila = `$${t.montoTotal.toFixed(2)}`;
            
            // Matemática inteligente para balances y deudas
            if (t.estado === 'Gasto') {
                gastosTotales += t.montoTotal;
            } else if (t.estado === 'Cobrado') {
                ingresosReales += t.montoTotal;
            } else if (t.estado === 'Seña') {
                ingresosReales += t.señaAbonada;
                deudasClientes += (t.montoTotal - t.señaAbonada);
                textoMontoFila = `Total: $${t.montoTotal} (Señó: $${t.señaAbonada})`;
            } else if (t.estado === 'Pendiente') {
                deudasClientes += t.montoTotal;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.cliente}</strong><br><small style="color:#7f8c8d">[${t.rubro}] ${t.descripcion}</small></td>
                <td>${textoMontoFila}</td>
                <td><span class="badge ${t.estado}">${t.estado}</span></td>
                <td>
                    ${(t.estado === 'Seña' || t.estado === 'Pendiente') ? `<button class="btn-accion" onclick="liquidarDeuda(${t.id})" title="Marcar como Totalmente Cobrado">💸</button>` : ''}
                    <button class="btn-accion" onclick="cargarEditarTrabajo(${t.id})" title="Modificar">✏️</button>
                    <button class="btn-accion" onclick="eliminarTrabajo(${t.id})" title="Borrar">🗑️</button>
                </td>
            `;
            lista.appendChild(tr);
        });
    }

    // Dibujar totales en pantalla
    document.getElementById('total-ingresos').innerText = `$${ingresosReales.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${gastosTotales.toFixed(2)}`;
    document.getElementById('total-por-cobrar').innerText = `$${deudasClientes.toFixed(2)}`;
    document.getElementById('total-neto').innerText = `$${(ingresosReales - gastosTotales).toFixed(2)}`;
}

// BOTÓN DIRECTO PARA MARCAR COMO TOTALMENTE COBRADO (💸)
function liquidarDeuda(id) {
    const t = trabajos.find(trab => trab.id === id);
    if (!t) return;

    if (confirm(`¿Confirmás que el cliente ${t.cliente} ya te pagó la totalidad del saldo pendiente?`)) {
        t.estado = 'Cobrado';
