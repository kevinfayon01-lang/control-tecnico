// CONFIGURACIÓN DE TU FORMULARIO DE FORMSPREE
const FORMSPREE_URL = "https://formspree.io";

// Almacenamiento local para no perder datos al cerrar la pestaña
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

    // CONTROL DEL FORMULARIO DE TRABAJOS Y MODIFICACIONES
    if (finanzasForm) {
        finanzasForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = document.getElementById('trabajo-id').value;
            const cliente = document.getElementById('trabajo-cliente').value;
            const rubro = document.getElementById('trabajo-rubro').value;
            const monto = parseFloat(document.getElementById('trabajo-monto').value);
            const estado = document.getElementById('trabajo-estado').value;
            const desc = document.getElementById('trabajo-descripcion').value;

            const datosTrabajo = {
                id: id ? parseInt(id) : Date.now(),
                cliente, rubro, monto, estado, descripcion: desc,
                fecha: new Date().toLocaleDateString('es-AR')
            };

            if (id) {
                // Modo Edición: Actualiza el existente
                trabajos = trabajos.map(t => t.id === datosTrabajo.id ? datosTrabajo : t);
                alert("¡Registro de trabajo actualizado! ✏️");
            } else {
                // Modo Nuevo Registro
                trabajos.push(datosTrabajo);
                alert("¡Trabajo registrado en caja con éxito! 💰");
                
                // Copia de respaldo por mail automática a Formspree
                fetch(FORMSPREE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ Rubro: rubro, Cliente: cliente, Monto: `$${monto}`, Detalle: desc, Condicion: estado })
                }).catch(() => console.log("Guardado local sin conexión"));
            }

            localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
            resetearFormulario();
            switchTab('balance');
        });
    }

    // CONTROL DEL FORMULARIO DE VISITAS TÉCNICAS
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
            alert("¡Visita agendada correctamente! 📅");
            renderVisitas();
        });
    }

    if (btnCancelar) btnCancelar.addEventListener('click', resetearFormulario);
});

// MOSTRAR VISITAS AGENDADAS EN PANTALLA
function renderVisitas() {
    const contenedor = document.getElementById('lista-visitas');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (visitas.length === 0) {
        contenedor.innerHTML = `<p style="color:#7f8c8d; text-align:center; padding: 10px;">No tenés visitas pendientes en agenda.</p>`;
        return;
    }

    // Ordenar visitas para mostrar primero las fechas más viejas/próximas
    visitas.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

    visitas.forEach(v => {
        const div = document.createElement('div');
        div.className = 'visita-item';
        div.innerHTML = `
            <div class="visita-info">
                <h4>${v.cliente}</h4>
                <p>📍 <strong>Dirección:</strong> ${v.direccion}</p>
                <p>🔧 <strong>Falla:</strong> ${v.falla}</p>
                <p>📅 <strong>Pautado para:</strong> ${v.fecha.split('-').reverse().join('/')}</p>
            </div>
            <div>
                <button class="btn-accion" onclick="completarVisita(${v.id})" title="Pasar a Trabajo Realizado">✅</button>
                <button class="btn-accion" onclick="eliminarVisita(${v.id})" title="Eliminar de agenda">🗑️</button>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// 🟢 ESTA FUNCIÓN PASA LA VISITA AL REGISTRO Y PREGUNTA CÓMO SE RESOLVIÓ COBRO
function completarVisita(id) {
    const v = visitas.find(vis => vis.id === id);
    if (!v) return;
    
    // Autocompleta el formulario de trabajos para ahorrarte escribir en la calle
    document.getElementById('trabajo-cliente').value = v.cliente;
    document.getElementById('trabajo-descripcion').value = `Visita por: ${v.falla}`;
    
    // Remueve la visita de la agenda por completada
    visitas = visitas.filter(vis => vis.id !== id);
    localStorage.setItem('tech_visitas', JSON.stringify(visitas));
    
    switchTab('trabajos');
    alert("¡Datos del cliente cargados! Ingresá el precio final y el estado del pago para registrar el cobro.");
}

function eliminarVisita(id) {
    if (confirm("¿Querés cancelar o eliminar esta visita programada?")) {
        visitas = visitas.filter(v => v.id !== id);
        localStorage.setItem('tech_visitas', JSON.stringify(visitas));
        renderVisitas();
    }
}

// CALCULAR CONTADORES Y RENDERIZAR HISTORIAL COMPLETO
function renderBalance() {
    const lista = document.getElementById('lista-trabajos');
    if (!lista) return;
    lista.innerHTML = '';

    let ingresos = 0;
    let gastos = 0;

    if (trabajos.length === 0) {
        lista.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay registros de trabajos o gastos guardados.</td></tr>`;
    } else {
        trabajos.forEach(t => {
            // Clasificación del dinero para el balance
            if (t.estado === 'Gasto') {
                gastos += t.monto;
            } else {
                ingresos += t.monto; // Suma totales cobrados y adelantos/señas
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.cliente}</strong><br><small style="color:#7f8c8d">[${t.rubro}] ${t.descripcion}</small></td>
                <td>$${t.monto.toFixed(2)}</td>
                <td><span class="badge ${t.estado}">${t.estado}</span></td>
                <td>
                    <button class="btn-accion" onclick="cargarEditarTrabajo(${t.id})" title="Modificar">✏️</button>
                    <button class="btn-accion" onclick="eliminarTrabajo(${t.id})" title="Borrar">🗑️</button>
                </td>
            `;
            lista.appendChild(tr);
        });
    }

    // Actualiza los balances en las tarjetas
    document.getElementById('total-ingresos').innerText = `$${ingresos.toFixed(2)}`;
    document.getElementById('total-gastos').innerText = `$${gastos.toFixed(2)}`;
    document.getElementById('total-neto').innerText = `$${(ingresos - gastos).toFixed(2)}`;
}

// MODIFICAR TRABAJOS MANUALMENTE DEL HISTORIAL
function cargarEditarTrabajo(id) {
    const t = trabajos.find(trab => trab.id === id);
    if (!t) return;

    document.getElementById('trabajo-id').value = t.id;
    document.getElementById('trabajo-cliente').value = t.cliente;
    document.getElementById('trabajo-rubro').value = t.rubro;
    document.getElementById('trabajo-monto').value = t.monto;
    document.getElementById('trabajo-estado').value = t.estado;
    document.getElementById('trabajo-descripcion').value = t.descripcion;

    document.getElementById('form-titulo').innerText = "Modificar Registro de Trabajo ✏️";
    document.getElementById('btn-submit').innerText = "Guardar Cambios";
    document.getElementById('btn-cancelar').style.display = "block";
    switchTab('trabajos');
}

function eliminarTrabajo(id) {
    if (confirm("¿Estás seguro de que querés borrar este registro del balance?")) {
        trabajos = trabajos.filter(t => t.id !== id);
        localStorage.setItem('tech_trabajos', JSON.stringify(trabajos));
        renderBalance();
    }
}

function resetearFormulario() {
    document.getElementById('finanzas-form').reset();
    document.getElementById('trabajo-id').value = '';
    document.getElementById('form-titulo').innerText = "Registrar Trabajo Realizado";
    document.getElementById('btn-submit').innerText = "Guardar Registro";
    document.getElementById('btn-cancelar').style.display = "none";
}
