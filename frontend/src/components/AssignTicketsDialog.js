import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { UserPlus, Loader2, User, Mail, Phone, Ticket } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AssignTicketsDialog = ({ raffleId, token, availableTickets, onAssigned }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleTicketToggle = (number) => {
    if (selectedTickets.includes(number)) {
      setSelectedTickets(selectedTickets.filter(n => n !== number));
    } else {
      setSelectedTickets([...selectedTickets, number]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTickets.length === 0) {
      toast.error('Selecciona al menos un boleto');
      return;
    }
    if (!buyerInfo.name || !buyerInfo.email) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/raffles/${raffleId}/assign-tickets`,
        {
          ticket_numbers: selectedTickets,
          buyer_name: buyerInfo.name,
          buyer_email: buyerInfo.email,
          buyer_phone: buyerInfo.phone || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Boletos ${selectedTickets.join(', ')} asignados a ${buyerInfo.name}`);
      setOpen(false);
      setSelectedTickets([]);
      setBuyerInfo({ name: '', email: '', phone: '' });
      onAssigned?.();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al asignar boletos';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const availableNumbers = availableTickets
    .filter(t => t.status === 'available')
    .map(t => t.number);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="assign-tickets-btn">
          <UserPlus className="w-4 h-4 mr-2" />
          Asignar Boletos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar Boletos Manualmente</DialogTitle>
          <DialogDescription>
            Asigna boletos a un comprador sin necesidad de pago online
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Selecciona boletos disponibles
            </Label>
            <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {availableNumbers.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay boletos disponibles</p>
                ) : (
                  availableNumbers.map(num => (
                    <button
                      key={num}
                      onClick={() => handleTicketToggle(num)}
                      className={`w-10 h-10 rounded-lg font-mono text-sm font-medium transition-all ${
                        selectedTickets.includes(num)
                          ? 'bg-orange-500 text-white border-2 border-orange-600'
                          : 'bg-white border-2 border-slate-200 hover:border-orange-400'
                      }`}
                      data-testid={`assign-ticket-${num}`}
                    >
                      {num}
                    </button>
                  ))
                )}
              </div>
            </div>
            {selectedTickets.length > 0 && (
              <p className="text-sm text-orange-600">
                Seleccionados: {selectedTickets.sort((a,b) => a-b).join(', ')}
              </p>
            )}
          </div>

          {/* Buyer Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="assign-name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nombre del comprador *
              </Label>
              <Input
                id="assign-name"
                placeholder="Juan Pérez"
                value={buyerInfo.name}
                onChange={(e) => setBuyerInfo({ ...buyerInfo, name: e.target.value })}
                data-testid="assign-buyer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email *
              </Label>
              <Input
                id="assign-email"
                type="email"
                placeholder="comprador@email.com"
                value={buyerInfo.email}
                onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                data-testid="assign-buyer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono (opcional)
              </Label>
              <Input
                id="assign-phone"
                placeholder="55 1234 5678"
                value={buyerInfo.phone}
                onChange={(e) => setBuyerInfo({ ...buyerInfo, phone: e.target.value })}
                data-testid="assign-buyer-phone"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || selectedTickets.length === 0 || !buyerInfo.name || !buyerInfo.email}
            data-testid="confirm-assign-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Asignar {selectedTickets.length} boleto{selectedTickets.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTicketsDialog;
