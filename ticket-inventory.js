/**
 * SISTEMA DE INVENTARIO DE BOLETOS - EXPO MAKERS 2026
 *
 * Este sistema gestiona la disponibilidad de boletos en tiempo real.
 *
 * FUNCIONAMIENTO:
 * - Usa localStorage como almacenamiento principal
 * - Puede integrarse con Supabase para sincronización en tiempo real
 * - Dispara eventos personalizados cuando el inventario se actualiza
 * - Mantiene conteo de: límite total, boletos vendidos, boletos disponibles
 *
 * LÍMITES DE BOLETOS DISPONIBLES:
 * - GENERAL (Gratis): 999 boletos disponibles
 * - PLATA ($497): 170 boletos disponibles
 * - GOLD ($897): 50 boletos disponibles
 *
 * ESTRUCTURA DE DATOS (localStorage):
 * {
 *   "ticketInventory": {
 *     "free": { limit: 999, sold: X, available: 999-X, lastUpdated: ISO-date },
 *     "conference": { limit: 170, sold: X, available: 170-X, lastUpdated: ISO-date },
 *     "vip": { limit: 50, sold: X, available: 50-X, lastUpdated: ISO-date }
 *   }
 * }
 */

const TICKET_LIMITS = {
    free: {
        name: 'GENERAL',
        limit: 999,  // Sin límite prácticamente
        price: 0
    },
    conference: {
        name: 'PLATA',
        limit: 170,  // Límite principal
        price: 497
    },
    vip: {
        name: 'GOLD',
        limit: 50,   // Más exclusivo
        price: 897
    }
};

// Inicializar inventario desde localStorage
function initializeInventory() {
    const stored = localStorage.getItem('ticketInventory');

    if (!stored) {
        // Primera vez - crear inventario con límites
        const inventory = {};
        Object.keys(TICKET_LIMITS).forEach(key => {
            inventory[key] = {
                limit: TICKET_LIMITS[key].limit,
                sold: 0,
                available: TICKET_LIMITS[key].limit,
                lastUpdated: new Date().toISOString()
            };
        });
        localStorage.setItem('ticketInventory', JSON.stringify(inventory));
        return inventory;
    }

    return JSON.parse(stored);
}

// Obtener estado actual del inventario
function getInventory() {
    return JSON.parse(localStorage.getItem('ticketInventory') || '{}');
}

// Obtener disponibilidad de un tipo de boleto
function getAvailable(ticketType) {
    const inventory = getInventory();
    if (inventory[ticketType]) {
        return inventory[ticketType].available;
    }
    return 0;
}

// Verificar si hay boletos disponibles
function isAvailable(ticketType) {
    return getAvailable(ticketType) > 0;
}

/**
 * Obtener estado actual del boleto (disponible/agotado)
 * @param {string} ticketType - Tipo de boleto: 'free', 'conference', 'vip'
 * @returns {object} Estado con: available (cantidad disponible), isSoldOut (boolean), limit (total), sold (cantidad vendida)
 *
 * EJEMPLO DE RETORNO:
 * { available: 170, isSoldOut: false, limit: 170, sold: 0 }
 */
function getTicketStatus(ticketType) {
    const available = getAvailable(ticketType);
    return {
        available: available,                                    // Boletos restantes disponibles para compra
        isSoldOut: available <= 0,                              // True si no hay boletos disponibles
        limit: TICKET_LIMITS[ticketType]?.limit || 0,         // Total de boletos disponibles para este tipo
        sold: TICKET_LIMITS[ticketType]?.limit - available || 0 // Boletos ya vendidos
    };
}

// Decrementar disponibilidad cuando se vende un boleto
function decrementTicket(ticketType) {
    const inventory = getInventory();

    if (!inventory[ticketType]) {
        console.error('Ticket type not found:', ticketType);
        return false;
    }

    if (inventory[ticketType].available > 0) {
        inventory[ticketType].available -= 1;
        inventory[ticketType].sold += 1;
        inventory[ticketType].lastUpdated = new Date().toISOString();

        localStorage.setItem('ticketInventory', JSON.stringify(inventory));

        // Disparar evento personalizado para actualizar UI en tiempo real
        window.dispatchEvent(new CustomEvent('ticketInventoryUpdated', {
            detail: { ticketType, inventory: inventory[ticketType] }
        }));

        return true;
    }

    return false;
}

// Incrementar disponibilidad (para devoluciones)
function incrementTicket(ticketType) {
    const inventory = getInventory();

    if (!inventory[ticketType]) {
        return false;
    }

    if (inventory[ticketType].sold > 0) {
        inventory[ticketType].available += 1;
        inventory[ticketType].sold -= 1;
        inventory[ticketType].lastUpdated = new Date().toISOString();

        localStorage.setItem('ticketInventory', JSON.stringify(inventory));

        window.dispatchEvent(new CustomEvent('ticketInventoryUpdated', {
            detail: { ticketType, inventory: inventory[ticketType] }
        }));

        return true;
    }

    return false;
}

// Obtener todos los boletos vendidos (para estadísticas)
function getTotalSold() {
    const inventory = getInventory();
    let total = 0;
    Object.keys(inventory).forEach(key => {
        total += inventory[key].sold;
    });
    return total;
}

// Obtener ingresos totales
function getTotalRevenue() {
    const inventory = getInventory();
    let total = 0;
    Object.keys(inventory).forEach(key => {
        total += inventory[key].sold * (TICKET_LIMITS[key]?.price || 0);
    });
    return total;
}

// Resetear inventario (solo para desarrollo/pruebas)
function resetInventory() {
    if (confirm('¿Estás seguro de que quieres resetear todo el inventario?')) {
        initializeInventory();
        window.dispatchEvent(new CustomEvent('ticketInventoryReset'));
        console.log('Inventario reseteado');
    }
}

// Obtener progreso visual (porcentaje vendido)
function getProgressPercent(ticketType) {
    const limit = TICKET_LIMITS[ticketType]?.limit || 1;
    const available = getAvailable(ticketType);
    return Math.round(((limit - available) / limit) * 100);
}

// Inicializar al cargar el script
initializeInventory();

// Event listener para actualizaciones en tiempo real
window.addEventListener('ticketInventoryUpdated', (event) => {
    console.log('Inventory updated:', event.detail);
});
