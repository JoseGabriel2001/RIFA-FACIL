import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Banknote,
  User,
  Mail,
  Phone,
  AlertTriangle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CashOrdersPanel = ({ raffleId, token, onOrderProcessed }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [raffleId]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/raffles/${raffleId}/cash-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateOrder = async (orderId, action) => {
    setProcessing(orderId);
    try {
      await axios.post(
        `${API}/raffles/${raffleId}/validate-order`,
        { order_id: orderId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(action === 'approve' ? 'Pago aprobado' : 'Orden rechazada');
      fetchOrders();
      onOrderProcessed?.();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error procesando orden';
      toast.error(message);
    } finally {
      setProcessing(null);
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700', icon: Clock },
      approved: { label: 'Aprobado', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-700', icon: XCircle },
      expired: { label: 'Expirado', className: 'bg-slate-100 text-slate-700', icon: AlertTriangle }
    };
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    return (
      <Badge className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const otherOrders = orders.filter(o => o.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Orders */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-amber-500" />
          Órdenes Pendientes de Pago
          {pendingOrders.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700">{pendingOrders.length}</Badge>
          )}
        </h3>

        {pendingOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-slate-500">
              No hay órdenes pendientes de validar
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="border-amber-200 bg-amber-50/50" data-testid={`cash-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(order.status)}
                        <span className="text-sm text-amber-600 font-medium">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {getTimeRemaining(order.expires_at)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-4 h-4 text-slate-400" />
                          {order.buyer_name}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {order.buyer_email}
                        </span>
                        {order.buyer_phone && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {order.buyer_phone}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-sm text-slate-600">Boletos:</span>
                        {order.ticket_numbers.map(num => (
                          <span key={num} className="px-2 py-0.5 bg-white rounded text-sm font-mono">
                            #{num}
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-lg font-bold text-slate-900">
                        Total: ${order.amount.toFixed(2)} MXN
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction({ orderId: order.id, action: 'reject' })}
                        disabled={processing === order.id}
                        className="text-red-600 hover:bg-red-50"
                        data-testid={`reject-order-${order.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setConfirmAction({ orderId: order.id, action: 'approve' })}
                        disabled={processing === order.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`approve-order-${order.id}`}
                      >
                        {processing === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobar Pago
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      {otherOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Historial de Órdenes</h3>
          <div className="space-y-2">
            {otherOrders.slice(0, 10).map((order) => (
              <Card key={order.id} className="border-0 bg-slate-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <span className="text-sm font-medium">{order.buyer_name}</span>
                      <span className="text-sm text-slate-500">
                        Boletos: {order.ticket_numbers.join(', ')}
                      </span>
                    </div>
                    <span className="text-sm font-medium">${order.amount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'approve' ? '¿Aprobar este pago?' : '¿Rechazar esta orden?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'approve' 
                ? 'Los boletos serán marcados como vendidos y el comprador recibirá una notificación.'
                : 'Los boletos reservados quedarán disponibles nuevamente para otros compradores.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleValidateOrder(confirmAction.orderId, confirmAction.action)}
              className={confirmAction?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmAction?.action === 'approve' ? 'Aprobar Pago' : 'Rechazar Orden'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CashOrdersPanel;
