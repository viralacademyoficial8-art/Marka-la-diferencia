// Sistema de Inventario de Boletos
// Usa localStorage como almacenamiento local
// Integrable con Supabase para sincronización en tiempo real

const TICKET_LIMITS = {
    free: {
        name: 'EXPO MAKERS PASS',
        limit: 999,  // Sin límite prácticamente
        price: 0
    },
    conference: {
        name: 'CONFERENCE PASS',
        limit: 170,
        price: 497
    },
    vip: {
        name: 'VIP PASS',
        limit: 50,
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

// Obtener estado del boleto (disponible/agotado)
function getTicketStatus(ticketType) {
    const available = getAvailable(ticketType);
    return {
        available: available,
        isSoldOut: available <= 0,
        limit: TICKET_LIMITS[ticketType]?.limit || 0,
        sold: TICKET_LIMITS[ticketType]?.limit - available || 0
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
