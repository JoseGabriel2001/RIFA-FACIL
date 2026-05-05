# RifaFacil - Product Requirements Document

## Problema Original
Crear una app web para hacer sorteos y rifas con panel de administrador, landing page para compradores, links compartibles, cuentas de usuario, planes de suscripción e integraciones de pago.

## Arquitectura Final (v2.0)

### Stack Tecnológico
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Capacitor (mobile)
- **Backend**: FastAPI (Python) + MongoDB
- **Emails**: Resend
- **Pagos**: MercadoPago (principal), Stripe, Cash

### Estructura del Backend (Modular)

```
/app/backend/
├── server.py                 # Entry point (~100 líneas)
├── config/
│   ├── __init__.py          # Database connection
│   └── settings.py          # Centralized settings
├── dependencies/
│   └── __init__.py          # Auth helpers (JWT, password)
├── models/
│   └── schemas.py           # Pydantic models documentados
├── routes/
│   ├── __init__.py          # Router exports
│   ├── auth.py              # /auth/* endpoints
│   ├── raffles.py           # /raffles/* endpoints
│   ├── payments.py          # /payments/* endpoints
│   └── utils.py             # /upload, /stats, etc.
├── services/
│   └── email_service.py     # Resend email service
└── utils/
    └── helpers.py           # Utility functions
```

### Estructura del Frontend (TypeScript/JSDoc)

```
/app/frontend/src/
├── types/
│   ├── index.ts             # 25+ interfaces tipadas
│   └── api.ts               # Constantes de endpoints
├── context/
│   └── AuthContext.js       # Documentado con JSDoc
├── components/
│   ├── AuthCallback.js      # OAuth callback
│   ├── GoogleSignInButton.js
│   ├── TicketGrid.js        # Grid accesible
│   └── ui/                  # Shadcn components
├── pages/
│   ├── Dashboard.js
│   ├── CreateRaffle.js
│   ├── ManageRaffle.js
│   └── PublicRaffle.js
└── utils/
    └── helpers.js           # 12+ funciones documentadas
```

## Funcionalidades Implementadas

### Autenticación ✅
- Login email/password (JWT)
- Login Google OAuth (Emergent Auth)
- Registro usuarios
- Protección rutas

### Gestión Rifas ✅
- CRUD completo
- Grid boletos interactivo
- Link compartible único
- Exclusión números
- Imagen premio

### Sistema Giros ✅
- Multi-spin (1-10 giros)
- Giros intermedios con suspense
- Giro final con confeti

### Preselección Ganador ✅
- Botón secreto para admin
- No expuesto en API pública

### Modo Presentación ✅
- Pantalla completa
- Atajos teclado

### Planes ✅
- Free: máx 2 rifas
- Super Admin: sin límites

### Pagos ✅
- MercadoPago (requiere credenciales)
- Efectivo con reserva 48h
- Stripe (requiere credenciales)

## Endpoints API v2.0

### Auth (`/api/auth/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registro |
| POST | `/login` | Login email |
| POST | `/google/session` | OAuth |
| GET | `/me` | Perfil |

### Páginas Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/privacy` | Aviso de Privacidad |
| `/terms` | Términos y Condiciones |
| `/pricing` | Precios |
| `/raffle/:code` | Rifa pública |

### Raffles (`/api/raffles/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/` | Crear |
| GET | `/` | Listar |
| GET | `/{id}` | Detalle |
| PUT | `/{id}` | Actualizar |
| DELETE | `/{id}` | Eliminar |
| POST | `/{id}/spin` | Girar |
| POST | `/{id}/preselect-winner` | Preseleccionar |

### Payments (`/api/payments/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/mercadopago/create-preference` | Checkout MP |
| POST | `/cash/create-order` | Reserva efectivo |
| POST | `/stripe/checkout` | Checkout Stripe |

### Utils (`/api/`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/upload-image` | Subir imagen |
| GET | `/my-tickets` | Mis boletos |
| GET | `/stats` | Estadísticas |

## Testing Status
- **Backend**: 100% (25/25 tests)
- **Frontend**: 100% (All flows verified)
- **Report**: `/app/test_reports/iteration_8.json`

## Credenciales

### Configuradas ✅
- `RESEND_API_KEY`: Activo
- `JWT_SECRET`: Configurado

### Pendientes ⏳
- `MERCADOPAGO_ACCESS_TOKEN_PRO`: Requiere usuario
- `STRIPE_API_KEY`: Test disponible
- `PAYPAL_CLIENT_ID/SECRET`: Pendiente

## Super Admins
- mtortb@gmail.com (sin restricciones)

## Backlog

### P0 - Inmediato
- [x] ~~Refactorización backend modular~~

### P1 - Alta Prioridad
- [ ] Configurar MercadoPago producción
- [ ] Exportar participantes CSV

### P2 - Media
- [ ] WhatsApp notificaciones
- [ ] Dashboard analíticas

### P3 - Baja
- [ ] Tests unitarios frontend
- [ ] PWA Service Worker
- [ ] i18n

---
**Versión**: 2.0.0
**Última actualización**: Diciembre 2025
**Estado**: Backend modularizado, Frontend tipado
