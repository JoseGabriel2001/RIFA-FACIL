/**
 * @fileoverview Terms and Conditions Page
 * 
 * Displays the terms and conditions for RifaFacil.
 * This is a static content page required for legal compliance.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';

const TermsConditions = () => {
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
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Términos y Condiciones
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
                1. Aceptación de los Términos
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Al acceder y utilizar la plataforma RifaFacil, aceptas estar sujeto a estos 
                términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, 
                no deberás utilizar nuestra plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                2. Descripción del Servicio
              </h2>
              <p className="text-slate-600 leading-relaxed">
                RifaFacil es una plataforma que permite a los usuarios crear, administrar y 
                participar en rifas y sorteos en línea. La plataforma facilita la venta de 
                boletos, el procesamiento de pagos y la selección de ganadores.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                3. Registro y Cuenta de Usuario
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Para utilizar ciertas funciones de la plataforma, debes crear una cuenta. Al hacerlo:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Debes proporcionar información veraz y actualizada</li>
                <li>Eres responsable de mantener la confidencialidad de tu contraseña</li>
                <li>Eres responsable de todas las actividades que ocurran en tu cuenta</li>
                <li>Debes notificarnos inmediatamente sobre cualquier uso no autorizado</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                4. Creación de Rifas
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Los organizadores de rifas se comprometen a:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Entregar el premio anunciado al ganador</li>
                <li>Realizar el sorteo de manera justa y transparente</li>
                <li>No crear rifas fraudulentas o engañosas</li>
                <li>Cumplir con todas las leyes y regulaciones aplicables</li>
                <li>Proporcionar información precisa sobre el premio</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                RifaFacil no se hace responsable de la entrega del premio, siendo esta 
                obligación exclusiva del organizador de la rifa.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                5. Compra de Boletos
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Al comprar boletos:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Confirmas que tienes la edad legal para participar</li>
                <li>Entiendes que la compra de boletos no garantiza ganar el premio</li>
                <li>Aceptas que los pagos realizados no son reembolsables</li>
                <li>Te comprometes a proporcionar información de contacto válida</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                6. Pagos y Transacciones
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Los pagos se procesan a través de proveedores de pago terceros (MercadoPago, 
                Stripe). RifaFacil no almacena información de tarjetas de crédito. Las 
                transacciones están sujetas a los términos y condiciones del proveedor de 
                pago correspondiente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                7. Selección del Ganador
              </h2>
              <p className="text-slate-600 leading-relaxed">
                El ganador de cada rifa es seleccionado por el organizador utilizando las 
                herramientas proporcionadas por la plataforma. RifaFacil proporciona un 
                sistema de selección aleatoria, pero el organizador tiene la facultad final 
                sobre cómo realizar el sorteo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                8. Planes y Limitaciones
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                La plataforma ofrece diferentes planes de uso:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li><strong>Plan Gratuito:</strong> Permite crear hasta 2 rifas activas simultáneamente</li>
                <li><strong>Plan Premium:</strong> Rifas ilimitadas y funciones adicionales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                9. Conducta Prohibida
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Está prohibido:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
                <li>Crear rifas para actividades ilegales</li>
                <li>Utilizar la plataforma para fraude o estafa</li>
                <li>Suplantar la identidad de otra persona</li>
                <li>Interferir con el funcionamiento de la plataforma</li>
                <li>Violar derechos de propiedad intelectual</li>
                <li>Publicar contenido ofensivo o inapropiado</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                10. Limitación de Responsabilidad
              </h2>
              <p className="text-slate-600 leading-relaxed">
                RifaFacil actúa únicamente como intermediario tecnológico. No somos responsables de:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4 mt-4">
                <li>La entrega de premios por parte de los organizadores</li>
                <li>La veracidad de la información proporcionada por los usuarios</li>
                <li>Disputas entre organizadores y participantes</li>
                <li>Pérdidas derivadas del uso de la plataforma</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                11. Propiedad Intelectual
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Todo el contenido de la plataforma, incluyendo pero no limitado a textos, 
                gráficos, logotipos, íconos y software, es propiedad de RifaFacil y está 
                protegido por las leyes de propiedad intelectual.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                12. Terminación
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Nos reservamos el derecho de suspender o terminar tu acceso a la plataforma 
                en cualquier momento, sin previo aviso, por violación de estos términos o 
                cualquier conducta que consideremos inapropiada.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                13. Modificaciones
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Los cambios entrarán en vigor inmediatamente después de su publicación en 
                la plataforma. El uso continuado de la plataforma constituye la aceptación 
                de los términos modificados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                14. Ley Aplicable
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Estos términos se regirán e interpretarán de acuerdo con las leyes de México, 
                sin tener en cuenta sus disposiciones sobre conflictos de leyes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                15. Contacto
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Si tienes preguntas sobre estos términos y condiciones, puedes contactarnos 
                a través de la plataforma RifaFacil.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
