# Rhythaalaya Log API

.NET 9 Clean Architecture API using EF Core and PostgreSQL.

## Tenant and subscription model

- Tenants represents customer academies.
- Users contains platform and tenant identities. A Super Admin has no tenant; Tenant Admin and Staff users do.
- SubscriptionPlans defines monthly price, maximum active users, and maximum active students.
- TenantSubscriptions stores plan assignment, status, start date, end date, and cancellation date.
- Academy entities contain TenantId. EF Core global query filters use the tenant ID from the authenticated JWT, never a tenant ID supplied by normal academy API callers.
- Middleware revalidates user, tenant, and subscription state on every authenticated tenant request.

Roles:

- SuperAdmin: platform plans, tenants, users, activation, and subscriptions
- TenantAdmin: full academy access and Staff user creation
- Staff: daily operational access; destructive/configuration actions remain restricted

## Configuration and startup

    $env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=rhythaalaya_log;Username=postgres;Password=YOUR_PASSWORD"
    $env:Jwt__Key="REPLACE-WITH-A-LONG-RANDOM-SECRET-KEY"
    $env:Bootstrap__SuperAdminEmail="superadmin@example.com"
    $env:Bootstrap__SuperAdminPassword="ChangeThisPassword123!"
    dotnet run --project backend/RhythaalayaLog.API

The API listens on http://localhost:5101. In Development:

- OpenAPI: GET /openapi/v1.json
- Swagger UI: GET /swagger
- Health: GET /health

Do not place production database passwords, JWT secrets, or bootstrap passwords in committed settings files.

## PostgreSQL scripts

- database/full_schema.sql: complete idempotent schema for an empty database
- database/multi_tenant_upgrade.sql: upgrade from the original single-academy schema
- database/initial_schema.sql: retained original schema script

Existing single-academy rows are preserved under a Legacy Academy tenant during the upgrade. A Super Admin can add a tenant user to that tenant using the Super Admin users endpoint.

EF alternative:

    dotnet ef database update --project backend/RhythaalayaLog.Infrastructure --startup-project backend/RhythaalayaLog.API

## API groups

Authentication:

- POST /api/auth/login

Super Admin:

- GET/POST /api/superadmin/plans
- GET/POST /api/superadmin/tenants
- PATCH /api/superadmin/tenants/{tenantId}/status
- POST /api/superadmin/tenants/{tenantId}/subscription
- GET/POST /api/superadmin/tenants/{tenantId}/users

Tenant users:

- GET/POST /api/tenant/users

Academy:

- batches, students, attendance, finance, dashboard, and settings under /api

Send the access token as Authorization: Bearer TOKEN.
