// app/api/users/invite/route.ts
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend'; // Importa la librería de Resend

// Asegúrate de que SUPABASE_SERVICE_ROLE_KEY y RESEND_API_KEY estén definidos en tus variables de entorno
// Estas claves tienen permisos elevados y NUNCA debe ser expuesta en el cliente
console.log('SUPABASE_SERVICE_ROLE_KEY is defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('RESEND_API_KEY is defined:', !!process.env.RESEND_API_KEY);


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inicializa el cliente de Resend
const resend = new Resend(process.env.RESEND_API_KEY);


export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email es requerido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const defaultPassword = '123456789'; // Contraseña predeterminada
    const senderEmail = 'onboarding@resend.dev'; // Reemplaza con un email verificado en Resend


    console.log(`Attempting to create user with email: ${email}`);

    // Crear el usuario en Supabase Auth con contraseña predeterminada
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true, // Opcional: confirmar automáticamente el email si lo deseas
    });

    if (authError) {
      console.error('Error creating user in Auth:', authError);
      if (authError.message.includes('User already exists')) {
           return new Response(JSON.stringify({ error: 'El usuario con este correo ya existe.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`User created successfully in Auth: ${authData.user?.id}`);

    // *** MODIFICACION AQUI: Enviar correo electrónico con Resend ***
    try {
        const { data, error: emailError } = await resend.emails.send({
          from: `Admin Panel <${senderEmail}>`, // Remitente verificado en Resend
          to: [email], // Destinatario
          subject: 'Bienvenido a Admin Panel - Tu cuenta ha sido creada',
          html: `
            <p>Hola,</p>
            <p>Tu cuenta en Admin Panel ha sido creada.</p>
            <p>Tu email es: <strong>${email}</strong></p>
            <p>Tu contraseña temporal es: <strong>${defaultPassword}</strong></p>
            <p>Por favor, inicia sesión con esta contraseña y cámbiala lo antes posible por motivos de seguridad.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SUPABASE_URL}">Ir a la página de inicio de sesión</a></p>
            <p>Gracias.</p>
          `,
        });

        if (emailError) {
          console.error('Error sending email with Resend:', emailError);
          // Considera qué hacer si falla el envío del correo.
          // La cuenta en Supabase Auth ya fue creada. Podrías querer notificar
          // al administrador o intentar enviar el correo de nuevo.
          // Por ahora, continuamos y reportamos éxito en la creación del usuario.
        } else {
          console.log('Invitation email sent successfully with Resend:', data);
        }

    } catch (resendCatchError: any) {
        console.error('Unexpected error sending email with Resend:', resendCatchError);
         // Manejar errores inesperados durante el envío del correo
    }
    // *** FIN MODIFICACION ***


    // La respuesta incluye el ID del usuario creado en Auth para usarlo al insertar en tu tabla 'users'
    return new Response(JSON.stringify({ message: 'Usuario creado exitosamente y correo enviado con contraseña predeterminada.', user: authData.user }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (handlerError: any) {
    console.error('Error in user creation/email handler:', handlerError);
    return new Response(JSON.stringify({ error: handlerError.message || 'Error interno del servidor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
