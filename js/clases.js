// =====================================================
// CLASE MOVIMIENTO (para el historial)
// =====================================================
class Movimiento {
    constructor(tipo, valor, descripcion = '') {
        this.fecha = new Date();
        this.tipo = tipo;           // 'consignacion', 'retiro', 'transferencia', 'compra'
        this.valor = valor;
        this.descripcion = descripcion;
    }

    getFechaFormateada() {
        return this.fecha.toLocaleString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// =====================================================
// CLASE ABSTRACTA CUENTA (base)
// =====================================================
class Cuenta {
    #numeroCuenta;
    #saldo;
    #movimientos;

    constructor(numeroCuenta, saldoInicial = 0) {
        this.#numeroCuenta = numeroCuenta;
        this.#saldo = saldoInicial;
        this.#movimientos = [];
        this.tipo = 'cuenta'; // se sobrescribe en hijos
    }

    // --- Getters (encapsulamiento) ---
    get numeroCuenta() {
        return this.#numeroCuenta;
    }

    get saldo() {
        return this.#saldo;
    }

    get movimientos() {
        return [...this.#movimientos]; // copia para no modificar desde fuera
    }

    // --- Métodos protegidos para hijos ---
    _actualizarSaldo(nuevoSaldo) {
        this.#saldo = nuevoSaldo;
    }

    _agregarMovimiento(movimiento) {
        this.#movimientos.unshift(movimiento); // más reciente primero
    }

    // --- Operaciones comunes ---
    consignar(monto) {
        if (monto <= 0) {
            throw new Error('El monto a consignar debe ser mayor a cero.');
        }
        this.#saldo += monto;
        this._agregarMovimiento(new Movimiento('consignacion', monto, 'Consignación de dinero'));
        return this.#saldo;
    }

    /**
     * Método polimórfico: cada tipo de cuenta implementa su propia lógica de retiro
     * (sobregiro, intereses, etc.)
     */
    calcularRetiro(monto) {
        throw new Error('Método calcularRetiro() debe ser implementado por la subclase.');
    }

    retirar(monto) {
        if (monto <= 0) {
            throw new Error('El monto a retirar debe ser mayor a cero.');
        }
        const resultado = this.calcularRetiro(monto);
        this.#saldo = resultado.nuevoSaldo;
        this._agregarMovimiento(new Movimiento('retiro', -monto, resultado.descripcion || 'Retiro de dinero'));
        return {
            nuevoSaldo: this.#saldo,
            mensaje: resultado.mensaje
        };
    }

    transferir(monto, cuentaDestino) {
        if (monto <= 0) {
            throw new Error('El monto a transferir debe ser mayor a cero.');
        }
        // Primero intentamos el retiro (valida reglas del tipo de cuenta)
        const resultadoRetiro = this.retirar(monto);
        // Luego consignamos en destino
        cuentaDestino.consignar(monto);
        // Ajustamos descripción del movimiento de origen
        if (this.#movimientos.length > 0) {
            this.#movimientos[0].descripcion = `Transferencia a cuenta ${cuentaDestino.numeroCuenta}`;
            this.#movimientos[0].tipo = 'transferencia';
        }
        // Movimiento en destino ya tiene consignación, lo ajustamos
        if (cuentaDestino.movimientos.length > 0) {
            // No podemos modificar directamente, pero el consignar ya lo registró
        }
        return {
            nuevoSaldo: this.#saldo,
            mensaje: `Transferencia exitosa de $${monto.toLocaleString('es-CO')} a la cuenta ${cuentaDestino.numeroCuenta}`
        };
    }

    // Serialización para localStorage
    toJSON() {
        return {
            numeroCuenta: this.#numeroCuenta,
            saldo: this.#saldo,
            tipo: this.tipo,
            movimientos: this.#movimientos.map(m => ({
                fecha: m.fecha,
                tipo: m.tipo,
                valor: m.valor,
                descripcion: m.descripcion
            }))
        };
    }
}

