"""
ServiceSphere Container Entrypoint Script

Executes database schema migrations and initial catalog seeds
before handing over execution to the main container process
(Gunicorn WSGI web server or Celery worker).
"""

import os
import sys
import subprocess


def main():
    args = sys.argv[1:]

    # When starting the web application, ensure DB migrations and seeds are applied
    is_web_server = any("gunicorn" in arg or "runserver" in arg for arg in args)

    if is_web_server:
        print("==> ServiceSphere Container Startup")
        print("==> [1/3] Running database schema migrations...")
        try:
            subprocess.run([sys.executable, "manage.py", "migrate", "--noinput"], check=True)
            print("==> [2/3] Database migrations completed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"==> [ERROR] Database migrations failed with exit code {e.returncode}")
            sys.exit(e.returncode)

        print("==> [3/4] Seeding default Knowledge Base categories...")
        try:
            subprocess.run([sys.executable, "manage.py", "seed_kb_categories"], check=False)
        except Exception as e:
            print(f"==> [WARN] Could not seed KB categories: {e}")

        print("==> [4/4] Seeding default Demo Users, Clients, SLA Policies, and Tickets...")
        try:
            subprocess.run([sys.executable, "manage.py", "seed_demo_users"], check=False)
            subprocess.run([sys.executable, "manage.py", "publish_all_articles"], check=False)
        except Exception as e:
            print(f"==> [WARN] Could not seed demo data: {e}")

        print("==> Initialization complete. Launching application server...\n")

    # Hand over process execution to target command
    if not args:
        args = ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

    os.execvp(args[0], args)


if __name__ == "__main__":
    main()

