// api/register.js
const supabase = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { name, email, plan } = req.body;

    if (!name || !email || !plan) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Verificar si el email ya está registrado
    const { data: existing } = await sbClient
      .from('registros')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    // Crear nuevo registro
    const { data, error } = await sbClient
      .from('registros')
      .insert([
        {
          nombre: name,
          email: email,
          plan: plan,
          estado: 'confirmado',
          monto: 0,
          fecha_registro: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error al crear registro' });
    }

    res.status(200).json({
      id: data[0].id,
      message: '¡Registración exitosa!'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
