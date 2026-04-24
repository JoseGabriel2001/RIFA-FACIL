import React from 'react';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { CreditCard, Building2, Wallet, Store } from 'lucide-react';

/**
 * Payment Method Selector Component
 * 
 * Displays 4 clear payment options for MercadoPago, all processed
 * through the same MercadoPago integration but with different
 * payment method configurations.
 * 
 * Options:
 * - card: Credit/Debit cards
 * - transfer: Bank transfers (SPEI)
 * - wallet: MercadoPago account balance
 * - cash: Cash payments (OXXO, 7-Eleven, etc)
 */

const PaymentMethodSelector = ({ value, onChange }) => {
    const paymentMethods = [
        {
            id: 'card',
            name: 'Tarjeta de Crédito / Débito',
            description: 'Paga con tu tarjeta de crédito o débito',
            icon: CreditCard,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-500',
            badge: 'Más popular'
        },
        {
            id: 'transfer',
            name: 'Transferencia Bancaria',
            description: 'Transferencia o SPEI desde tu banco',
            icon: Building2,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-500'
        },
        {
            id: 'wallet',
            name: 'Saldo en Mercado Pago',
            description: 'Usa tu saldo de Mercado Pago',
            icon: Wallet,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600'
        },
        {
            id: 'cash',
            name: 'Efectivo (OXXO, 7-Eleven)',
            description: 'Genera un código para pagar en tienda',
            icon: Store,
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-500'
        }
    ];

    return (
        <div className="space-y-3">
            <Label className="text-base font-semibold text-slate-900">
                Selecciona tu método de pago
            </Label>
            <p className="text-sm text-slate-600 mb-4">
                Todos los pagos son procesados de forma segura por Mercado Pago
            </p>

            <RadioGroup value={value} onValueChange={onChange}>
                <div className="space-y-3">
                    {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = value === method.id;

                        return (
                            <label
                                key={method.id}
                                htmlFor={method.id}
                                className={`
                  flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${isSelected
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }
                `}
                            >
                                <RadioGroupItem value={method.id} id={method.id} className="mt-0.5" />

                                <div className={`w-12 h-12 ${method.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-6 h-6 ${method.iconColor}`} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-slate-900">{method.name}</p>
                                        {method.badge && (
                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                                {method.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-0.5">{method.description}</p>
                                </div>

                                {isSelected && (
                                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </label>
                        );
                    })}
                </div>
            </RadioGroup>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                    <strong>💡 Nota:</strong> Todos los métodos de pago son seguros y están respaldados por Mercado Pago.
                    {value === 'cash' && ' Con efectivo, tendrás 3 días para pagar en tienda.'}
                    {value === 'card' && ' Puedes pagar hasta en 12 meses sin intereses con bancos participantes.'}
                </p>
            </div>
        </div>
    );
};

export default PaymentMethodSelector;