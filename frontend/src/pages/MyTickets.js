import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { Ticket, Trophy, Calendar, ExternalLink, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyTickets = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const response = await axios.get(`${API}/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (error) {
      toast.error('Error al cargar tus boletos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" data-testid="my-tickets-page">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mis Boletos</h1>
        <p className="text-slate-600 mb-8">Boletos que has comprado en diferentes rifas</p>

        {tickets.length === 0 ? (
          <Card className="border-0 shadow-sm" data-testid="no-tickets-card">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes boletos aún</h3>
              <p className="text-slate-600">Cuando compres boletos en alguna rifa, aparecerán aquí</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((item) => (
              <Card key={item.raffle_id} className="border-0 shadow-sm card-hover" data-testid={`ticket-card-${item.raffle_id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{item.raffle_title}</h3>
                        <Badge className={item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {item.status === 'active' ? 'Activa' : 'Finalizada'}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-3">Premio: {item.prize}</p>
                      
                      {/* Ticket Numbers */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.tickets.map((t) => (
                          <span 
                            key={t.number}
                            className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-sm font-medium ${
                              t.number === item.winning_number 
                                ? 'winner-badge text-slate-900' 
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            #{t.number}
                            {t.number === item.winning_number && <Trophy className="w-3 h-3 ml-1" />}
                          </span>
                        ))}
                      </div>

                      {/* Winner Announcement */}
                      {item.winning_number && (
                        <div className={`p-3 rounded-lg ${
                          item.tickets.some(t => t.number === item.winning_number)
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-slate-50 border border-slate-200'
                        }`}>
                          {item.tickets.some(t => t.number === item.winning_number) ? (
                            <p className="text-green-700 font-medium flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              ¡Felicidades! Tu boleto #{item.winning_number} ganó
                            </p>
                          ) : (
                            <p className="text-slate-600">
                              Número ganador: #{item.winning_number}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Sorteo: {new Date(item.draw_date).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    </div>

                    <Link 
                      to={`/raffle/${item.share_code}`}
                      className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium"
                      data-testid={`view-raffle-${item.raffle_id}`}
                    >
                      Ver rifa
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
