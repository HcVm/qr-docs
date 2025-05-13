// app/api/users/invite/route.ts
import { createClient } from '@supabase/supabase-js'

// Asegúrate de que SUPABASE_SERVICE_ROLE_KEY esté definido en tus variables de entorno
// Esta clave tiene permisos elevados y NUNCA debe ser expuesta en el cliente

console.log('SUPABASE_SERVICE_ROLE_KEY is defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email es requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Attempting to invite user: ${email}`);

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error('Error inviting user:', error);
      // Manejo específico para usuarios existentes si es necesario
      if (error.message.includes('User already exists')) {
           return new Response(JSON.stringify({ error: 'El usuario con este correo ya existe.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`User invited successfully: ${data.user?.id}`);
    return new Response(JSON.stringify({ message: 'Invitación enviada exitosamente', user: data.user }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in invite handler:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
