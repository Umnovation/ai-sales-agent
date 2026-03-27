"""First-time setup CLI script.

Usage:
    python -m app.cli.install

Creates the initial user account. Can only be run once (fails if users already exist).
"""

from __future__ import annotations

import asyncio
import getpass
import sys


async def run_install() -> None:
    from app.auth import service as auth_service
    from app.database import async_session_factory

    async with async_session_factory() as db:
        user_count: int = await auth_service.get_user_count(db)
        if user_count > 0:
            print("Installation already completed. A user already exists.")
            sys.exit(1)

        print("=== AI Sales Agent — First-time Setup ===\n")

        name: str = input("Your name: ").strip()
        if not name:
            print("Error: Name is required.")
            sys.exit(1)

        email: str = input("Email: ").strip()
        if not email:
            print("Error: Email is required.")
            sys.exit(1)

        password: str = getpass.getpass("Password: ")
        if len(password) < 6:
            print("Error: Password must be at least 6 characters.")
            sys.exit(1)

        password_confirm: str = getpass.getpass("Confirm password: ")
        if password != password_confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)

        user = await auth_service.create_user(db, email=email, password=password, name=name)

        print("\nUser created successfully!")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.name}")
        print("\nYou can now log in at http://localhost:3000")


def main() -> None:
    asyncio.run(run_install())


if __name__ == "__main__":
    main()
