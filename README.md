# Rhythaalaya Log

Multi-tenant academy management application with a React frontend and a .NET 9/PostgreSQL backend.

## Capabilities

- SaaS tenant isolation: every academy-owned row is scoped by the tenant claim in the signed JWT
- Platform Super Admin: create plans and academies, activate/suspend tenants, and assign or renew subscriptions
- Tenant Admin and Staff roles with endpoint-level authorization
- Subscription enforcement for active dates, maximum users, and maximum students
- Server-backed students, batches, attendance, fee payments, transactions, settings, and dashboard data
- Password hashing, JWT authentication, PostgreSQL migrations, OpenAPI, CORS, and problem responses

## Projects

    backend/
      RhythaalayaLog.API
      RhythaalayaLog.Application
      RhythaalayaLog.Domain
      RhythaalayaLog.Infrastructure
    frontend/

## Database

For a database where the original tables were already created, run:

    psql -U postgres -d rhythaalaya_log -f backend/database/multi_tenant_upgrade.sql

For a new empty database, run:

    psql -U postgres -d rhythaalaya_log -f backend/database/full_schema.sql

Both scripts are idempotent. The API also runs pending EF Core migrations at startup.

## Run locally

Set backend configuration in the terminal. Use your own PostgreSQL password and a JWT key of at least 32 bytes:

    $env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=rhythaalaya_log;Username=postgres;Password=YOUR_PASSWORD"
    $env:Jwt__Key="REPLACE-WITH-A-LONG-RANDOM-SECRET-KEY"
    $env:Bootstrap__SuperAdminEmail="superadmin@example.com"
    $env:Bootstrap__SuperAdminPassword="ChangeThisPassword123!"
    dotnet run --project backend/RhythaalayaLog.API

The bootstrap credentials create the first Super Admin only when one does not already exist.

In another terminal:

    npm.cmd install --prefix frontend
    npm.cmd run dev --prefix frontend

Open http://localhost:3000. The frontend calls http://localhost:5101/api by default. Override it with VITE_API_URL when needed.

Swagger UI opens automatically with the API Development launch profile and is available at
http://localhost:5101/swagger.

More backend details are in [backend/README.md](backend/README.md).
