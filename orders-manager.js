// Sistema de Gestión de Órdenes con Supabase
// Maneja múltiples boletos, inventario y transacciones

let supabaseClient = null;

// Inicializar Supabase si está disponible
async function initOrdersManager() {
    try {
        if (typeof window.supabase !== 'undefined') {
            const supabaseUrl = 'https://jjbsgvgvmfkjxaxqhvqx.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYnNndmd2bWZranhheHFodnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1Mjc0NjUsImV4cCI6MjA0NzEwMzQ2NX0.rZQHNVCYJwTI6u9KLVZBqjuL6lP9qZABcDeFgHiJkLm';

            supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log('✓ Supabase inicializado para órdenes');

            // Crear tabla de órdenes si no existe
            await ensureOrdersTable();
            return true;
        } else {
            console.log('ℹ Supabase no disponible, usando localStorage');
            return false;
        }
    } catch (error) {
        console.log('ℹ Usando localStorage para órdenes');
        return false;
    }
}

// Asegurar que la tabla de órdenes existe
async function ensureOrdersTable() {
    if (!supabaseClient) return;

    try {
        // Intentar obtener un registro para verificar que la tabla existe
        const { error } = await supabaseClient
            .from('orders')
            .select('id')
            .limit(1);

        if (error && error.code === 'PGRST116') {
            // Tabla no existe, crearla
            console.log('Creando tabla de órdenes...');
            const { error: createError } = await supabaseClient.rpc('create_orders_table');
            if (!createError) {
                console.log('✓ Tabla de órdenes creada');
            }
        }
    } catch (error) {
        console.log('ℹ Tabla de órdenes ya existe o no se puede crear');
    }
}

// Validar disponibilidad para múltiples boletos
async function validateAvailability(ticketType, quantity) {
    quantity = parseInt(quantity) || 1;

    if (quantity <= 0) {
        return { valid: false, message: 'La cantidad debe ser mayor a 0' };
    }

    if (quantity > 100) {
        return { valid: false, message: 'Máximo 100 boletos por orden' };
    }

    const available = getAvailable(ticketType);

    if (available < quantity) {
        return {
            valid: false,
            message: `Solo hay ${available} boletos disponibles (solicitaste ${quantity})`
        };
    }

    return {
        valid: true,
        message: `✓ ${quantity} boletos disponibles`,
        available,
        quantity
    };
}

// Crear orden en Supabase
async function createOrder(orderData) {
    if (!supabaseClient) {
        // Guardar en localStorage como respaldo
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const orderId = 'ORD-' + Date.now();
        const order = {
            id: orderId,
            ...orderData,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        return { success: true, orderId, order };
    }

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert({
                full_name: orderData.fullName,
                email: orderData.email,
                phone: orderData.phone,
                company: orderData.company,
                ticket_type: orderData.ticketType,
                quantity: orderData.quantity,
                unit_price: orderData.unitPrice,
                total_price: orderData.totalPrice,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('Error creando orden:', error);
            return { success: false, error: error.message };
        }

        return { success: true, orderId: data[0]?.id, order: data[0] };
    } catch (error) {
        console.error('Error al crear orden:', error);
        return { success: false, error: error.message };
    }
}

// Actualizar orden después del pago
async function updateOrderStatus(orderId, status, stripeSessionId = null) {
    if (!supabaseClient) {
        // Actualizar en localStorage
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            order.stripeSessionId = stripeSessionId;
            order.updatedAt = new Date().toISOString();
            localStorage.setItem('orders', JSON.stringify(orders));
        }
        return { success: true };
    }

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({
                status: status,
                stripe_session_id: stripeSessionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) {
            console.error('Error actualizando orden:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error al actualizar orden:', error);
        return { success: false, error: error.message };
    }
}

// Decrementar inventario de forma segura
async function decrementInventoryBatch(ticketType, quantity) {
    quantity = parseInt(quantity) || 1;

    // Validar disponibilidad
    const validation = await validateAvailability(ticketType, quantity);
    if (!validation.valid) {
        return { success: false, error: validation.message };
    }

    // Decrementar en localStorage
    for (let i = 0; i < quantity; i++) {
        if (!decrementTicket(ticketType)) {
            return {
                success: false,
                error: `Error al decrementar boleto ${i + 1} de ${quantity}`
            };
        }
    }

    // Si Supabase está disponible, guardar transacción
    if (supabaseClient) {
        try {
            await supabaseClient
                .from('inventory_transactions')
                .insert({
                    ticket_type: ticketType,
                    quantity: quantity,
                    operation: 'sell',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.log('ℹ Transacción registrada localmente');
        }
    }

    return { success: true, quantity, remaining: getAvailable(ticketType) };
}

// Obtener historial de órdenes del usuario
async function getOrdersByEmail(email) {
    if (!supabaseClient) {
        // Buscar en localStorage
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        return orders.filter(o => o.email === email);
    }

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('email', email)
            .order('created_at', { ascending: false });

        if (error) {
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        return [];
    }
}

// Obtener estadísticas de ventas
async function getSalesStats() {
    if (!supabaseClient) {
        // Estadísticas desde localStorage
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const stats = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
            ticketsSold: orders.reduce((sum, o) => sum + (o.quantity || 1), 0),
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            completedOrders: orders.filter(o => o.status === 'completed').length
        };
        return stats;
    }

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('quantity, total_price, status');

        if (error) {
            return null;
        }

        const stats = {
            totalOrders: data.length,
            totalRevenue: data.reduce((sum, o) => sum + (o.total_price || 0), 0),
            ticketsSold: data.reduce((sum, o) => sum + (o.quantity || 1), 0),
            pendingOrders: data.filter(o => o.status === 'pending').length,
            completedOrders: data.filter(o => o.status === 'completed').length
        };
        return stats;
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return null;
    }
}

// Inicializar al cargar el script
initOrdersManager();
