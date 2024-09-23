from typing import Any, Dict, List

import requests


def auth_netology(username: str, password: str) -> Dict[str, str]:
    """auth in Netology, required username and password"""
    s = requests.session()
    response = s.post(
        "https://netology.ru/backend/api/user/sign_in",
        data={
            "login": username,
            "password": password,
            "remember": "1",
        },
    )
    response.raise_for_status()
    return s.cookies.get_dict()


def get_program_ids(session: requests.Session) -> List[str]:
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar/filters",
    )
    response.raise_for_status()
    serialized_response = response.json()
    programs = serialized_response["programs"]
    program_ids = [program["id"] for program in programs]
    return program_ids


def get_calendar(session: requests.Session, calendar_id: str) -> Dict[str, Any]:
    response = session.get(
        "https://netology.ru/backend/api/user/programs/calendar",
        params={"program_ids[]": f"{calendar_id}"},
    )
    response.raise_for_status()
    return response.json()
