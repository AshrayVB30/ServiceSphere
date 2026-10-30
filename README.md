# ServiceSphere

# Problem Statment
In many organizations, client queries, technical issues, and service requests are managed through emails, phone calls, spreadsheets, or other disconnected communication channels. These methods make it difficult to track requests, assign responsibilities, monitor progress, and ensure 
timely resolution. 
Without a centralized Help Desk System, organizations may experience delayed responses, 
unclear ownership, unauthorized access to information, missed approval requests, and difficulties 
in monitoring service-level agreements (SLAs). Additionally, the lack of a centralized 
knowledge base makes it harder for users to find answers to frequently asked questions and 
standard troubleshooting procedures. 
Organizations also need a reliable way to monitor support team performance, ticket resolution 
times, workload, and key performance indicators (KPIs) and key result areas (KRAs). 
Therefore, a centralized Help Desk System is required to manage client onboarding, user access, support tickets, approval workflows, automated notifications, SLA-based escalations, knowledge  sharing, and performance reporting through a single platform.


## Architecture

![ServiceSphere system architecture](documentation/ServiceSphere-System%20Architecture.drawio.png)

## Folder Structure

E:\ServiceSphere/
├── .gitignore                     # Git exclusion rules (secrets, bytecode, db)
├── README.md
├── documentation/
└── backend/
    ├── .env                       # Local secrets (PostgreSQL port 5433, secret key)
    ├── .env.example               # Safe environment template
    ├── manage.py                  # Django CLI entrypoint
    ├── config/
    │   ├── settings.py            # Global settings, DB, DRF, Auth redirects
    │   ├── urls.py                # Root router (admin, api-auth, api)
    │   ├── wsgi.py & asgi.py
    ├── core/                      # Shared base utilities & health checks
    │   ├── views.py, urls.py, tests.py
    ├── accounts/                  # User identity & roles
    │   ├── models.py              # Custom User model (ADMIN, AGENT, CLIENT, APPROVER)
    │   ├── admin.py               # CustomUserAdmin
    │   ├── tests.py
    ├── clients/                   # Multi-tenant organization onboarding
    │   ├── models.py              # Client model & indexes
    │   ├── serializers.py         # ClientSerializer
    │   ├── permissions.py         # IsSystemAdmin
    │   ├── views.py               # ClientViewSet
    │   ├── urls.py & admin.py
    └── tickets/                   # Ticket management & workflows
        ├── models.py              # Ticket & TicketHistory models
        ├── serializers.py         # TicketSerializer with readable relations
        ├── views.py               # TicketViewSet (RBAC querysets, assign, change_status)
        ├── urls.py                # /api/tickets/ router
        ├── admin.py               # TicketAdmin & read-only TicketHistoryAdmin
        └── tests.py               # 15 automated unit & integration tests


## Environment Setup

### Cloning 
```bash
git clone https://github.com/AshrayVB30/ServiceSphere.git   
cd ServiceSphere
```

### Backend setup

```bash
cd backend
conda create -n servicesphere python=3.12 -y
conda activate servicesphere
pip install -r requirements.txt
python manage.py runserver
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Terminal 3:
```bash 
conda activate servicesphere
cd E:\ServiceSphere\backend
celery -A config beat -l info
```