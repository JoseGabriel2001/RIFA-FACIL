import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, ArrowLeft, Ticket, DollarSign, Ban, RotateCw, Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import ImageUpload from '../components/ImageUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateRaffle = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [drawDate, setDrawDate] = useState(null);
  const [spinsBeforeWinner, setSpinsBeforeWinner] = useState('3');
  const [prizeImage, setPrizeImage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize: '',
    ticket_price: '',
    total_tickets: '',
    excluded_numbers: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.prize || !formData.ticket_price || !formData.total_tickets || !drawDate) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const ticketPrice = parseFloat(formData.ticket_price);
    const totalTickets = parseInt(formData.total_tickets);

    if (isNaN(ticketPrice) || ticketPrice <= 0) {
      toast.error('El precio del boleto debe ser mayor a 0');
      return;
    }

    if (isNaN(totalTickets) || totalTickets <= 0 || totalTickets > 1000) {
      toast.error('El número de boletos debe estar entre 1 y 1000');
      return;
    }

    // Parse excluded numbers
    let excludedNumbers = [];
    if (formData.excluded_numbers) {
      excludedNumbers = formData.excluded_numbers
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= totalTickets);
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/raffles`,
        {
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          prize_image: prizeImage || null,
          ticket_price: ticketPrice,
          total_tickets: totalTickets,
          draw_date: drawDate.toISOString(),
          excluded_numbers: excludedNumbers,
          spins_before_winner: parseInt(spinsBeforeWinner)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('¡Rifa creada exitosamente!');
      navigate(`/manage-raffle/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al crear la rifa';
      const status = error.response?.status;
      
      if (status === 403) {
        // Plan limit reached
        toast.error(message, {
          action: {
            label: 'Ver Planes',
            onClick: () => navigate('/pricing')
          },
          duration: 8000
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="create-raffle-page">
      <div className="max-w-2xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Crear Nueva Rifa</CardTitle>
            <CardDescription>Define los detalles de tu sorteo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título de la rifa *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Ej: Rifa Navideña 2024"
                  value={formData.title}
                  onChange={handleChange}
                  className="bg-slate-50"
                  data-testid="raffle-title-input"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe tu rifa y el premio..."
                  value={formData.description}
                  onChange={handleChange}
                  className="bg-slate-50 min-h-[100px]"
                  data-testid="raffle-description-input"
                />
              </div>

              {/* Prize */}
              <div className="space-y-2">
                <Label htmlFor="prize" className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Premio *
                </Label>
                <Input
                  id="prize"
                  name="prize"
                  placeholder="Ej: iPhone 15 Pro Max"
                  value={formData.prize}
                  onChange={handleChange}
                  className="bg-slate-50"
                  data-testid="raffle-prize-input"
                />
              </div>

              {/* Prize Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Imagen del premio
                </Label>
                <ImageUpload
                  value={prizeImage}
                  onChange={setPrizeImage}
                />
              </div>

              {/* Ticket Price & Total */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket_price" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Precio por boleto (MXN) *
                  </Label>
                  <Input
                    id="ticket_price"
                    name="ticket_price"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="100"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    className="bg-slate-50"
                    data-testid="raffle-price-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_tickets" className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Número de boletos *
                  </Label>
                  <Input
                    id="total_tickets"
                    name="total_tickets"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="100"
                    value={formData.total_tickets}
                    onChange={handleChange}
                    className="bg-slate-50"
                    data-testid="raffle-tickets-input"
                  />
                </div>
              </div>

              {/* Excluded Numbers */}
              <div className="space-y-2">
                <Label htmlFor="excluded_numbers" className="flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Números excluidos (opcional)
                </Label>
                <Input
                  id="excluded_numbers"
                  name="excluded_numbers"
                  placeholder="Ej: 13, 666, 7"
                  value={formData.excluded_numbers}
                  onChange={handleChange}
                  className="bg-slate-50"
                  data-testid="raffle-excluded-input"
                />
                <p className="text-xs text-slate-500">Separa los números con comas</p>
              </div>

              {/* Spins Before Winner */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4" />
                  Giros de la ruleta antes de seleccionar ganador
                </Label>
                <Select value={spinsBeforeWinner} onValueChange={setSpinsBeforeWinner}>
                  <SelectTrigger className="bg-slate-50" data-testid="spins-select">
                    <SelectValue placeholder="Selecciona número de giros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 giro (rápido)</SelectItem>
                    <SelectItem value="2">2 giros</SelectItem>
                    <SelectItem value="3">3 giros (recomendado)</SelectItem>
                    <SelectItem value="5">5 giros</SelectItem>
                    <SelectItem value="7">7 giros</SelectItem>
                    <SelectItem value="10">10 giros (máxima emoción)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Más giros = más suspenso en el sorteo</p>
              </div>

              {/* Draw Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Fecha del sorteo *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-50",
                        !drawDate && "text-muted-foreground"
                      )}
                      data-testid="raffle-date-trigger"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {drawDate ? format(drawDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={drawDate}
                      onSelect={setDrawDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={loading}
                data-testid="create-raffle-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando rifa...
                  </>
                ) : (
                  'Crear Rifa'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateRaffle;
