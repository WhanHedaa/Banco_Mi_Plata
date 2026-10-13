// Instancia global del banco
const banco = new Banco();
let clienteActual = null;
let cuentaActual = null;

// =====================================================
// NAVEGACIÓN Y UI
// =====================================================
function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    const seccion = document.getElementById(id);
    if (seccion) seccion.classList.add('activa');

    // Cerrar menú móvil
    document.getElementById('navLinks').classList.remove('activo');

    // Actualizar UI según estado
    actualizarNavbar();

    if (id === 'panel' && clienteActual) {
        cargarPanel();
    }
    if (id === 'admin' && clienteActual && clienteActual.esAdmin) {
        cargarTablaUsuarios();
    }
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('activo');
}

function actualizarNavbar() {
    const logueado = !!clienteActual;
    document.getElementById('navLogin').style.display = logueado ? 'none' : 'list-item';
    document.getElementById('navRegistro').style.display = logueado ? 'none' : 'list-item';
    document.getElementById('navPanel').style.display = logueado ? 'list-item' : 'none';
    document.getElementById('navLogout').style.display = logueado ? 'list-item' : 'none';
    document.getElementById('navAdmin').style.display = (logueado && clienteActual.esAdmin) ? 'list-item' : 'none';
}

// =====================================================
// REGISTRO
// =====================================================
function registrarCliente(event) {
    event.preventDefault();

    const id = document.getElementById('regId').value.trim();
    const nombre = document.getElementById('regNombre').value.trim();
    const celular = document.getElementById('regCelular').value.trim();
    const usuario = document.getElementById('regUsuario').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const tipoCuenta = document.getElementById('regTipoCuenta').value;

    if (password !== passwordConfirm) {
        mostrarAlerta('Las contraseñas no coinciden.', 'danger');
        return;
    }

    try {
        const cliente = banco.registrarCliente(id, nombre, celular, usuario, password, tipoCuenta);
        mostrarAlerta(`¡Registro exitoso! Bienvenido/a ${cliente.nombre}. Ahora puedes iniciar sesión.`, 'success');
        document.getElementById('formRegistro').reset();
        setTimeout(() => mostrarSeccion('login'), 1500);
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

// =====================================================
// LOGIN
// =====================================================
function iniciarSesion(event) {
    event.preventDefault();

    const usuario = document.getElementById('loginUsuario').value.trim();
    const password = document.getElementById('loginPassword').value;

    const intentosInfo = document.getElementById('intentosInfo');
    const bloqueadoMsg = document.getElementById('bloqueadoMsg');
    const contador = document.getElementById('contadorIntentos');
    const btnLogin = document.getElementById('btnLogin');

    try {
        clienteActual = banco.autenticar(usuario, password);
        intentosInfo.style.display = 'none';
        bloqueadoMsg.style.display = 'none';
        btnLogin.disabled = false;

        document.getElementById('nombreUsuario').textContent = clienteActual.nombre;
        mostrarAlerta(`¡Bienvenido/a ${clienteActual.nombre}!`, 'success');
        mostrarSeccion('panel');
    } catch (error) {
        // Buscar cliente para mostrar intentos
        const cliente = banco.buscarClientePorUsuario(usuario);
        if (cliente) {
            if (cliente.bloqueado) {
                bloqueadoMsg.style.display = 'block';
                intentosInfo.style.display = 'none';
                btnLogin.disabled = true;
            } else {
                intentosInfo.style.display = 'block';
                contador.textContent = cliente.intentosFallidos;
            }
        }
        mostrarAlerta(error.message, 'danger');
    }
}

function cerrarSesion() {
    clienteActual = null;
    cuentaActual = null;
    document.getElementById('formLogin').reset();
    document.getElementById('intentosInfo').style.display = 'none';
    document.getElementById('bloqueadoMsg').style.display = 'none';
    document.getElementById('btnLogin').disabled = false;
    mostrarSeccion('inicio');
    mostrarAlerta('Sesión cerrada correctamente.', 'success');
}

// =====================================================
// PANEL DE TRANSACCIONES
// =====================================================
function cargarPanel() {
    if (!clienteActual) return;

    const select = document.getElementById('selectProducto');
    select.innerHTML = '';

    clienteActual.cuentas.forEach((cuenta, index) => {
        const option = document.createElement('option');
        option.value = index;
        let tipoLabel = '';
        switch (cuenta.tipo) {
            case 'ahorros': tipoLabel = 'Cuenta de Ahorros'; break;
            case 'corriente': tipoLabel = 'Cuenta Corriente'; break;
            case 'credito': tipoLabel = 'Tarjeta de Crédito'; break;
        }
        option.textContent = `${tipoLabel} - ${cuenta.numeroCuenta}`;
        select.appendChild(option);
    });

    if (clienteActual.cuentas.length > 0) {
        // Mantener el producto seleccionado si existe, sino el primero
        const idxActual = cuentaActual 
            ? clienteActual.cuentas.findIndex(c => c.numeroCuenta === cuentaActual.numeroCuenta) 
            : 0;
        const idx = idxActual >= 0 ? idxActual : 0;
        select.value = idx;
        cuentaActual = clienteActual.cuentas[idx];
        actualizarSaldoUI();
    }

    // Mostrar botón de compra solo si es tarjeta
    const btnCompra = document.getElementById('btnCompraCredito');
    btnCompra.style.display = (cuentaActual && cuentaActual.tipo === 'credito') ? 'flex' : 'none';

    // Mostrar u ocultar botón de abrir producto según si le faltan productos
    const btnAbrir = document.getElementById('btnAbrirProducto');
    const tiposExistentes = clienteActual.cuentas.map(c => c.tipo);
    const tieneTodos = tiposExistentes.includes('ahorros') && 
                       tiposExistentes.includes('corriente') && 
                       tiposExistentes.includes('credito');
    btnAbrir.style.display = tieneTodos ? 'none' : 'inline-flex';
}

function cambiarProducto() {
    const index = document.getElementById('selectProducto').value;
    cuentaActual = clienteActual.cuentas[index];
    actualizarSaldoUI();

    const btnCompra = document.getElementById('btnCompraCredito');
    btnCompra.style.display = (cuentaActual.tipo === 'credito') ? 'flex' : 'none';
}

function actualizarSaldoUI() {
    if (!cuentaActual) return;

    let saldoTexto = '';
    let tipoTexto = '';

    if (cuentaActual.tipo === 'credito') {
        saldoTexto = `$${cuentaActual.disponible.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        tipoTexto = `Tarjeta de Crédito | Cupo: $${cuentaActual.cupo.toLocaleString('es-CO')} | Deuda: $${cuentaActual.deuda.toLocaleString('es-CO')}`;
    } else {
        saldoTexto = `$${cuentaActual.saldo.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        tipoTexto = cuentaActual.tipo === 'ahorros' ? 'Cuenta de Ahorros (interés 1.5%)' : 'Cuenta Corriente (sobregiro 20%)';
    }

    document.getElementById('saldoActual').textContent = saldoTexto;
    document.getElementById('tipoCuentaActual').textContent = tipoTexto;
}

function consultarSaldo() {
    if (!cuentaActual) return;
    actualizarSaldoUI();
    let msg = '';
    if (cuentaActual.tipo === 'credito') {
        msg = `Disponible: $${cuentaActual.disponible.toLocaleString('es-CO')} | Deuda actual: $${cuentaActual.deuda.toLocaleString('es-CO')} | Cupo total: $${cuentaActual.cupo.toLocaleString('es-CO')}`;
    } else {
        msg = `Tu saldo actual es: $${cuentaActual.saldo.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
    }
    mostrarResultado(msg, 'success');
}

// =====================================================
// MODALES DE OPERACIONES
// =====================================================
function mostrarModal(tipo) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    let html = '';

    switch (tipo) {
        case 'consignar':
            html = `
                <h3><i class="fas fa-plus-circle"></i> Consignar Dinero</h3>
                <form onsubmit="ejecutarConsignacion(event)">
                    <div class="form-group">
                        <label>Monto a consignar</label>
                        <input type="number" id="montoConsignar" min="1" step="0.01" required placeholder="Ej: 50000">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Consignar</button>
                </form>
            `;
            break;

        case 'retirar':
            html = `
                <h3><i class="fas fa-minus-circle"></i> Retirar Dinero</h3>
                <form onsubmit="ejecutarRetiro(event)">
                    <div class="form-group">
                        <label>Monto a retirar</label>
                        <input type="number" id="montoRetirar" min="1" step="0.01" required placeholder="Ej: 20000">
                    </div>
                    <p style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
                        ${cuentaActual.tipo === 'ahorros' ? 'Se aplicará interés del 1.5% sobre el saldo al momento del retiro.' : ''}
                        ${cuentaActual.tipo === 'corriente' ? 'Puedes sobregirar hasta el 20% de tu saldo actual.' : ''}
                    </p>
                    <button type="submit" class="btn btn-primary btn-block">Retirar</button>
                </form>
            `;
            break;

        case 'transferir':
            // Listar otros productos del mismo usuario para facilitar
            let opcionesPropias = '';
            clienteActual.cuentas.forEach(c => {
                if (c.numeroCuenta !== cuentaActual.numeroCuenta) {
                    let label = c.tipo === 'ahorros' ? 'Ahorros' : c.tipo === 'corriente' ? 'Corriente' : 'Tarjeta Crédito';
                    opcionesPropias += `<option value="${c.numeroCuenta}">${label} - ${c.numeroCuenta}</option>`;
                }
            });

            html = `
                <h3><i class="fas fa-exchange-alt"></i> Transferir Dinero</h3>
                <form onsubmit="ejecutarTransferencia(event)">
                    <div class="form-group">
                        <label>Destino</label>
                        <select id="tipoDestinoTransfer" onchange="toggleDestinoTransfer()" style="margin-bottom:0.5rem;">
                            <option value="propia">Mis otros productos</option>
                            <option value="otra">Otra cuenta (otro usuario)</option>
                        </select>
                    </div>
                    <div class="form-group" id="grupoPropia" style="${opcionesPropias ? '' : 'display:none;'}">
                        <label>Selecciona tu producto destino</label>
                        <select id="cuentaDestinoPropia">
                            ${opcionesPropias || '<option value="">No tienes otros productos</option>'}
                        </select>
                    </div>
                    <div class="form-group" id="grupoOtra" style="display:none;">
                        <label>Número de cuenta destino</label>
                        <input type="text" id="cuentaDestinoOtra" placeholder="Ej: MP12345678">
                    </div>
                    <div class="form-group">
                        <label>Monto a transferir</label>
                        <input type="number" id="montoTransferir" min="1" step="0.01" required>
                    </div>
                    <p style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
                        Puedes transferir entre tus productos o a cuentas de otros usuarios. No se permite al mismo producto.
                    </p>
                    <button type="submit" class="btn btn-primary btn-block">Transferir</button>
                </form>
            `;
            break;

        case 'perfil':
            html = `
                <h3><i class="fas fa-user-cog"></i> Mi Perfil</h3>
                <form onsubmit="guardarPerfil(event)">
                    <div class="form-group">
                        <label>Nombre completo</label>
                        <input type="text" id="perfilNombre" value="${clienteActual.nombre}" required>
                    </div>
                    <div class="form-group">
                        <label>Celular</label>
                        <input type="tel" id="perfilCelular" value="${clienteActual.celular}" required>
                    </div>
                    <div class="form-group">
                        <label>Identificación</label>
                        <input type="text" value="${clienteActual.identificacion}" disabled>
                    </div>
                    <div class="form-group">
                        <label>Usuario</label>
                        <input type="text" value="${clienteActual.usuario}" disabled>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Guardar cambios</button>
                </form>
                <hr style="margin:1.5rem 0;">
                <h4 style="margin-bottom:1rem;">Cambiar contraseña</h4>
                <form onsubmit="cambiarPassword(event)">
                    <div class="form-group">
                        <label>Contraseña actual</label>
                        <input type="password" id="passActual" required>
                    </div>
                    <div class="form-group">
                        <label>Nueva contraseña</label>
                        <input type="password" id="passNueva" required minlength="4">
                    </div>
                    <div class="form-group">
                        <label>Confirmar nueva contraseña</label>
                        <input type="password" id="passNuevaConfirm" required>
                    </div>
                    <button type="submit" class="btn btn-secondary btn-block">Cambiar contraseña</button>
                </form>
            `;
            break;

        case 'compraCredito':
            html = `
                <h3><i class="fas fa-shopping-cart"></i> Compra a Cuotas</h3>
                <form onsubmit="ejecutarCompra(event)">
                    <div class="form-group">
                        <label>Valor de la compra</label>
                        <input type="number" id="montoCompra" min="1" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Número de cuotas</label>
                        <select id="numCuotas" required>
                            <option value="1">1 cuota (0%)</option>
                            <option value="2">2 cuotas (0%)</option>
                            <option value="3">3 cuotas (1.9%)</option>
                            <option value="4">4 cuotas (1.9%)</option>
                            <option value="5">5 cuotas (1.9%)</option>
                            <option value="6">6 cuotas (1.9%)</option>
                            <option value="7">7 cuotas (2.3%)</option>
                            <option value="12">12 cuotas (2.3%)</option>
                            <option value="24">24 cuotas (2.3%)</option>
                        </select>
                    </div>
                    <p style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
                        ≤2 cuotas: sin interés | 3-6: 1.9% | ≥7: 2.3% mensual
                    </p>
                    <button type="submit" class="btn btn-primary btn-block">Realizar compra</button>
                </form>
            `;
            break;

        case 'abrirProducto':
            // Determinar qué productos le faltan al usuario
            const tiposExistentes = clienteActual.cuentas.map(c => c.tipo);
            const opciones = [];
            if (!tiposExistentes.includes('ahorros')) {
                opciones.push('<option value="ahorros">Cuenta de Ahorros (interés 1.5%)</option>');
            }
            if (!tiposExistentes.includes('corriente')) {
                opciones.push('<option value="corriente">Cuenta Corriente (sobregiro 20%)</option>');
            }
            if (!tiposExistentes.includes('credito')) {
                opciones.push('<option value="credito">Tarjeta de Crédito (cupo $5.000.000)</option>');
            }

            if (opciones.length === 0) {
                html = `
                    <h3><i class="fas fa-check-circle"></i> Productos</h3>
                    <p style="text-align:center; color:#27ae60; margin: 1.5rem 0;">
                        ¡Ya tienes los 3 productos activos!<br>
                        <small>Cuenta de Ahorros + Cuenta Corriente + Tarjeta de Crédito</small>
                    </p>
                    <button class="btn btn-primary btn-block" onclick="cerrarModal()">Entendido</button>
                `;
            } else {
                html = `
                    <h3><i class="fas fa-plus-circle"></i> Abrir nuevo producto</h3>
                    <p style="font-size:0.9rem; color:#64748b; margin-bottom:1rem;">
                        Puedes tener las 3 cuentas activas al mismo tiempo en tu usuario.
                    </p>
                    <form onsubmit="abrirNuevoProducto(event)">
                        <div class="form-group">
                            <label>Selecciona el producto a abrir</label>
                            <select id="nuevoTipoProducto" required>
                                ${opciones.join('')}
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Abrir producto</button>
                    </form>
                `;
            }
            break;

        case 'nuevoUsuario':
            html = `
                <h3><i class="fas fa-user-plus"></i> Nuevo Usuario (Admin)</h3>
                <form onsubmit="adminCrearUsuario(event)">
                    <div class="form-group">
                        <label>Identificación</label>
                        <input type="text" id="adminId" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre completo</label>
                        <input type="text" id="adminNombre" required>
                    </div>
                    <div class="form-group">
                        <label>Celular</label>
                        <input type="tel" id="adminCelular" required>
                    </div>
                    <div class="form-group">
                        <label>Usuario</label>
                        <input type="text" id="adminUsuario" required>
                    </div>
                    <div class="form-group">
                        <label>Contraseña</label>
                        <input type="password" id="adminPass" required minlength="4">
                    </div>
                    <div class="form-group">
                        <label>Tipo de cuenta inicial</label>
                        <select id="adminTipo">
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                            <option value="credito">Tarjeta Crédito</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Crear usuario</button>
                </form>
            `;
            break;

        case 'editarUsuario':
            // Se llena dinámicamente
            break;
    }

    body.innerHTML = html;
    modal.classList.add('activo');
}

function cerrarModal() {
    document.getElementById('modal').classList.remove('activo');
}

// =====================================================
// OPERACIONES
// =====================================================
function ejecutarConsignacion(event) {
    event.preventDefault();
    const monto = parseFloat(document.getElementById('montoConsignar').value);

    try {
        cuentaActual.consignar(monto);
        banco.guardarDatos();
        actualizarSaldoUI();
        cerrarModal();
        mostrarResultado(`Consignación exitosa de $${monto.toLocaleString('es-CO')}. Nuevo saldo: $${(cuentaActual.tipo === 'credito' ? cuentaActual.disponible : cuentaActual.saldo).toLocaleString('es-CO')}`, 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function ejecutarRetiro(event) {
    event.preventDefault();
    const monto = parseFloat(document.getElementById('montoRetirar').value);

    try {
        const resultado = cuentaActual.retirar(monto);
        banco.guardarDatos();
        actualizarSaldoUI();
        cerrarModal();
        mostrarResultado(resultado.mensaje, 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function toggleDestinoTransfer() {
    const tipo = document.getElementById('tipoDestinoTransfer').value;
    document.getElementById('grupoPropia').style.display = tipo === 'propia' ? 'block' : 'none';
    document.getElementById('grupoOtra').style.display = tipo === 'otra' ? 'block' : 'none';
}

function ejecutarTransferencia(event) {
    event.preventDefault();
    const tipoDestino = document.getElementById('tipoDestinoTransfer').value;
    let numDestino = '';

    if (tipoDestino === 'propia') {
        numDestino = document.getElementById('cuentaDestinoPropia').value;
    } else {
        numDestino = document.getElementById('cuentaDestinoOtra').value.trim();
    }

    const monto = parseFloat(document.getElementById('montoTransferir').value);

    try {
        if (!numDestino) {
            throw new Error('Debes indicar la cuenta destino.');
        }
        // No permitir transferir al mismo producto
        if (numDestino === cuentaActual.numeroCuenta) {
            throw new Error('No se permite transferir al mismo producto.');
        }

        const destinoInfo = banco.buscarCuenta(numDestino);
        if (!destinoInfo) {
            throw new Error('Cuenta destino no encontrada.');
        }

        const resultado = cuentaActual.transferir(monto, destinoInfo.cuenta);
        banco.guardarDatos();
        actualizarSaldoUI();
        cerrarModal();
        mostrarResultado(resultado.mensaje, 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function ejecutarCompra(event) {
    event.preventDefault();
    const monto = parseFloat(document.getElementById('montoCompra').value);
    const cuotas = parseInt(document.getElementById('numCuotas').value);

    try {
        if (cuentaActual.tipo !== 'credito') {
            throw new Error('Esta operación solo está disponible para Tarjeta de Crédito.');
        }
        const resultado = cuentaActual.realizarCompra(monto, cuotas);
        banco.guardarDatos();
        actualizarSaldoUI();
        cerrarModal();
        mostrarResultado(resultado.mensaje, 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

/**
 * Permite que un usuario abra un nuevo producto bancario
 * (un mismo usuario puede tener las 3 cuentas activas)
 */
function abrirNuevoProducto(event) {
    event.preventDefault();
    const tipo = document.getElementById('nuevoTipoProducto').value;

    // Verificar que no tenga ya ese tipo
    if (clienteActual.cuentas.some(c => c.tipo === tipo)) {
        mostrarAlerta('Ya tienes ese tipo de producto activo.', 'danger');
        return;
    }

    const numCuenta = banco.generarNumeroCuenta();
    let nuevaCuenta;

    switch (tipo) {
        case 'ahorros':
            nuevaCuenta = new CuentaAhorros(numCuenta, 0);
            break;
        case 'corriente':
            nuevaCuenta = new CuentaCorriente(numCuenta, 0);
            break;
        case 'credito':
            nuevaCuenta = new TarjetaCredito(numCuenta, 5000000);
            break;
        default:
            mostrarAlerta('Tipo de producto no válido.', 'danger');
            return;
    }

    clienteActual.agregarCuenta(nuevaCuenta);
    banco.guardarDatos();
    cerrarModal();
    cargarPanel(); // Actualiza el selector y el botón

    const nombres = {
        ahorros: 'Cuenta de Ahorros',
        corriente: 'Cuenta Corriente',
        credito: 'Tarjeta de Crédito'
    };
    mostrarResultado(`¡${nombres[tipo]} abierta exitosamente! Número: ${numCuenta}`, 'success');
}

function mostrarMovimientos() {
    if (!cuentaActual) return;

    const movimientos = cuentaActual.movimientos;
    let html = '<h3 style="margin-bottom:1rem;"><i class="fas fa-history"></i> Historial de Movimientos</h3>';

    if (movimientos.length === 0) {
        html += '<p style="color:#64748b;">No hay movimientos registrados.</p>';
    } else {
        html += '<ul class="movimientos-lista">';
        movimientos.forEach(m => {
            const esPositivo = m.valor > 0;
            html += `
                <li class="movimiento-item">
                    <div>
                        <div class="movimiento-tipo">${m.tipo.toUpperCase()}</div>
                        <div class="movimiento-fecha">${m.getFechaFormateada()}</div>
                        <small>${m.descripcion || ''}</small>
                    </div>
                    <div class="movimiento-valor ${esPositivo ? 'positivo' : 'negativo'}">
                        ${esPositivo ? '+' : ''}$${Math.abs(m.valor).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </div>
                </li>
            `;
        });
        html += '</ul>';
    }

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('activo');
}

// =====================================================
// PERFIL
// =====================================================
function guardarPerfil(event) {
    event.preventDefault();
    clienteActual.nombre = document.getElementById('perfilNombre').value.trim();
    clienteActual.celular = document.getElementById('perfilCelular').value.trim();
    banco.guardarDatos();
    document.getElementById('nombreUsuario').textContent = clienteActual.nombre;
    cerrarModal();
    mostrarResultado('Perfil actualizado correctamente.', 'success');
}

function cambiarPassword(event) {
    event.preventDefault();
    const actual = document.getElementById('passActual').value;
    const nueva = document.getElementById('passNueva').value;
    const confirm = document.getElementById('passNuevaConfirm').value;

    if (nueva !== confirm) {
        mostrarAlerta('Las contraseñas nuevas no coinciden.', 'danger');
        return;
    }

    try {
        clienteActual.cambiarPassword(actual, nueva);
        banco.guardarDatos();
        cerrarModal();
        mostrarResultado('Contraseña cambiada exitosamente.', 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

// =====================================================
// ADMIN CRUD
// =====================================================
function cargarTablaUsuarios() {
    const tbody = document.getElementById('tbodyUsuarios');
    tbody.innerHTML = '';

    banco.clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cliente.identificacion}</td>
            <td>${cliente.nombre}</td>
            <td>${cliente.usuario}</td>
            <td>${cliente.celular}</td>
            <td>${cliente.bloqueado ? '<span style="color:red;">Bloqueado</span>' : '<span style="color:green;">Activo</span>'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="adminEditar('${cliente.usuario}')">Editar</button>
                ${!cliente.esAdmin ? `<button class="btn btn-danger btn-sm" onclick="adminEliminar('${cliente.usuario}')">Eliminar</button>` : ''}
                ${cliente.bloqueado ? `<button class="btn btn-primary btn-sm" onclick="adminDesbloquear('${cliente.usuario}')">Desbloquear</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function adminCrearUsuario(event) {
    event.preventDefault();
    try {
        banco.registrarCliente(
            document.getElementById('adminId').value.trim(),
            document.getElementById('adminNombre').value.trim(),
            document.getElementById('adminCelular').value.trim(),
            document.getElementById('adminUsuario').value.trim(),
            document.getElementById('adminPass').value,
            document.getElementById('adminTipo').value
        );
        cerrarModal();
        cargarTablaUsuarios();
        mostrarResultado('Usuario creado exitosamente.', 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function adminEditar(usuario) {
    const cliente = banco.buscarClientePorUsuario(usuario);
    if (!cliente) return;

    document.getElementById('modalBody').innerHTML = `
        <h3>Editar Usuario</h3>
        <form onsubmit="adminGuardarEdicion(event, '${usuario}')">
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="editNombre" value="${cliente.nombre}" required>
            </div>
            <div class="form-group">
                <label>Celular</label>
                <input type="tel" id="editCelular" value="${cliente.celular}" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Guardar</button>
        </form>
    `;
    document.getElementById('modal').classList.add('activo');
}

function adminGuardarEdicion(event, usuario) {
    event.preventDefault();
    const cliente = banco.buscarClientePorUsuario(usuario);
    if (cliente) {
        cliente.nombre = document.getElementById('editNombre').value.trim();
        cliente.celular = document.getElementById('editCelular').value.trim();
        banco.guardarDatos();
        cerrarModal();
        cargarTablaUsuarios();
        mostrarResultado('Usuario actualizado.', 'success');
    }
}

function adminEliminar(usuario) {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${usuario}?`)) return;
    try {
        banco.eliminarCliente(usuario);
        cargarTablaUsuarios();
        mostrarResultado('Usuario eliminado.', 'success');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function adminDesbloquear(usuario) {
    const cliente = banco.buscarClientePorUsuario(usuario);
    if (cliente) {
        cliente.desbloquear();
        banco.guardarDatos();
        cargarTablaUsuarios();
        mostrarResultado(`Usuario ${usuario} desbloqueado.`, 'success');
    }
}

// =====================================================
// UTILIDADES DE UI
// =====================================================
function mostrarResultado(mensaje, tipo = 'success') {
    const div = document.getElementById('resultadoOperacion');
    div.className = `resultado visible alert alert-${tipo}`;
    div.innerHTML = mensaje;
    // Scroll al resultado
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mostrarAlerta(mensaje, tipo = 'danger') {
    // Si hay modal abierto, mostrar dentro; si no, en resultado
    const modal = document.getElementById('modal');
    if (modal.classList.contains('activo')) {
        const body = document.getElementById('modalBody');
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.textContent = mensaje;
        alertDiv.style.marginBottom = '1rem';
        body.insertBefore(alertDiv, body.firstChild);
        setTimeout(() => alertDiv.remove(), 4000);
    } else {
        mostrarResultado(mensaje, tipo);
    }
}

// Cerrar modal al hacer clic fuera
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    actualizarNavbar();
    // Si hay sesión previa se podría restaurar, pero por seguridad no lo hacemos
});
