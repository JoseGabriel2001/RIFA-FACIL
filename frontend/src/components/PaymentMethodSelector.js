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

const PaymentMethodSelector = ({ value, onChange, buyerInfo, isDisabled }) => {
    const paymentMethods = [
        {
            id: 'card',
            name: 'Tarjeta de Crédito / Débito',
            description: 'Paga directamente con tu tarjeta',
            icon: CreditCard,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-500',
            badge: 'Más popular',
            flow: "embedded" // Indicates this will use the embedded card form
        },
        {
            id: 'cash',
            name: 'Efectivo (OXXO)',
            description: 'Genera un código para pagar en tienda',
            icon: Store,
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-500',
            flow: 'embedded' // Sin redirección
        },
        {
            id: 'transfer',
            name: 'Transferencia Bancaria',
            description: 'Transferencia o SPEI desde tu banco',
            icon: Building2,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-500',
            flow: 'redirect' // Requiere redirección a la plataforma de pago
        },
        {
            id: 'wallet',
            name: 'Mercado Pago',
            description: 'Usa tu saldo de Mercado Pago',
            icon: Wallet,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            flow: 'redirect' // Requiere redirección a la plataforma de pago
        }
    ];

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-base font-semibold text-slate-900">
                    Selecciona tu método de pago
                </Label>
                {isDisabled && (
                    <p className="text-sm text-orange-600 mt-1">
                        ⚠️ Completa primero tu nombre, correo y teléfono para seleccionar un método de pago
                    </p>
                )}
            </div>

            <RadioGroup value={value} onValueChange={isDisabled ? undefined : onChange} disabled={isDisabled}>
                <div className="space-y-3">
                    {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = value === method.id;

                        return (
                            <label
                                key={method.id}
                                htmlFor={method.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isDisabled
                                        ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-100'
                                        : isSelected
                                            ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                                    }`}
                            >
                                <RadioGroupItem
                                    value={method.id}
                                    id={method.id}
                                    className="mt-0.5"
                                    disabled={isDisabled}
                                />

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
                                        {/* {method.flow === 'embedded' && (
                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                Sin redirección
                                            </span>
                                        )} */}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-0.5">{method.description}</p>
                                </div>

                                {isSelected && !isDisabled && (
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
        </div>
    );
};

export default PaymentMethodSelector;