// =====================================================
// CUENTA DE AHORROS
// =====================================================
class CuentaAhorros extends Cuenta {
    static TASA_INTERES = 0.015; // 1.5% mensual

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
        this.tipo = 'ahorros';
    }

    /**
     * Polimorfismo: al retirar se aplica interés del 1.5%
     * El interés se calcula sobre el saldo y se suma antes de retirar
     */
    calcularRetiro(monto) {
        const saldoActual = this.saldo;
        if (monto > saldoActual) {
            throw new Error(`Saldo insuficiente. Disponible: $${saldoActual.toLocaleString('es-CO')}`);
        }

        // Aplicar interés del 1.5% al momento del retiro
        const interes = saldoActual * CuentaAhorros.TASA_INTERES;
        const saldoConInteres = saldoActual + interes;
        const nuevoSaldo = saldoConInteres - monto;

        return {
            nuevoSaldo: nuevoSaldo,
            mensaje: `Retiro exitoso. Se generó interés de $${interes.toLocaleString('es-CO', { minimumFractionDigits: 2 })} (1.5%). Nuevo saldo: $${nuevoSaldo.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
            descripcion: `Retiro + interés 1.5% ($${interes.toFixed(2)})`
        };
    }

    static fromJSON(data) {
        const cuenta = new CuentaAhorros(data.numeroCuenta, data.saldo);
        if (data.movimientos) {
            data.movimientos.forEach(m => {
                const mov = new Movimiento(m.tipo, m.valor, m.descripcion);
                mov.fecha = new Date(m.fecha);
                cuenta._agregarMovimiento(mov);
            });
        }
        return cuenta;
    }
}

// =====================================================
// CUENTA CORRIENTE
// =====================================================
class CuentaCorriente extends Cuenta {
    static PORCENTAJE_SOBREGIRO = 0.20; // 20%

    constructor(numeroCuenta, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial);
        this.tipo = 'corriente';
    }

    /**
     * Polimorfismo: permite sobregiro hasta 20% del saldo actual
     */
    calcularRetiro(monto) {
        const saldoActual = this.saldo;
        const limiteSobregiro = saldoActual * CuentaCorriente.PORCENTAJE_SOBREGIRO;
        const limiteTotal = saldoActual + limiteSobregiro;

        if (monto > limiteTotal) {
            throw new Error(
                `Monto excede el límite. Saldo: $${saldoActual.toLocaleString('es-CO')} + sobregiro 20% ($${limiteSobregiro.toLocaleString('es-CO')}) = $${limiteTotal.toLocaleString('es-CO')}`
            );
        }

        const nuevoSaldo = saldoActual - monto;
        let mensaje = `Retiro exitoso. Nuevo saldo: $${nuevoSaldo.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        
        if (nuevoSaldo < 0) {
            mensaje += ` (incluye sobregiro de $${Math.abs(nuevoSaldo).toLocaleString('es-CO')})`;
        }

        return {
            nuevoSaldo: nuevoSaldo,
            mensaje: mensaje,
            descripcion: nuevoSaldo < 0 ? 'Retiro con sobregiro' : 'Retiro de dinero'
        };
    }

    static fromJSON(data) {
        const cuenta = new CuentaCorriente(data.numeroCuenta, data.saldo);
        if (data.movimientos) {
            data.movimientos.forEach(m => {
                const mov = new Movimiento(m.tipo, m.valor, m.descripcion);
                mov.fecha = new Date(m.fecha);
                cuenta._agregarMovimiento(mov);
            });
        }
        return cuenta;
    }
}

// =====================================================
// TARJETA DE CRÉDITO
// =====================================================
class TarjetaCredito extends Cuenta {
    #cupo;
    #deuda;

    constructor(numeroCuenta, cupo = 5000000, saldoInicial = 0) {
        super(numeroCuenta, saldoInicial); // saldo aquí representa disponible = cupo - deuda
        this.tipo = 'credito';
        this.#cupo = cupo;
        this.#deuda = 0;
        // El saldo disponible es cupo - deuda
        this._actualizarSaldo(cupo);
    }

    get cupo() {
        return this.#cupo;
    }

    get deuda() {
        return this.#deuda;
    }

    get disponible() {
        return this.#cupo - this.#deuda;
    }

    /**
     * Para tarjeta de crédito el "retiro" no aplica igual.
     * Usamos compra a cuotas.
     */
    calcularRetiro(monto) {
        // En tarjeta no se retira efectivo normalmente, pero permitimos si hay disponible
        if (monto > this.disponible) {
            throw new Error(`Cupo insuficiente. Disponible: $${this.disponible.toLocaleString('es-CO')}`);
        }
        return {
            nuevoSaldo: this.disponible - monto,
            mensaje: `Retiro de tarjeta procesado.`,
            descripcion: 'Retiro desde tarjeta'
        };
    }

    /**
     * Compra a cuotas con interés según tabla
     * ≤ 2 cuotas → 0%
     * 3-6 cuotas → 1.9% mensual
     * ≥ 7 cuotas → 2.3% mensual
     * 
     * Fórmula: Cuota = (Capital × tasa) / (1 − (1 + tasa)^(−n))
     */
    realizarCompra(monto, numeroCuotas) {
        if (monto <= 0) {
            throw new Error('El valor de la compra debe ser mayor a cero.');
        }
        if (monto > this.disponible) {
            throw new Error(`Cupo insuficiente. Disponible: $${this.disponible.toLocaleString('es-CO')}`);
        }
        if (numeroCuotas < 1) {
            throw new Error('El número de cuotas debe ser al menos 1.');
        }

        let tasaMensual = 0;
        let observacion = 'Sin interés';

        if (numeroCuotas <= 2) {
            tasaMensual = 0;
            observacion = 'Sin interés';
        } else if (numeroCuotas >= 3 && numeroCuotas <= 6) {
            tasaMensual = 0.019; // 1.9%
            observacion = 'Interés moderado 1.9%';
        } else {
            tasaMensual = 0.023; // 2.3%
            observacion = 'Interés alto 2.3%';
        }

        let cuotaMensual;
        if (tasaMensual === 0) {
            cuotaMensual = monto / numeroCuotas;
        } else {
            // Fórmula de amortización
            const factor = Math.pow(1 + tasaMensual, -numeroCuotas);
            cuotaMensual = (monto * tasaMensual) / (1 - factor);
        }

        // Actualizar deuda y disponible
        this.#deuda += monto;
        this._actualizarSaldo(this.#cupo - this.#deuda);

        this._agregarMovimiento(new Movimiento(
            'compra',
            -monto,
            `Compra a ${numeroCuotas} cuotas (${observacion}). Cuota mensual: $${cuotaMensual.toFixed(2)}`
        ));

        return {
            nuevoSaldo: this.disponible,
            deudaTotal: this.#deuda,
            cuotaMensual: cuotaMensual,
            numeroCuotas: numeroCuotas,
            tasa: tasaMensual,
            mensaje: `Compra de $${monto.toLocaleString('es-CO')} a ${numeroCuotas} cuotas. Cuota mensual: $${cuotaMensual.toLocaleString('es-CO', { minimumFractionDigits: 2 })} (${observacion}). Disponible restante: $${this.disponible.toLocaleString('es-CO')}`
        };
    }

    // Consignar en tarjeta = abonar a la deuda
    consignar(monto) {
        if (monto <= 0) {
            throw new Error('El monto a abonar debe ser mayor a cero.');
        }
        const abono = Math.min(monto, this.#deuda);
        this.#deuda -= abono;
        this._actualizarSaldo(this.#cupo - this.#deuda);
        
        this._agregarMovimiento(new Movimiento('consignacion', abono, 'Abono a tarjeta de crédito'));
        
        return this.disponible;
    }

    toJSON() {
        const base = super.toJSON();
        return {
            ...base,
            cupo: this.#cupo,
            deuda: this.#deuda
        };
    }

    static fromJSON(data) {
        const tarjeta = new TarjetaCredito(data.numeroCuenta, data.cupo || 5000000);
        tarjeta.#deuda = data.deuda || 0;
        tarjeta._actualizarSaldo(tarjeta.#cupo - tarjeta.#deuda);
        if (data.movimientos) {
            data.movimientos.forEach(m => {
                const mov = new Movimiento(m.tipo, m.valor, m.descripcion);
                mov.fecha = new Date(m.fecha);
                tarjeta._agregarMovimiento(mov);
            });
        }
        return tarjeta;
    }
}

// =====================================================
// CLASE CLIENTE
// =====================================================
class Cliente {
    #identificacion;
    #nombre;
    #celular;
    #usuario;
    #password;
    #cuentas;
    #intentosFallidos;
    #bloqueado;

    constructor(identificacion, nombre, celular, usuario, password) {
        this.#identificacion = identificacion;
        this.#nombre = nombre;
        this.#celular = celular;
        this.#usuario = usuario;
        this.#password = password;
        this.#cuentas = [];
        this.#intentosFallidos = 0;
        this.#bloqueado = false;
        this.esAdmin = false;
    }

    // Getters
    get identificacion() { return this.#identificacion; }
    get nombre() { return this.#nombre; }
    get celular() { return this.#celular; }
    get usuario() { return this.#usuario; }
    get cuentas() { return this.#cuentas; }
    get intentosFallidos() { return this.#intentosFallidos; }
    get bloqueado() { return this.#bloqueado; }

    // Setters para edición de perfil
    set nombre(valor) { this.#nombre = valor; }
    set celular(valor) { this.#celular = valor; }

    verificarPassword(password) {
        return this.#password === password;
    }

    cambiarPassword(actual, nueva) {
        if (this.#password !== actual) {
            throw new Error('La contraseña actual es incorrecta.');
        }
        if (nueva.length < 4) {
            throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
        }
        this.#password = nueva;
    }

    incrementarIntentos() {
        this.#intentosFallidos++;
        if (this.#intentosFallidos >= 3) {
            this.#bloqueado = true;
        }
        return this.#intentosFallidos;
    }

    resetearIntentos() {
        this.#intentosFallidos = 0;
    }

    desbloquear() {
        this.#bloqueado = false;
        this.#intentosFallidos = 0;
    }

    agregarCuenta(cuenta) {
        this.#cuentas.push(cuenta);
    }

    obtenerCuenta(numeroCuenta) {
        return this.#cuentas.find(c => c.numeroCuenta === numeroCuenta);
    }

    // Serialización
    toJSON() {
        return {
            identificacion: this.#identificacion,
            nombre: this.#nombre,
            celular: this.#celular,
            usuario: this.#usuario,
            password: this.#password,
            cuentas: this.#cuentas.map(c => c.toJSON()),
            intentosFallidos: this.#intentosFallidos,
            bloqueado: this.#bloqueado,
            esAdmin: this.esAdmin
        };
    }

    static fromJSON(data) {
        const cliente = new Cliente(
            data.identificacion,
            data.nombre,
            data.celular,
            data.usuario,
            data.password
        );
        cliente.#intentosFallidos = data.intentosFallidos || 0;
        cliente.#bloqueado = data.bloqueado || false;
        cliente.esAdmin = data.esAdmin || false;

        if (data.cuentas) {
            data.cuentas.forEach(cData => {
                let cuenta;
                switch (cData.tipo) {
                    case 'ahorros':
                        cuenta = CuentaAhorros.fromJSON(cData);
                        break;
                    case 'corriente':
                        cuenta = CuentaCorriente.fromJSON(cData);
                        break;
                    case 'credito':
                        cuenta = TarjetaCredito.fromJSON(cData);
                        break;
                    default:
                        cuenta = CuentaAhorros.fromJSON(cData);
                }
                cliente.agregarCuenta(cuenta);
            });
        }
        return cliente;
    }
}

// =====================================================
// BANCO (gestor del sistema)
// =====================================================
class Banco {
    constructor() {
        this.clientes = [];
        this.cargarDatos();
        // Crear admin por defecto si no existe
        if (!this.clientes.find(c => c.usuario === 'admin')) {
            const admin = new Cliente('00000000', 'Administrador Sistema', '3000000000', 'admin', 'admin123');
            admin.esAdmin = true;
            // Admin tiene una cuenta de ahorros de ejemplo
            const cuentaAdmin = new CuentaAhorros(this.generarNumeroCuenta(), 1000000);
            admin.agregarCuenta(cuentaAdmin);
            this.clientes.push(admin);
            this.guardarDatos();
        }
    }

    generarNumeroCuenta() {
        return 'MP' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    }

    registrarCliente(identificacion, nombre, celular, usuario, password, tipoCuenta) {
        // Validaciones
        if (this.clientes.find(c => c.usuario === usuario)) {
            throw new Error('El nombre de usuario ya está en uso.');
        }
        if (this.clientes.find(c => c.identificacion === identificacion)) {
            throw new Error('Ya existe un cliente con esa identificación.');
        }

        const cliente = new Cliente(identificacion, nombre, celular, usuario, password);

        // Crear producto inicial
        let cuenta;
        const numCuenta = this.generarNumeroCuenta();
        switch (tipoCuenta) {
            case 'ahorros':
                cuenta = new CuentaAhorros(numCuenta, 0);
                break;
            case 'corriente':
                cuenta = new CuentaCorriente(numCuenta, 0);
                break;
            case 'credito':
                cuenta = new TarjetaCredito(numCuenta, 5000000);
                break;
            default:
                cuenta = new CuentaAhorros(numCuenta, 0);
        }
        cliente.agregarCuenta(cuenta);
        this.clientes.push(cliente);
        this.guardarDatos();
        return cliente;
    }

    autenticar(usuario, password) {
        const cliente = this.clientes.find(c => c.usuario === usuario);
        if (!cliente) {
            throw new Error('Usuario no encontrado.');
        }
        if (cliente.bloqueado) {
            throw new Error('Cuenta bloqueada por múltiples intentos fallidos.');
        }
        if (!cliente.verificarPassword(password)) {
            const intentos = cliente.incrementarIntentos();
            this.guardarDatos();
            if (cliente.bloqueado) {
                throw new Error('Cuenta bloqueada. Has superado los 3 intentos permitidos.');
            }
            throw new Error(`Contraseña incorrecta. Intentos: ${intentos}/3`);
        }
        cliente.resetearIntentos();
        this.guardarDatos();
        return cliente;
    }

    buscarClientePorUsuario(usuario) {
        return this.clientes.find(c => c.usuario === usuario);
    }

    buscarCuenta(numeroCuenta) {
        for (const cliente of this.clientes) {
            const cuenta = cliente.obtenerCuenta(numeroCuenta);
            if (cuenta) return { cuenta, cliente };
        }
        return null;
    }

    eliminarCliente(usuario) {
        const index = this.clientes.findIndex(c => c.usuario === usuario);
        if (index === -1) throw new Error('Usuario no encontrado.');
        if (this.clientes[index].esAdmin) throw new Error('No se puede eliminar al administrador.');
        this.clientes.splice(index, 1);
        this.guardarDatos();
    }

    // Persistencia con localStorage
    guardarDatos() {
        const data = this.clientes.map(c => c.toJSON());
        localStorage.setItem('miPlataClientes', JSON.stringify(data));
    }

    cargarDatos() {
        const data = localStorage.getItem('miPlataClientes');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.clientes = parsed.map(c => Cliente.fromJSON(c));
            } catch (e) {
                console.error('Error al cargar datos:', e);
                this.clientes = [];
            }
        }
    }
}
