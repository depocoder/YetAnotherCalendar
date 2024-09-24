"""Netology API implementation."""

from typing import Any, Dict, List

import requests


def auth_netology(username: str, password: str) -> Dict[str, str]:
    """
    Auth in Netology, required username and password.

    Args:
        username (str): Netology username.
        password (str): Netology password.

    Returns:
        dict: Cookies for API.
    """
    session = requests.session()
    response = session.post(
        "https://netology.ru/backend/api/user/sign_in",
        data={
            "login": username,
            "password": password,
            "remember": "1",
        },
    )
    response.raise_for_status()
    return session.cookies.get_dict()


def get_program_ids(session: requests.Session) -> List[str]:
    """Get your Netology program ids."""
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar/filters",
    )
    response.raise_for_status()
    serialized_response = response.json()
    programs = serialized_response["programs"]
    return [program["id"] for program in programs]


def get_calendar(session: requests.Session, calendar_id: str) -> Dict[str, Any]:
    """Get your calendar events."""
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar",
        params={"program_ids[]": f"{calendar_id}"},
    )
    response.raise_for_status()
    return response.json()
