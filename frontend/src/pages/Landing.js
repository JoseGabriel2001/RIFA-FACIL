import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Ticket, Users, Trophy, Share2, Shield, Zap, ArrowRight, Check } from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Ticket className="w-6 h-6" />,
      title: 'Crea Rifas Fácilmente',
      description: 'Define el número de boletos, precio y premio en minutos.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Comparte y Vende',
      description: 'Genera un link único para compartir tu rifa con compradores.'
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Sortea al Ganador',
      description: 'Selecciona manual o aleatoriamente y notifica automáticamente.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Pagos Seguros',
      description: 'Integración con Mercado pago para transacciones confiables.'
    }
  ];

  const benefits = [
    'Sin comisiones ocultas',
    'Hasta 2 rifas gratis',
    'Notificaciones por email',
    'Link compartible único',
    'Panel de administración',
    'Soporte técnico'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient noise-overlay py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-medium mb-6">
                La forma más fácil de organizar rifas
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Crea y gestiona{' '}
                <span className="text-orange-500">rifas online</span>{' '}
                en minutos
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-xl">
                RifaFacil te permite crear sorteos, vender boletos y seleccionar ganadores de forma sencilla. 
                Ideal para eventos, recaudaciones y promociones.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link to="/dashboard" data-testid="hero-dashboard-btn">
                    <Button className="btn-primary text-lg px-8 py-6 h-auto">
                      Ir al Dashboard
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register" data-testid="hero-register-btn">
                      <Button className="btn-primary text-lg px-8 py-6 h-auto">
                        Comenzar Gratis
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                    <Link to="/login" data-testid="hero-login-btn">
                      <Button variant="outline" className="text-lg px-8 py-6 h-auto border-2">
                        Ya tengo cuenta
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="relative animate-fade-in-up stagger-2">
              <div className="absolute inset-0 bg-orange-500/10 rounded-3xl blur-3xl" />
              <img 
                src="images/people_celebrate.jpg"
                alt="Personas celebrando"
                className="relative rounded-3xl shadow-2xl w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Todo lo que necesitas para tus rifas
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Herramientas simples pero poderosas para organizar sorteos exitosos
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="card-hover border-0 shadow-sm" data-testid={`feature-card-${index}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                ¿Cómo funciona?
              </h2>
              <div className="space-y-8">
                {[
                  { step: '01', title: 'Crea tu rifa', desc: 'Define el premio, precio y cantidad de boletos disponibles.' },
                  { step: '02', title: 'Comparte el link', desc: 'Envía el enlace único a tus compradores por WhatsApp, redes sociales, etc.' },
                  { step: '03', title: 'Recibe pagos', desc: 'Los compradores pagan de forma segura con tarjeta de crédito/débito, transferencia, efectivo y Mercado Pago.' },
                  { step: '04', title: 'Realiza el sorteo', desc: 'Selecciona al ganador manual o aleatoriamente y notifícalo.' }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4" data-testid={`step-${index}`}>
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold font-mono">{item.step}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="images/dashboard.jpg"
                alt="Dashboard"
                className="rounded-2xl shadow-xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Comienza a crear rifas hoy
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Únete a miles de organizadores que confían en RifaFacil
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-300">
                <Check className="w-5 h-5 text-green-400" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          {!user && (
            <Link to="/register" data-testid="cta-register-btn">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-10 py-6 h-auto rounded-full">
                Crear mi primera rifa
                <Zap className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo y descripción */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-slate-900">RifaFacil</span>
              </div>
              <p className="text-slate-500 text-sm">
                La plataforma más fácil para crear y administrar rifas en línea.
              </p>
            </div>
            
            {/* Enlaces legales */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/privacy" 
                    className="text-slate-500 hover:text-orange-500 transition-colors text-sm"
                    data-testid="footer-privacy-link"
                  >
                    Aviso de Privacidad
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/terms" 
                    className="text-slate-500 hover:text-orange-500 transition-colors text-sm"
                    data-testid="footer-terms-link"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Enlaces rápidos */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Enlaces</h3>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/pricing" 
                    className="text-slate-500 hover:text-orange-500 transition-colors text-sm"
                  >
                    Precios
                  </Link>
                </li>
                {!user && (
                  <li>
                    <Link 
                      to="/register" 
                      className="text-slate-500 hover:text-orange-500 transition-colors text-sm"
                    >
                      Crear cuenta
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm text-center">
              © {new Date().getFullYear()} RifaFacil. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
