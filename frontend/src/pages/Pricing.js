import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { Check, Crown, Zap, Ticket, Infinity, Mail, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Pricing = () => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/register');
      return;
    }

    toast.info("Por el momento seguimos con el plan gratuito. ¡Pronto anunciaremos el lanzamiento del plan Premium con muchas funciones nuevas!");
    return;
    try {
      await axios.post(`${API}/upgrade-plan`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUser({ ...user, plan: 'premium' });
      toast.success('¡Plan actualizado a Premium!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Error al actualizar el plan');
    }
  };

  const plans = [
    {
      name: 'Gratuito',
      price: '$0',
      period: 'para siempre',
      description: 'Perfecto para empezar',
      features: [
        'Hasta 2 rifas activas',
        'Hasta 100 boletos por rifa',
        'Pagos con tarjeta de crédito/débito, transferencia, efectivo y Mercado Pago.',
        'Link compartible',
        'Notificaciones básicas'
      ],
      cta: user?.plan === 'free' ? 'Plan actual' : 'Comenzar gratis',
      ctaDisabled: user?.plan === 'free',
      highlight: false
    },
    {
      name: 'Premium',
      price: '$199',
      period: '/mes',
      description: 'Para organizadores frecuentes',
      features: [
        'Rifas ilimitadas',
        'Hasta 1000 boletos por rifa',
        'Pagos con tarjeta de crédito/débito, transferencia, efectivo y Mercado Pago.',
        'Link compartible personalizado',
        'Notificaciones avanzadas',
        'Soporte prioritario',
        'Sin marca de agua'
      ],
      cta: user?.plan === 'premium' ? 'Plan actual' : 'Actualizar ahora',
      ctaDisabled: user?.plan === 'premium',
      highlight: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-16" data-testid="pricing-page">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-medium mb-4">
            Planes y Precios
          </span>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Elige el plan perfecto para ti
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comienza gratis y actualiza cuando necesites más. Sin compromisos, cancela cuando quieras.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`border-0 shadow-lg relative ${plan.highlight ? 'ring-2 ring-orange-500' : ''}`}
              data-testid={`plan-card-${plan.name.toLowerCase()}`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 bg-orange-500 text-white text-sm font-medium rounded-full">
                    <Crown className="w-4 h-4" />
                    Más popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-center mb-6">
                  <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.highlight ? (
                  <Button 
                    className="w-full btn-primary"
                    onClick={handleUpgrade}
                    disabled={plan.ctaDisabled}
                    data-testid="upgrade-btn"
                  >
                    {plan.cta}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => !user && navigate('/register')}
                    disabled={plan.ctaDisabled}
                  >
                    {plan.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features comparison */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
            ¿Por qué elegir Premium?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Infinity className="w-6 h-6" />, title: 'Rifas Ilimitadas', desc: 'Sin límite de rifas activas' },
              { icon: <Ticket className="w-6 h-6" />, title: 'Más Boletos', desc: 'Hasta 1000 por rifa' },
              { icon: <Mail className="w-6 h-6" />, title: 'Notificaciones', desc: 'Emails automáticos' },
              { icon: <Shield className="w-6 h-6" />, title: 'Soporte VIP', desc: 'Respuesta en 24h' }
            ].map((item, index) => (
              <Card key={index} className="border-0 shadow-sm text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 mx-auto mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!user && (
          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-4">¿Listo para comenzar?</p>
            <Link to="/register" data-testid="cta-register">
              <Button className="btn-primary text-lg px-8 py-6 h-auto">
                <Zap className="w-5 h-5 mr-2" />
                Crear cuenta gratis
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
