/**
 * @fileoverview Privacy Policy Page
 * 
 * Displays the privacy policy for RifaFacil.
 * This is a static content page required for legal compliance.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Aviso de Privacidad
              </h1>
              <p className="text-slate-500">Última actualización: Diciembre 2025</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <div className="prose prose-slate max-w-none">
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                1. Responsable del Tratamiento de Datos
              </h2>
              <p className="text-slate-600 leading-relaxed">
                RifaFacil (en adelante "nosotros" o "la plataforma") es responsable del tratamiento 
                de los datos personales que nos proporciones. Nos comprometemos a proteger tu 
                privacidad y a tratar tus datos de acuerdo con la legislación aplicable en materia 
                de protección de datos personales.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                2. Datos Personales que Recopilamos
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Recopilamos los siguientes datos personales:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Nombre completo</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono (opcional)</li>
                <li>Información de pago (procesada por terceros seguros)</li>
                <li>Datos de uso de la plataforma</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                3. Finalidades del Tratamiento
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Utilizamos tus datos personales para:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Crear y gestionar tu cuenta de usuario</li>
                <li>Procesar la compra de boletos de rifas</li>
                <li>Notificarte sobre el estado de tus rifas y sorteos</li>
                <li>Informarte si has resultado ganador de alguna rifa</li>
                <li>Enviar comunicaciones relacionadas con el servicio</li>
                <li>Mejorar nuestros servicios y experiencia de usuario</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                4. Compartición de Datos
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Tus datos personales no serán vendidos ni compartidos con terceros para fines 
                de marketing. Solo compartimos información con:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mt-4">
                <li>Procesadores de pago (MercadoPago) para completar transacciones</li>
                <li>Organizadores de rifas en las que participas (nombre y datos de contacto)</li>
                <li>Autoridades cuando sea requerido por ley</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                5. Seguridad de los Datos
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Implementamos medidas de seguridad técnicas y organizativas para proteger tus 
                datos personales contra acceso no autorizado, pérdida o destrucción. Esto incluye:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mt-4">
                <li>Encriptación de datos en tránsito (HTTPS/SSL)</li>
                <li>Almacenamiento seguro de contraseñas (hash bcrypt)</li>
                <li>Tokens de autenticación con expiración</li>
                <li>Acceso restringido a bases de datos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                6. Derechos del Titular
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Tienes derecho a:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Acceso:</strong> Solicitar información sobre los datos que tenemos de ti</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
                <li><strong>Cancelación:</strong> Solicitar la eliminación de tus datos</li>
                <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                Para ejercer estos derechos, contacta a través de la plataforma o al correo 
                electrónico del administrador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                7. Cookies y Tecnologías Similares
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Utilizamos cookies y tecnologías similares para mantener tu sesión iniciada, 
                recordar tus preferencias y mejorar tu experiencia en la plataforma. Puedes 
                configurar tu navegador para rechazar cookies, aunque esto puede afectar 
                algunas funcionalidades.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                8. Conservación de Datos
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Conservamos tus datos personales mientras mantengas una cuenta activa en la 
                plataforma. Una vez que solicites la eliminación de tu cuenta, tus datos serán 
                eliminados en un plazo razonable, excepto aquellos que debamos conservar por 
                obligaciones legales.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                9. Cambios al Aviso de Privacidad
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Nos reservamos el derecho de modificar este aviso de privacidad en cualquier 
                momento. Los cambios serán publicados en esta página con la fecha de actualización. 
                Te recomendamos revisarlo periódicamente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                10. Contacto
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Si tienes preguntas sobre este aviso de privacidad o sobre el tratamiento de 
                tus datos personales, puedes contactarnos a través de la plataforma RifaFacil.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
